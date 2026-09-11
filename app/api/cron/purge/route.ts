import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, lt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  unitLevels,
} from "@/lib/db/schema";
import { computeCheckpoints } from "@/lib/ingest/checkpoints";
import { clanConfig } from "@/config/clan.config";

/**
 * GET /api/cron/purge
 * Triggered by Vercel Cron once a day (vercel.json, `0 18 * * *` = 02:00 AM
 * Asia/Manila). Runs 2 hours after the daily batch (00:00 PHT on the
 * third-party cron service) to guarantee checkpoints are computed before
 * pruning.
 *
 * As a safety net, this route ALSO re-computes checkpoints before pruning —
 * in case the daily batch failed or was delayed.
 *
 * CRON_SECRET must be set as a Vercel environment variable.
 *
 * Pruning passes (in order):
 *
 * 0. Safety checkpoint: re-compute cumulative totals from ALL snapshots
 *    (in case the daily batch didn't run).
 *
 * 1. Departed-member purge: delete members whose purge_at has passed + their
 *    snapshots + unit levels. membership_events kept (immutable log).
 *
 * 2. Intra-day snapshot pruning: for snapshots older than 7 days, keep only
 *    a minimal delta-chain-preserving set per member per calendar day: the
 *    LAST snapshot of the day, every snapshot carrying activity evidence
 *    (activity_flag / login_day_flag — Phase 1), plus the rows adjacent to
 *    every intra-day donation-counter DECREASE (the local peak before the
 *    drop + the first snapshot after it — per counter: donations and
 *    donations_received).
 *
 *    fix B-2 (docs/2026-09-10 assessment §3): keeping only the last snapshot
 *    permanently lost pre-reset donations on weekly-reset days. If the reset
 *    landed mid-day (counter 200 → reset → 5), the surviving pair was
 *    (prev-day 200 → end-of-day 5) and the ~200 pre-reset donations vanished
 *    from every future 30d window and per-day bucket. Keeping the reset
 *    boundary rows makes the reset-aware delta chain (lib/scoring/donations.ts)
 *    compute the exact same total as the un-pruned chain — for ANY number of
 *    resets per day and resets that land between one day's last poll and the
 *    next day's first (verified by a randomized fuzz test against the pure
 *    model in lib/ingest/purge-retention.ts). On members/days with no drops
 *    the kept set is exactly {end-of-day}, identical to the old retention.
 *
 * 3. Capital district snapshot pruning: delete snapshots older than 90 days.
 *    The upgrade timeline derives from diffs — old raw snapshots aren't needed
 *    for display once the diff is computed.
 *
 * 4. Old backfill war pruning: delete wars older than 365 days that have no
 *    snapshot (war-log backfill rows). Live-tracked wars (with snapshots) are
 *    kept.
 *
 * NOT pruned (by design):
 *   - membership_events: immutable log, tiny.
 *   - war_attacks: small, referenced by HoF Vanguard + attack distribution.
 *   - war_participants: small, referenced by member war history.
 *   - hall_of_fame_records: 5 rows per award, overwritten not accumulated.
 *   - cwl_seasons: ~12/year, tiny.
 *   - Daily last-of-day snapshots AND activity-flagged snapshots: kept
 *     forever — together they preserve the donation-delta chain AND the
 *     day-grain activity evidence (war attacks, donations, XP gains) through
 *     and beyond the 30-day heatmap window. The checkpoint columns on members
 *     cover the lifetime totals that would have been computed from the
 *     deleted intra-day snapshots.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = {
    checkpoints: false,
    purgedMembers: 0,
    prunedSnapshots: 0,
    prunedCapitalSnaps: 0,
    prunedWars: 0,
    prunedWarSnapshots: 0,
    prunedDepartedSnapshots: 0,
    dbSizeBytes: null as number | null,
  };

  // ── 0. Safety checkpoint re-computation ──
  try {
    await computeCheckpoints();
    result.checkpoints = true;
  } catch {
    // If checkpoint fails, DON'T prune — old snapshots are the only source
    // of lifetime totals. Pruning without checkpoints would corrupt HoF.
    return NextResponse.json(
      { ok: false, error: "checkpoint computation failed — pruning aborted", ...result },
      { status: 500 },
    );
  }

  // ── 1. Departed-member purge ──
  const toPurge = await db
    .select({ playerTag: members.playerTag })
    .from(members)
    .where(and(isNotNull(members.purgeAt), lt(members.purgeAt, now)));

  for (const { playerTag } of toPurge) {
    await db.delete(memberSnapshots).where(eq(memberSnapshots.playerTag, playerTag));
    await db.delete(unitLevels).where(eq(unitLevels.playerTag, playerTag));
    await db.delete(members).where(eq(members.playerTag, playerTag));
  }
  result.purgedMembers = toPurge.length;

  // ── 2. Intra-day snapshot pruning (delta-chain + evidence preserving, >7 days old) ──
  // Keeps, per member: the first snapshot of the chain, the LAST snapshot of
  // each CLAN-TIMEZONE day (day markers aligned with the Manila-midnight
  // display buckets from fix B-6), every snapshot carrying activity evidence
  // (Phase 1 — war/donation/XP flags must survive pruning or the heatmap and
  // streaks lose war days as they age out of the unpruned window), and the
  // local-peak + first-post-drop snapshots around every donation-counter
  // decrease. Drop detection partitions by MEMBER ONLY (not per day) — a
  // reset can land between one day's last poll and the next day's first poll,
  // and those boundary rows must survive just like intra-day ones. The rule is
  // the SQL translation of the pure, fuzz-tested model in
  // lib/ingest/purge-retention.ts.
  //
  // The timezone is inlined as a raw literal (a hardcoded config constant,
  // not user input) because parameterized `AT TIME ZONE $1` fails on
  // Supabase's PgBouncer pooler — same tradeoff as getRosterSizeTrend.
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const tzLiteral = sql.raw(`'${clanConfig.timezone}'`);

  const prunedSnaps = await db.execute(sql`
    DELETE FROM member_snapshots
    WHERE captured_at < ${sevenDaysAgo}
      AND id NOT IN (
        SELECT id FROM (
          SELECT id, donations, donations_received,
            activity_flag, login_day_flag,
            lag(donations) OVER member_w AS prev_donations,
            lag(donations_received) OVER member_w AS prev_received,
            lead(donations) OVER member_w AS next_donations,
            lead(donations_received) OVER member_w AS next_received,
            row_number() OVER member_w AS rn_member,
            row_number() OVER day_w AS rn_day
          FROM member_snapshots
          WHERE captured_at < ${sevenDaysAgo}
          WINDOW
            member_w AS (PARTITION BY player_tag ORDER BY captured_at, id),
            day_w AS (
              PARTITION BY player_tag,
                date_trunc('day', captured_at AT TIME ZONE ${tzLiteral})
              ORDER BY captured_at DESC, id DESC
            )
        ) chain
        WHERE rn_member = 1
           OR rn_day = 1
           OR activity_flag
           OR login_day_flag
           OR next_donations IS NULL
           OR next_donations < donations
           OR next_received < donations_received
           OR prev_donations > donations
           OR prev_received > donations_received
      )
  `);
  result.prunedSnapshots = prunedSnaps.rowCount ?? 0;

  // ── 3. Capital district snapshot pruning (>90 days) ──
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const prunedCap = await db.execute(sql`
    DELETE FROM capital_district_snapshots
    WHERE captured_at < ${ninetyDaysAgo}
  `);
  result.prunedCapitalSnaps = prunedCap.rowCount ?? 0;

  // ── 4. Old backfill war pruning (>365 days, no snapshot) ──
  const oneYearAgo = new Date(now);
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const prunedWars = await db.execute(sql`
    DELETE FROM wars
    WHERE end_time < ${oneYearAgo}
      AND war_snapshot IS NULL
      AND war_type = 'regular'
  `);
  result.prunedWars = prunedWars.rowCount ?? 0;

  // ── 5. Old warSnapshot pruning (>90 days, warEnded) ──
  // The warSnapshot JSONB (25-30 KB per 50v50 war) is only used by the
  // war-detail sheet — after 90 days, users almost never open it. The
  // summary columns on wars (stars, destruction, result, opponent, etc.)
  // remain for the history list. This reclaims ~1 MB/year.
  const prunedWarSnaps = await db.execute(sql`
    UPDATE wars
    SET war_snapshot = NULL
    WHERE end_time < ${ninetyDaysAgo}
      AND state = 'warEnded'
      AND war_snapshot IS NOT NULL
  `);
  result.prunedWarSnapshots = prunedWarSnaps.rowCount ?? 0;

  // ── 6. Departed-member snapshot safety net (>30 days departed) ──
  // The 14-day purgeAt window (pass 1) is the primary cleanup. But if the
  // cron failed for a while, departed members' snapshots could accumulate.
  // This catches any member who left >30 days ago and is still in the DB
  // (not yet purged) — deletes their snapshots to reclaim space.
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const departedSnaps = await db.execute(sql`
    DELETE FROM member_snapshots
    WHERE player_tag IN (
      SELECT player_tag FROM members
      WHERE left_at IS NOT NULL AND left_at < ${thirtyDaysAgo}
    )
  `);
  result.prunedDepartedSnapshots = departedSnaps.rowCount ?? 0;

  // ── 7. DB size monitoring ──
  // Log the current DB size so we get an early warning before hitting the
  // 500 MB Supabase free-tier limit. If over 400 MB, log a warning.
  try {
    const sizeResult = await db.execute(sql`
      SELECT pg_database_size(current_database()) as size
    `);
    const sizeRow = sizeResult.rows?.[0] as { size: number } | undefined;
    const size = sizeRow?.size;
    if (size !== undefined) {
      result.dbSizeBytes = size;
      if (size > 400 * 1024 * 1024) {
        console.warn(
          `[purge] DB size is ${(size / 1024 / 1024).toFixed(1)} MB — approaching the 500 MB Supabase limit`,
        );
      } else {
        console.info(
          `[purge] DB size: ${(size / 1024 / 1024).toFixed(1)} MB`,
        );
      }
    }
  } catch {
    // Monitoring is best-effort — don't fail the purge if the size query fails.
  }

  // Bust only the dashboard page — not the entire layout. The purge runs daily
  // and other pages have 1-hr ISR which is fine for pruned data. (docs log 116)
  revalidatePath("/");

  return NextResponse.json({ ok: true, ...result });
}

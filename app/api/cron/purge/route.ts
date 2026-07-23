import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  unitLevels,
} from "@/lib/db/schema";
import { computeCheckpoints } from "@/lib/ingest/checkpoints";

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
 *    the LAST snapshot per member per calendar day. The other ~47 intra-day
 *    snapshots have no analytical value after 7 days. The LAST snapshot has
 *    the highest donation counter (preserving the delta chain) and the most
 *    accurate activity/login flags.
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
 *   - Daily last-of-day snapshots: kept forever — they preserve the
 *     donation-delta chain and login-day flags. The checkpoint columns on
 *     members cover the lifetime totals that would have been computed from
 *     the deleted intra-day snapshots.
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

  // ── 2. Intra-day snapshot pruning (keep LAST per member per day, >7 days old) ──
  // Deletes all snapshots older than 7 days EXCEPT the last one per member
  // per calendar day. The last snapshot has the highest donation counter
  // (preserving the reset-aware delta chain) and the most accurate flags.
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const prunedSnaps = await db.execute(sql`
    DELETE FROM member_snapshots
    WHERE captured_at < ${sevenDaysAgo}
      AND id NOT IN (
        SELECT DISTINCT ON (player_tag, date_trunc('day', captured_at))
          id
        FROM member_snapshots
        WHERE captured_at < ${sevenDaysAgo}
        ORDER BY player_tag, date_trunc('day', captured_at), captured_at DESC
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

  return NextResponse.json({ ok: true, ...result });
}

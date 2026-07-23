import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  unitLevels,
  capitalDistrictSnapshots,
  wars,
} from "@/lib/db/schema";

/**
 * GET /api/cron/purge
 * Triggered by Vercel Cron once a day (vercel.json). Performs four cleanup
 * passes to keep the database bounded on the Neon free tier (512 MB). See
 * concept/03 §"Retention and pruning" for the full strategy.
 *
 * CRON_SECRET must be set as a Vercel environment variable by hand — Vercel
 * does NOT generate this value for you, it only forwards whatever you set
 * as the Authorization header when it invokes this route.
 *
 * Pruning passes (in order):
 *
 * 1. Departed-member purge (existing): delete members whose purge_at has
 *    passed + their snapshots + unit levels. The membership_events row is
 *    kept (immutable log — concept/03).
 *
 * 2. Intra-day snapshot pruning: for member_snapshots older than 7 days,
 *    keep only the FIRST snapshot per member per calendar day. The other
 *    ~47 intra-day snapshots per member per day have no analytical value
 *    after 7 days — the donation/activity analytics use daily buckets, and
 *    the reset-aware donation delta only needs consecutive pairs (which the
 *    daily first-of-day snapshots preserve). This cuts ~98% of snapshot
 *    growth without affecting any dashboard, Hall of Fame, or lifetime
 *    computation.
 *
 * 3. Capital district snapshot pruning: delete capital_district_snapshots
 *    older than 90 days. The upgrade timeline is derived from diffs — once
 *    the diff is computed and displayed, the raw snapshots older than 90
 *    days have no analytical value (the 30-day window is the longest view).
 *
 * 4. Old backfill war pruning: delete wars older than 365 days that have no
 *    snapshot (war-log backfill rows). These have no roster/attack detail
 *    and the history list only shows 50. Live-tracked wars (with snapshots)
 *    are kept — they're small and may be referenced by the detail sheet.
 *
 * What is NOT pruned (by design):
 *   - membership_events: immutable log, tiny (~100/year).
 *   - war_attacks: small (~500/year), referenced by Hall of Fame Vanguard.
 *   - hall_of_fame_records: 5 rows per award, overwritten not accumulated.
 *   - cwl_seasons: ~12/year, tiny.
 *   - Daily first-of-day snapshots: kept forever — they preserve the
 *     donation-delta chain and login-day flags for Hall of Fame lifetime
 *     computations (Philanthropist, Dedicated, Unsleeping).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = {
    purgedMembers: 0,
    prunedSnapshots: 0,
    prunedCapitalSnaps: 0,
    prunedWars: 0,
  };

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

  // ── 2. Intra-day snapshot pruning (keep first per member per day, >7 days old) ──
  // Deletes all snapshots older than 7 days EXCEPT the first one per member
  // per calendar day. Uses a CTE to identify the "keep" rows, then deletes
  // everything else older than the cutoff.
  //
  // This preserves:
  //   - All snapshots from the last 7 days (full resolution for reset detection).
  //   - One snapshot per member per day for all time (daily donation-delta chain
  //     + login-day flags for Hall of Fame lifetime computations).
  //
  // Cuts ~98% of long-term snapshot growth (47 of 48 daily rows per member).
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
        ORDER BY player_tag, date_trunc('day', captured_at), captured_at ASC
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

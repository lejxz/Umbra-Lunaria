/**
 * runPurge — the daily purge's DB passes, extracted from
 * app/api/cron/purge/route.ts (2026-09-14) so the SQL becomes
 * integration-testable against a disposable Postgres
 * (tests/integration/db.test.ts; see docs/2026-09-14-ci-integration-
 * and-smoke.md). The route keeps auth, the pre-prune checkpoint
 * re-computation, and ISR revalidation — this module is pure DB work.
 *
 * Passes (unchanged from the route, order preserved):
 *   1. Departed-member purge (purgeAt passed → member + snapshots +
 *      unit levels deleted; membership_events kept, immutable).
 *   2. Intra-day snapshot pruning >7 days (delta-chain + activity-evidence
 *      preserving — the SQL translation of lib/ingest/purge-retention.ts).
 *   3. Capital district snapshot pruning >90 days.
 *   4. Old backfill war pruning >365 days (no snapshot).
 *   5. warSnapshot JSONB nulling >90 days (warEnded).
 *   6. Departed-member snapshot safety net (>30 days departed).
 *   7. DB size monitoring (best-effort, never fails the purge).
 */

import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, memberSnapshots, unitLevels } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";

export interface PurgeResult {
  purgedMembers: number;
  prunedSnapshots: number;
  prunedCapitalSnaps: number;
  prunedWars: number;
  prunedWarSnapshots: number;
  prunedDepartedSnapshots: number;
  dbSizeBytes: number | null;
}

export async function runPurge(now: Date = new Date()): Promise<PurgeResult> {
  const result: PurgeResult = {
    purgedMembers: 0,
    prunedSnapshots: 0,
    prunedCapitalSnaps: 0,
    prunedWars: 0,
    prunedWarSnapshots: 0,
    prunedDepartedSnapshots: 0,
    dbSizeBytes: null,
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

  // ── 2. Intra-day snapshot pruning (delta-chain + evidence preserving, >7 days old) ──
  // Keeps, per member: the first snapshot of the chain, the LAST snapshot of
  // each CLAN-TIMEZONE day (day markers aligned with the Manila-midnight
  // display buckets from fix B-6), every snapshot carrying activity evidence
  // (Phase 1), and the local-peak + first-post-drop snapshots around every
  // donation-counter decrease. The timezone is inlined as a raw literal (a
  // hardcoded config constant, not user input) because parameterized
  // `AT TIME ZONE $1` fails on Supabase's PgBouncer pooler.
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

  // ── 5. Old warSnapshot nulling (>90 days, warEnded) ──
  const prunedWarSnaps = await db.execute(sql`
    UPDATE wars
    SET war_snapshot = NULL
    WHERE end_time < ${ninetyDaysAgo}
      AND state = 'warEnded'
      AND war_snapshot IS NOT NULL
  `);
  result.prunedWarSnapshots = prunedWarSnaps.rowCount ?? 0;

  // ── 6. Departed-member snapshot safety net (>30 days departed) ──
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

  // ── 7. DB size monitoring (best-effort) ──
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
        console.info(`[purge] DB size: ${(size / 1024 / 1024).toFixed(1)} MB`);
      }
    }
  } catch {
    // Monitoring is best-effort — don't fail the purge if the size query fails.
  }

  return result;
}

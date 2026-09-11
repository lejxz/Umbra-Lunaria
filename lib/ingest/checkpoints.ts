/**
 * Checkpoint computation — cumulative lifetime totals computed from ALL
 * member_snapshots before pruning. Stored on the `members` table so HoF
 * awards and 30d-window donation queries can use them as baselines instead
 * of reading pruned snapshots.
 *
 * See docs/concept/03 §"Retention and pruning".
 *
 * Server-only: imports @/lib/db.
 */

import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, memberSnapshots } from "@/lib/db/schema";
import { calculateDonationDelta } from "@/lib/scoring/donations";
import { clanTzDayKey } from "@/lib/time/windows";

/**
 * Compute and store cumulative checkpoints for all retained members.
 * Called by the daily batch (before HoF) and by the purge route (safety
 * re-compute before pruning).
 *
 * For each retained member:
 *   - cumulative_donations_given    = reset-aware lifetime donation total (given)
 *   - cumulative_donations_received = reset-aware lifetime donation total (received)
 *   - cumulative_login_days         = distinct calendar days with loginDayFlag=true
 *
 * These are computed from ALL snapshots (including ones that will be pruned
 * immediately after). Once stored, the snapshots can be safely deleted.
 */
export async function computeCheckpoints(): Promise<void> {
  const retained = await db
    .select({ playerTag: members.playerTag })
    .from(members)
    .where(sql`${members.leftAt} IS NULL`);

  if (retained.length === 0) return;

  const tags = retained.map((m) => m.playerTag);

  // Fetch ALL snapshots for retained members, ordered for delta computation.
  const allSnaps = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      donationsReceived: memberSnapshots.donationsReceived,
      loginDayFlag: memberSnapshots.loginDayFlag,
    })
    .from(memberSnapshots)
    .where(inArray(memberSnapshots.playerTag, tags))
    .orderBy(memberSnapshots.playerTag, memberSnapshots.capturedAt);

  // Group by member.
  const byMember = new Map<
    string,
    {
      donations: { capturedAt: Date; donations: number }[];
      donationsReceived: { capturedAt: Date; donations: number }[];
      loginDays: Set<string>;
    }
  >();

  for (const s of allSnaps) {
    const entry =
      byMember.get(s.playerTag) ?? {
        donations: [],
        donationsReceived: [],
        loginDays: new Set<string>(),
      };
    entry.donations.push({ capturedAt: s.capturedAt, donations: s.donations });
    entry.donationsReceived.push({
      capturedAt: s.capturedAt,
      donations: s.donationsReceived,
    });
    if (s.loginDayFlag) {
      // fix B-7: dedupe by CLAN-TIMEZONE calendar day (the same definition the
      // HoF "dedicated" streak uses). The old UTC date slice over/under-
      // counted boundary logins (±8h around Manila midnight) relative to the
      // streak's own day definition.
      entry.loginDays.add(clanTzDayKey(s.capturedAt));
    }
    byMember.set(s.playerTag, entry);
  }

  // Compute + store for all members with snapshots in ONE statement.
  // fix B-5 (docs/2026-09-11-priority-fixes.md): a member with ZERO snapshots
  // is skipped — their cumulative_* columns must NOT be overwritten to 0
  // (snapshot-chain loss must not clobber lifetime totals).
  // fix §4.7 (docs/2026-09-10 assessment): the per-member UPDATE loop was N
  // sequential non-atomic statements — a mid-loop failure left half the
  // roster stale while the purge that depends on checkpoints proceeded. One
  // UPDATE … FROM (VALUES …) inside a transaction is atomic and 1 round-trip.
  const updates = retained
    .map(({ playerTag }) => {
      const entry = byMember.get(playerTag);
      if (!entry) return null; // no snapshots observed — do NOT zero out checkpoints
      return {
        tag: playerTag,
        given: calculateDonationDelta(entry.donations),
        received: calculateDonationDelta(entry.donationsReceived),
        loginDays: entry.loginDays.size,
      };
    })
    .filter((u): u is { tag: string; given: number; received: number; loginDays: number } => u !== null);

  if (updates.length === 0) return;

  const rows = updates.map(
    (u) =>
      sql`(${u.tag}::text, ${u.given}::integer, ${u.received}::integer, ${u.loginDays}::integer)`,
  );

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE members AS m
      SET
        cumulative_donations_given = v.given,
        cumulative_donations_received = v.received,
        cumulative_login_days = v.login_days
      FROM (VALUES ${sql.join(rows, sql`, `)}) AS v(tag, given, received, login_days)
      WHERE m.player_tag = v.tag
    `);
  });
}

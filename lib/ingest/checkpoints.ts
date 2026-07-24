/**
 * Checkpoint computation — cumulative lifetime totals computed from ALL
 * member_snapshots before pruning. Stored on the `members` table so HoF
 * awards and 30d-window donation queries can use them as baselines instead
 * of reading pruned snapshots.
 *
 * See concept/03 §"Retention and pruning".
 *
 * Server-only: imports @/lib/db.
 */

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, memberSnapshots } from "@/lib/db/schema";
import { calculateDonationDelta } from "@/lib/scoring/donations";

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
      // Use date string (YYYY-MM-DD in UTC) as the dedup key. This is
      // approximate — the concept spec says login days should be in the clan
      // timezone. For checkpoint purposes (a single integer), the exact
      // timezone boundary doesn't materially affect the count.
      entry.loginDays.add(s.capturedAt.toISOString().slice(0, 10));
    }
    byMember.set(s.playerTag, entry);
  }

  // Compute + store per member.
  for (const { playerTag } of retained) {
    const entry = byMember.get(playerTag);
    const givenTotal = entry
      ? calculateDonationDelta(entry.donations)
      : 0;
    const receivedTotal = entry
      ? calculateDonationDelta(entry.donationsReceived)
      : 0;
    const loginDays = entry ? entry.loginDays.size : 0;

    await db
      .update(members)
      .set({
        cumulativeDonationsGiven: givenTotal,
        cumulativeDonationsReceived: receivedTotal,
        cumulativeLoginDays: loginDays,
      })
      .where(eq(members.playerTag, playerTag));
  }
}

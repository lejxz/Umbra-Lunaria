/**
 * Pure model of the intra-day snapshot-pruning retention rule.
 *
 * The purge route (app/api/cron/purge/route.ts, pass 2) implements this rule
 * in SQL; this module is the executable specification of WHICH rows must
 * survive, unit-tested in tests/ingest/purge-retention.test.ts against the
 * donation-delta invariant (docs/2026-09-10 assessment, finding B-2 + §4.9).
 *
 * fix B-2: the old rule kept only the LAST snapshot per member per UTC
 * calendar day. Two problems: (a) when a weekly donation-counter reset landed
 * mid-day, the surviving pair (prev-day last → end-of-day) permanently
 * destroyed the pre-reset donation total in every future windowed
 * calculation; (b) the day markers were UTC days while the display buckets
 * are clan-timezone (Manila) days, smearing old per-day donation totals
 * ±8h across bucket boundaries.
 *
 * The exact delta-chain-preserving rule keeps, per member:
 *
 *   1. the LAST snapshot of each CLAN-TIMEZONE calendar day (the day marker
 *      every windowed calculation and display bucket anchors on — aligned
 *      with the Manila-midnight buckets from fix B-6),
 *   2. the FIRST snapshot of the member's entire chain (so lifetime totals
 *      computed from the retained chain — the checkpoint columns — are exact
 *      rather than missing the first day's pre-EOD climb), plus, per counter
 *      (donations, donations_received), the rows adjacent to every counter
 *      DECREASE:
 *   3. every LOCAL PEAK — the last snapshot before the counter drops
 *      (reset boundary, upper side), and
 *   4. every POST-DROP snapshot — the first snapshot after the drop
 *      (reset boundary, lower side).
 *
 * Drop detection partitions by MEMBER ONLY (not per day): a reset can land
 * between one day's last poll and the next day's first poll, and the
 * boundary rows must survive just like intra-day ones.
 *
 * Why this is exact (see lib/scoring/donations.ts for the reset convention):
 * between two adjacent kept rows with no drop between them, the pair delta
 * telescopes the climbs; across a drop, the (peak → post-drop) pair
 * contributes the post-drop counter, which the next pair subtracts back out —
 * so the total equals the full chain's delta regardless of how many resets
 * occur or where they land. On a member/day with no drops the kept set is
 * exactly {end-of-day}, identical to the old behavior. Cost: ~2 extra rows
 * per member per weekly reset.
 *
 * Scope of the exactness guarantee (matches every query the app issues):
 * windows anchored at clan-midnight boundaries and windows whose tail
 * reaches the unpruned (recent) region. A window ending mid-day inside the
 * pruned region sees only that day's marker — acceptable because no query
 * the app issues does that.
 */

import { clanTzDayKey } from "@/lib/time/windows";

export interface PurgeSnapshot {
  id: number;
  playerTag: string;
  capturedAt: Date;
  donations: number;
  donationsReceived: number;
}

/**
 * Return the set of snapshot ids that must SURVIVE pruning.
 *
 * The input does not need to be sorted; snapshots with identical timestamps
 * are ordered by `id` (matching the SQL's physical row-order determinism).
 * Day boundaries are CLAN-TIMEZONE calendar days, matching the purge SQL's
 * `date_trunc('day', captured_at AT TIME ZONE '<clan tz>')` grouping and the
 * display buckets from lib/time/windows.ts (fix B-6).
 */
export function selectRetainedSnapshotIds(
  snapshots: readonly PurgeSnapshot[],
): Set<number> {
  // Chain per MEMBER across the whole pruned range (drop detection must see
  // cross-midnight resets), plus per-clan-day EOD markers.
  const byMember = new Map<string, PurgeSnapshot[]>();
  for (const s of snapshots) {
    const arr = byMember.get(s.playerTag) ?? [];
    arr.push(s);
    byMember.set(s.playerTag, arr);
  }

  const retained = new Set<number>();

  for (const memberSnapshots of byMember.values()) {
    const chain = [...memberSnapshots].sort(
      (a, b) =>
        a.capturedAt.getTime() - b.capturedAt.getTime() || a.id - b.id,
    );
    if (chain.length === 0) continue;

    // Last snapshot seen per clan-timezone calendar day (the day markers).
    const lastOfDay = new Map<string, PurgeSnapshot>();
    for (const s of chain) lastOfDay.set(clanTzDayKey(s.capturedAt), s);

    for (let i = 0; i < chain.length; i++) {
      const curr = chain[i]!;
      const prev = i > 0 ? chain[i - 1]! : null;
      const next = i < chain.length - 1 ? chain[i + 1]! : null;

      // 2. First snapshot of the member's chain.
      if (i === 0) {
        retained.add(curr.id);
        continue;
      }
      // 1. Day marker: the last snapshot of this clan-timezone day.
      if (lastOfDay.get(clanTzDayKey(curr.capturedAt)) === curr) {
        retained.add(curr.id);
        continue;
      }
      // 3. Local peak: a counter drops at the next snapshot.
      if (next !== null && (next.donations < curr.donations || next.donationsReceived < curr.donationsReceived)) {
        retained.add(curr.id);
        continue;
      }
      // 4. Post-drop: the previous snapshot's counter was higher — this is
      // the first snapshot after a reset.
      if (
        prev !== null &&
        (prev.donations > curr.donations || prev.donationsReceived > curr.donationsReceived)
      ) {
        retained.add(curr.id);
      }
    }
  }

  return retained;
}

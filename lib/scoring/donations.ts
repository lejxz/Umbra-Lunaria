/**
 * Reset-aware donation accounting.
 *
 * Donation counters reset weekly (Supercell side). A naive `last - first`
 * calculation across a window that spans a reset produces a wrong, often
 * negative, number. Instead, donations are summed from consecutive snapshot
 * pairs using the rule documented in concept/04-activity-tracking-and-polling.md
 * under "Reset-aware donation accounting":
 *
 * ```text
 * if current_counter >= previous_counter:
 *   contribution = current_counter - previous_counter
 * else:
 *   contribution = current_counter   // weekly reset occurred
 * ```
 *
 * The first sample in any sequence has no prior pair, so it contributes 0
 * (its own value is just the baseline, not a delta).
 *
 * The same rule applies independently to donations given and donations
 * received. These functions operate on a single counter at a time; callers
 * that need both run them twice.
 */

export interface DonationSnapshot {
  capturedAt: Date;
  donations: number;
}

/**
 * Sum the per-pair deltas of a sequence of donation snapshots.
 *
 * The input is sorted by `capturedAt` ascending before processing — callers
 * do not need to pre-sort, but should not rely on the input order being
 * preserved (the array is shallow-copied, not mutated).
 */
export function calculateDonationDelta(
  snapshots: readonly DonationSnapshot[],
): number {
  if (snapshots.length <= 1) return 0;

  const sorted = [...snapshots].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );

  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // Loop bound (1 <= i < length) guarantees both exist; the guard is here
    // to satisfy `noUncheckedIndexedAccess` without changing behavior.
    if (!prev || !curr) continue;
    const previous = prev.donations;
    const current = curr.donations;
    if (current >= previous) {
      total += current - previous;
    } else {
      // Counter went backwards — weekly reset. The new counter value is the
      // amount donated since the reset, not a negative delta.
      total += current;
    }
  }
  return total;
}

/**
 * Sum donations over a half-open time window `(from, to]`.
 *
 * Snapshots whose `capturedAt` falls inside the window contribute their
 * per-pair delta. The last snapshot at or before `from` is included as the
 * baseline so the first in-window snapshot has a `previous` to diff against
 * — otherwise donations made between the pre-window close and the first
 * in-window capture would be lost.
 *
 * Window boundaries should be computed in the clan timezone and converted to
 * UTC before calling this function (see concept/04, "Time-window boundaries
 * are calculated in the clan timezone, then queried as UTC timestamps"). The
 * function itself is timezone-agnostic — it only compares absolute
 * instants.
 */
export function calculateDonationWindow(
  snapshots: readonly DonationSnapshot[],
  window: { from: Date; to: Date },
): number {
  if (snapshots.length === 0) return 0;

  const sorted = [...snapshots].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );

  const fromMs = window.from.getTime();
  const toMs = window.to.getTime();

  // Find the most recent snapshot at or before `from` — the baseline.
  let baseline: DonationSnapshot | undefined;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const candidate = sorted[i];
    if (!candidate) continue;
    if (candidate.capturedAt.getTime() <= fromMs) {
      baseline = candidate;
      break;
    }
  }

  const inWindow = sorted.filter(
    (s) => s.capturedAt.getTime() > fromMs && s.capturedAt.getTime() <= toMs,
  );

  if (inWindow.length === 0) return 0;

  // Prepend the baseline (if any) so the first in-window snapshot has a
  // previous pair to diff against. The baseline's own delta is 0 (it has no
  // previous in this slice), which is the intended behavior.
  const slice = baseline ? [baseline, ...inWindow] : inWindow;
  return calculateDonationDelta(slice);
}

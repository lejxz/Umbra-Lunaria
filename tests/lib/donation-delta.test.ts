import { describe, it, expect } from "vitest";
import {
  calculateDonationDelta,
  calculateDonationWindow,
} from "@/lib/scoring/donations";

/**
 * Tests for reset-aware donation accounting. The implementation follows the
 * rule documented in concept/04-activity-tracking-and-polling.md:
 *
 *   if current >= previous: contribution = current - previous
 *   else:                   contribution = current            // weekly reset
 *
 * The first sample in any sequence contributes 0 (no prior pair).
 */

const ts = (iso: string) => new Date(iso);

describe("calculateDonationDelta", () => {
  it("returns 0 for an empty array", () => {
    expect(calculateDonationDelta([])).toBe(0);
  });

  it("returns 0 for a single snapshot (no prior pair)", () => {
    expect(
      calculateDonationDelta([{ capturedAt: ts("2026-01-01T00:00:00Z"), donations: 150 }]),
    ).toBe(0);
  });

  it("sums an increasing sequence as a simple last - first delta", () => {
    // 0 → 10 → 25 : (10-0) + (25-10) = 25
    const snapshots = [
      { capturedAt: ts("2026-01-01T00:00:00Z"), donations: 0 },
      { capturedAt: ts("2026-01-01T01:00:00Z"), donations: 10 },
      { capturedAt: ts("2026-01-01T02:00:00Z"), donations: 25 },
    ];
    expect(calculateDonationDelta(snapshots)).toBe(25);
  });

  it("treats a weekly reset as 'current' instead of a negative delta", () => {
    // concept/04 reference case: 150 → 4 → 12 should give 4 + 8 = 12 (NOT 0).
    // Pair (150,4): 4 < 150 → reset → 4
    // Pair (4,12):  12 >= 4  → diff  → 8
    const snapshots = [
      { capturedAt: ts("2026-01-01T00:00:00Z"), donations: 150 },
      { capturedAt: ts("2026-01-08T00:00:00Z"), donations: 4 }, // weekly reset
      { capturedAt: ts("2026-01-08T12:00:00Z"), donations: 12 },
    ];
    expect(calculateDonationDelta(snapshots)).toBe(12);
  });

  it("handles multiple resets correctly", () => {
    // 100 → 5 → 20 → 3 → 15
    // Pair (100,5):  reset → 5
    // Pair (5,20):   diff   → 15
    // Pair (20,3):   reset → 3
    // Pair (3,15):   diff   → 12
    // Total = 5 + 15 + 3 + 12 = 35.
    //
    // NOTE: The Phase 1.0.D task brief lists this case as "5+15+3+15 = 38",
    // but that arithmetic is inconsistent with the documented rule — the
    // last pair (3,15) has current >= previous, so its contribution is
    // 15 - 3 = 12, not 15. The implementation follows the rule; this test
    // pins the rule-correct value of 35.
    const snapshots = [
      { capturedAt: ts("2026-01-01T00:00:00Z"), donations: 100 },
      { capturedAt: ts("2026-01-08T00:00:00Z"), donations: 5 }, // reset
      { capturedAt: ts("2026-01-09T00:00:00Z"), donations: 20 },
      { capturedAt: ts("2026-01-15T00:00:00Z"), donations: 3 }, // reset
      { capturedAt: ts("2026-01-16T00:00:00Z"), donations: 15 },
    ];
    expect(calculateDonationDelta(snapshots)).toBe(35);
  });

  it("is not sensitive to input order (sorts internally)", () => {
    const ascending = [
      { capturedAt: ts("2026-01-01T00:00:00Z"), donations: 0 },
      { capturedAt: ts("2026-01-01T01:00:00Z"), donations: 10 },
      { capturedAt: ts("2026-01-01T02:00:00Z"), donations: 25 },
    ];
    const descending = [...ascending].reverse();
    expect(calculateDonationDelta(descending)).toBe(
      calculateDonationDelta(ascending),
    );
  });

  it("treats an equal counter as no contribution (no reset, no donation)", () => {
    const snapshots = [
      { capturedAt: ts("2026-01-01T00:00:00Z"), donations: 50 },
      { capturedAt: ts("2026-01-01T01:00:00Z"), donations: 50 },
      { capturedAt: ts("2026-01-01T02:00:00Z"), donations: 50 },
    ];
    expect(calculateDonationDelta(snapshots)).toBe(0);
  });
});

describe("calculateDonationWindow", () => {
  // A small donation history with one weekly reset in the middle.
  const snapshots = [
    { capturedAt: ts("2026-01-01T00:00:00Z"), donations: 100 }, // baseline
    { capturedAt: ts("2026-01-02T00:00:00Z"), donations: 110 }, // +10
    { capturedAt: ts("2026-01-03T00:00:00Z"), donations: 130 }, // +20
    { capturedAt: ts("2026-01-08T00:00:00Z"), donations: 5 }, // weekly reset
    { capturedAt: ts("2026-01-09T00:00:00Z"), donations: 25 }, // +20
  ];

  it("returns 0 when there are no snapshots in the window", () => {
    expect(
      calculateDonationWindow(snapshots, {
        from: ts("2026-02-01T00:00:00Z"),
        to: ts("2026-02-28T00:00:00Z"),
      }),
    ).toBe(0);
  });

  it("returns 0 for an empty snapshot list", () => {
    expect(
      calculateDonationWindow([], {
        from: ts("2026-01-02T00:00:00Z"),
        to: ts("2026-01-09T00:00:00Z"),
      }),
    ).toBe(0);
  });

  it("sums deltas for snapshots strictly inside (from, to]", () => {
    // Window 2026-01-02 .. 2026-01-03 (inclusive of end). Snapshots inside:
    //   - 01-02 (110): diff against baseline 100 → +10
    //   - 01-03 (130): diff against 110         → +20
    // Total = 30.
    expect(
      calculateDonationWindow(snapshots, {
        from: ts("2026-01-01T12:00:00Z"),
        to: ts("2026-01-03T00:00:00Z"),
      }),
    ).toBe(30);
  });

  it("includes the baseline before `from` so the first in-window delta is not lost", () => {
    // Window starts after 01-02. Without the baseline rule, the first in-window
    // snapshot (01-03 = 130) would have no previous and contribute 0.
    // With the baseline rule, it diffs against the 01-02 snapshot (110) → +20.
    expect(
      calculateDonationWindow(snapshots, {
        from: ts("2026-01-02T12:00:00Z"),
        to: ts("2026-01-03T00:00:00Z"),
      }),
    ).toBe(20);
  });

  it("handles a weekly reset inside the window", () => {
    // Window 01-02 .. 01-09 inclusive.
    // Baseline = 01-01 (100). In-window snapshots:
    //   - 01-02 (110): diff against 100   → +10
    //   - 01-03 (130): diff against 110   → +20
    //   - 01-08 (5):   reset              → +5
    //   - 01-09 (25):  diff against 5     → +20
    // Total = 55.
    expect(
      calculateDonationWindow(snapshots, {
        from: ts("2026-01-01T12:00:00Z"),
        to: ts("2026-01-09T00:00:00Z"),
      }),
    ).toBe(55);
  });
});

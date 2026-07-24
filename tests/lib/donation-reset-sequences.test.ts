import { describe, it, expect } from "vitest";
import {
  calculateDonationWindow,
  type DonationSnapshot,
} from "@/lib/scoring/donations";

/**
 * Realistic seeded-snapshot tests for reset-aware donation accounting
 * (concept/12 Step 1.2.C — "Confirm donation reset calculations against
 * seeded snapshot data"). The basic reset logic is tested in
 * donation-delta.test.ts; these tests simulate realistic multi-day snapshot
 * sequences as they'd actually appear in `member_snapshots`, including weekly
 * resets inside 24h / 7d / 30d windows and cold-start (no baseline) cases.
 */

const ts = (iso: string) => new Date(iso);

// ---------------------------------------------------------------------------
// Realistic 24-hour window (snapshots every few hours, no reset)
// ---------------------------------------------------------------------------

describe("24h window — steady increasing counter", () => {
  const snapshots: DonationSnapshot[] = [
    { capturedAt: ts("2026-07-21T00:00:00Z"), donations: 100 }, // pre-window baseline
    { capturedAt: ts("2026-07-22T00:00:00Z"), donations: 120 }, // window start (from, to]
    { capturedAt: ts("2026-07-22T06:00:00Z"), donations: 135 },
    { capturedAt: ts("2026-07-22T12:00:00Z"), donations: 150 },
    { capturedAt: ts("2026-07-22T18:00:00Z"), donations: 160 },
    { capturedAt: ts("2026-07-23T00:00:00Z"), donations: 175 }, // window end
  ];
  const window = { from: ts("2026-07-22T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };

  it("sums all in-window deltas using the pre-window baseline", () => {
    // Baseline = 120 (at 07-22 00:00 — exactly `from`, so it's the baseline,
    // excluded from the in-window set). In-window: 135, 150, 160, 175.
    // Deltas: 15 + 15 + 10 + 15 = 55.
    expect(calculateDonationWindow(snapshots, window)).toBe(55);
  });
});

// ---------------------------------------------------------------------------
// 7-day window spanning a weekly reset
// ---------------------------------------------------------------------------

describe("7d window — weekly reset mid-window", () => {
  // Simulate a week where donations climbed to 200, then reset to 0 on
  // Monday, then climbed again. The window is the full week.
  const snapshots: DonationSnapshot[] = [
    { capturedAt: ts("2026-07-15T00:00:00Z"), donations: 180 }, // pre-window baseline
    { capturedAt: ts("2026-07-16T00:00:00Z"), donations: 200 }, // window start
    { capturedAt: ts("2026-07-17T00:00:00Z"), donations: 200 },
    { capturedAt: ts("2026-07-18T00:00:00Z"), donations: 200 },
    { capturedAt: ts("2026-07-19T00:00:00Z"), donations: 5 }, // RESET (Monday)
    { capturedAt: ts("2026-07-20T00:00:00Z"), donations: 30 },
    { capturedAt: ts("2026-07-21T00:00:00Z"), donations: 60 },
    { capturedAt: ts("2026-07-22T00:00:00Z"), donations: 90 },
    { capturedAt: ts("2026-07-23T00:00:00Z"), donations: 120 }, // window end
  ];
  const window = { from: ts("2026-07-16T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };

  it("counts donations after the reset, not a negative delta", () => {
    // Baseline = 200 (at 07-16 00:00 — exactly `from`).
    // In-window: 200, 200, 5(reset), 30, 60, 90, 120.
    // Deltas: 0 + 0 + 5(reset) + 25 + 30 + 30 + 30 = 120.
    expect(calculateDonationWindow(snapshots, window)).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// 30-day window with multiple resets
// ---------------------------------------------------------------------------

describe("30d window — two weekly resets", () => {
  const snapshots: DonationSnapshot[] = [
    { capturedAt: ts("2026-06-30T00:00:00Z"), donations: 50 }, // pre-window baseline
    { capturedAt: ts("2026-07-01T00:00:00Z"), donations: 80 }, // window start
    { capturedAt: ts("2026-07-08T00:00:00Z"), donations: 150 },
    { capturedAt: ts("2026-07-09T00:00:00Z"), donations: 10 }, // RESET #1
    { capturedAt: ts("2026-07-15T00:00:00Z"), donations: 100 },
    { capturedAt: ts("2026-07-16T00:00:00Z"), donations: 5 }, // RESET #2
    { capturedAt: ts("2026-07-22T00:00:00Z"), donations: 80 },
    { capturedAt: ts("2026-07-31T00:00:00Z"), donations: 200 }, // window end
  ];
  const window = { from: ts("2026-07-01T00:00:00Z"), to: ts("2026-07-31T00:00:00Z") };

  it("sums correctly across both resets", () => {
    // Baseline = 80 (at 07-01 00:00 — exactly `from`).
    // In-window: 150, 10(reset), 100, 5(reset), 80, 200.
    // Deltas: 70 + 10(reset) + 90 + 5(reset) + 75 + 120 = 370.
    expect(calculateDonationWindow(snapshots, window)).toBe(370);
  });
});

// ---------------------------------------------------------------------------
// Cold start — tracking began inside the window (no baseline)
// ---------------------------------------------------------------------------

describe("cold start — no pre-window baseline", () => {
  const snapshots: DonationSnapshot[] = [
    { capturedAt: ts("2026-07-22T06:00:00Z"), donations: 10 }, // first-ever snapshot
    { capturedAt: ts("2026-07-22T12:00:00Z"), donations: 25 },
    { capturedAt: ts("2026-07-23T00:00:00Z"), donations: 40 },
  ];
  const window = { from: ts("2026-07-22T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };

  it("treats the first in-window snapshot as the baseline (delta 0)", () => {
    // No snapshot at or before `from`. First in-window = 10 (baseline, delta 0).
    // 10→25 = 15, 25→40 = 15. Total = 30.
    expect(calculateDonationWindow(snapshots, window)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("returns 0 when all snapshots are after the window", () => {
    const snapshots: DonationSnapshot[] = [
      { capturedAt: ts("2026-07-25T00:00:00Z"), donations: 100 },
    ];
    const window = { from: ts("2026-07-22T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };
    expect(calculateDonationWindow(snapshots, window)).toBe(0);
  });

  it("returns 0 when all snapshots are at or before `from` (nothing in-window)", () => {
    const snapshots: DonationSnapshot[] = [
      { capturedAt: ts("2026-07-21T00:00:00Z"), donations: 100 },
      { capturedAt: ts("2026-07-22T00:00:00Z"), donations: 120 }, // == from, excluded (from, to]
    ];
    const window = { from: ts("2026-07-22T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };
    expect(calculateDonationWindow(snapshots, window)).toBe(0);
  });

  it("handles a single in-window snapshot with a baseline", () => {
    const snapshots: DonationSnapshot[] = [
      { capturedAt: ts("2026-07-21T00:00:00Z"), donations: 100 }, // baseline
      { capturedAt: ts("2026-07-22T12:00:00Z"), donations: 130 }, // only in-window
    ];
    const window = { from: ts("2026-07-22T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };
    // Baseline 100 → 130 = 30.
    expect(calculateDonationWindow(snapshots, window)).toBe(30);
  });

  it("handles a reset between the baseline and the first in-window snapshot", () => {
    const snapshots: DonationSnapshot[] = [
      { capturedAt: ts("2026-07-21T00:00:00Z"), donations: 200 }, // baseline
      { capturedAt: ts("2026-07-22T12:00:00Z"), donations: 20 }, // reset happened between
    ];
    const window = { from: ts("2026-07-22T00:00:00Z"), to: ts("2026-07-23T00:00:00Z") };
    // 200 → 20 = RESET → 20 (not -180).
    expect(calculateDonationWindow(snapshots, window)).toBe(20);
  });
});

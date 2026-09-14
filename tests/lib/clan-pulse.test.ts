import { describe, it, expect } from "vitest";
import { buildClanPulse, buildVerdict } from "@/lib/scoring/clan-pulse";
import type {
  ActivityTimeline,
  RosterSizeTrend,
  DonationWindow,
} from "@/lib/view-models/dashboard";

/**
 * Clan Pulse — the combined Activity × Roster panel's pure engine.
 *
 * Fixture times are UTC instants; the clan timezone is Asia/Manila (UTC+8)
 * via clanConfig, so a snapshot at 2026-09-13T18:00:00Z is 2026-09-14 02:00
 * Manila — the day keys below deliberately cross Manila midnight.
 */

function activity(
  window: DonationWindow,
  buckets: Array<{ label: string; at: string; active: number; total: number }>,
  opts: { totalActive?: number; partial?: boolean } = {},
): ActivityTimeline {
  return {
    window,
    buckets: buckets.map((b) => ({
      label: b.label,
      activeMembers: b.active,
      totalMembers: b.total,
      percent: b.total > 0 ? (b.active / b.total) * 100 : 0,
      timestamp: new Date(b.at),
    })),
    totalActiveMembers: opts.totalActive ?? buckets.reduce((m, b) => Math.max(m, b.active), 0),
    totalMembers: buckets[0]?.total ?? 0,
    hasPartialData: opts.partial ?? false,
  };
}

function roster(days: Array<{ dayKey: string; count: number }>): RosterSizeTrend {
  return {
    points: days.map((d) => ({
      // Naive Manila-midnight as a UTC instant is enough for the pure
      // engine — it only reads dayKey.
      timestamp: new Date(`${d.dayKey}T00:00:00Z`),
      dayKey: d.dayKey,
      count: d.count,
    })),
    windowDays: days.length,
  };
}

/** Buckets for a 7d-style window, one per day at 12:00 UTC (20:00 Manila). */
function dayBuckets(days: string[], active: number[], total: number) {
  return days.map((d, i) => ({
    label: `d${i}`,
    at: `${d}T12:00:00Z`,
    active: active[i] ?? 0,
    total,
  }));
}

describe("buildClanPulse — per-bucket alignment", () => {
  it("aligns roster by clan-TZ day and carries values forward", () => {
    const pulse = buildClanPulse(
      activity("7d", dayBuckets(["2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"], [3, 4, 2, 5], 10), { totalActive: 6 }),
      roster([
        { dayKey: "2026-09-10", count: 8 },
        { dayKey: "2026-09-12", count: 10 },
        { dayKey: "2026-09-14", count: 12 },
      ]),
    );

    // 09-11 carries 09-10's 8; 09-12 uses 10; 09-13 carries 10; 09-14 uses 12.
    expect(pulse.points.map((p) => p.roster)).toEqual([8, 10, 10, 12]);
    // rate = active / roster * 100
    expect(pulse.points.map((p) => p.rate)).toEqual([
      (3 / 8) * 100,
      (4 / 10) * 100,
      (2 / 10) * 100,
      (5 / 12) * 100,
    ]);
    // Momentum: last-day roster (12) − carry-forward at the first bucket (8).
    expect(pulse.rosterDelta).toBe(4);
    expect(pulse.rosterNow).toBe(12);
    // Growth: +4 on a baseline of 8 → threshold max(1, round(0.4)) = 1 → up.
    // Engagement: rates rise 37.5 → 40 → 20 → 41.7 — halves [37.5, 40] vs
    // [20, 41.67] → −11.6pp → down… verify the exact arithmetic below.
    const avg = (37.5 + 40 + 20 + 41.666666666666664) / 4;
    expect(pulse.avgRate).toBeCloseTo(avg, 5);
    expect(pulse.rateTrendPp).toBeCloseTo((20 + 41.666666666666664) / 2 - (37.5 + 40) / 2, 5);
  });

  it("uses roster days BEFORE the window as carry-forward context (24h that starts yesterday)", () => {
    const pulse = buildClanPulse(
      activity("24h", [
        // 2026-09-13T17:00Z = Sep 14, 01:00 Manila (past midnight) — the
        // 24h window that "starts yesterday" in UTC starts TODAY in Manila.
        { label: "01:00", at: "2026-09-13T17:00:00Z", active: 1, total: 7 },
        { label: "09:00", at: "2026-09-14T01:00:00Z", active: 3, total: 7 }, // Sep 14, 09:00 Manila
      ], { totalActive: 3 }),
      roster([
        { dayKey: "2026-09-12", count: 6 },
        { dayKey: "2026-09-13", count: 7 },
        { dayKey: "2026-09-14", count: 9 },
      ]),
    );

    // Both buckets sit on Manila day 09-14 → 9, not 09-13's 7 or 09-12's 6.
    expect(pulse.points.map((p) => p.roster)).toEqual([9, 9]);
    expect(pulse.rosterNow).toBe(9);
    expect(pulse.rosterDelta).toBe(0); // both buckets on the same day
  });

  it("handles buckets before any roster day (rate null, not zero)", () => {
    const pulse = buildClanPulse(
      activity("7d", dayBuckets(["2026-09-10", "2026-09-11"], [2, 3], 10)),
      roster([{ dayKey: "2026-09-11", count: 10 }]),
    );

    expect(pulse.points[0]!.roster).toBeNull();
    expect(pulse.points[0]!.rate).toBeNull();
    expect(pulse.points[1]!.roster).toBe(10);
    // Only one measurable rate → no trend (needs ≥2).
    expect(pulse.rateTrendPp).toBeNull();
    // Baseline unknown → no momentum.
    expect(pulse.rosterDelta).toBeNull();
    // And the verdict must say so rather than claim "Steady".
    expect(pulse.verdict.label).toBe("Warming up");
    expect(pulse.avgRate).toBeCloseTo(30, 5);
  });

  it("empty roster (cold start) yields all-null rates and a warming-up verdict", () => {
    const pulse = buildClanPulse(
      activity("7d", dayBuckets(["2026-09-11", "2026-09-12"], [1, 2], 5)),
      roster([]),
    );
    expect(pulse.points.every((p) => p.roster === null && p.rate === null)).toBe(true);
    expect(pulse.verdict.label).toBe("Warming up");
    expect(pulse.verdict.growth).toBeNull();
    expect(pulse.verdict.engagement).toBeNull();
  });

  it("empty activity buckets produce an empty series without crashing", () => {
    const pulse = buildClanPulse(
      { window: "24h", buckets: [], totalActiveMembers: 0, totalMembers: 0, hasPartialData: false },
      roster([{ dayKey: "2026-09-14", count: 7 }]),
    );
    expect(pulse.points).toEqual([]);
    expect(pulse.rosterNow).toBeNull();
    expect(pulse.verdict.label).toBe("Warming up");
  });

  it("passes through window totals and the partial-data flag", () => {
    const pulse = buildClanPulse(
      activity("30d", dayBuckets(["2026-09-14"], [4], 7), { totalActive: 4, partial: true }),
      roster([{ dayKey: "2026-09-14", count: 7 }]),
    );
    expect(pulse.totalActiveMembers).toBe(4);
    expect(pulse.totalMembers).toBe(7);
    expect(pulse.hasPartialData).toBe(true);
    expect(pulse.window).toBe("30d");
  });
});

describe("buildVerdict — growth × engagement matrix", () => {
  it("up + up → Thriving", () => {
    const v = buildVerdict(3, 20, 8);
    expect(v.label).toBe("Thriving");
    expect(v.tone).toBe("success");
    expect(v.growth).toBe("up");
    expect(v.engagement).toBe("up");
  });

  it("up + down → Growing, diluting", () => {
    const v = buildVerdict(4, 20, -8);
    expect(v.label).toBe("Growing, diluting");
    expect(v.tone).toBe("warning");
  });

  it("down + up → Tightening core", () => {
    const v = buildVerdict(-3, 20, 9);
    expect(v.label).toBe("Tightening core");
    expect(v.tone).toBe("warning");
  });

  it("down + down → Fading", () => {
    const v = buildVerdict(-2, 20, -7);
    expect(v.label).toBe("Fading");
    expect(v.tone).toBe("danger");
  });

  it("small roster swing inside the relative threshold is flat (±1 in a 7-member clan)", () => {
    // threshold = max(1, round(7 * 0.05)) = 1 → -1/±1… |−1| is NOT < 1 → down.
    // |0| < 1 → flat.
    expect(buildVerdict(0, 7, 10).growth).toBe("flat");
    // In a 50-member clan a ±1 swing is noise: threshold = max(1, 3) = 3.
    expect(buildVerdict(1, 50, 10).growth).toBe("flat");
    expect(buildVerdict(-2, 50, 10).growth).toBe("flat");
    expect(buildVerdict(3, 50, 10).growth).toBe("up");
  });

  it("engagement trend inside ±5pp is flat", () => {
    expect(buildVerdict(3, 20, 4).engagement).toBe("flat");
    expect(buildVerdict(3, 20, -4.9).engagement).toBe("flat");
    expect(buildVerdict(3, 20, 5.1).engagement).toBe("up");
    expect(buildVerdict(3, 20, -5.1).engagement).toBe("down");
  });

  it("mixed flat dimensions produce steady verdicts that say which side moved", () => {
    const flatRoster = buildVerdict(0, 20, 9);
    expect(flatRoster.label).toBe("Steady roster");
    expect(flatRoster.description).toContain("Roster steady");
    expect(flatRoster.description).toContain("engagement rising");

    const flatEngagement = buildVerdict(4, 20, 0);
    expect(flatEngagement.label).toBe("Steady engagement");

    const bothFlat = buildVerdict(0, 20, 2);
    expect(bothFlat.label).toBe("Steady");
  });

  it("unknown dimensions → Warming up", () => {
    expect(buildVerdict(null, null, 8).label).toBe("Warming up");
    expect(buildVerdict(3, 20, null).label).toBe("Warming up");
    expect(buildVerdict(null, null, null).label).toBe("Warming up");
    expect(buildVerdict(null, null, null).tone).toBe("muted");
  });
});

describe("buildClanPulse — verdict integration", () => {
  it("a growing-but-diluting month is detected end-to-end", () => {
    // 30 days: roster 20 → 45, active roughly constant ~10 → rate 50% → 22%.
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 7, 16 + i)); // 2026-08-16 … 2026-09-14
      return d.toISOString().slice(0, 10);
    });
    const counts = days.map((_, i) => 20 + Math.round((i * 25) / 29));
    const active = days.map(() => 10);

    const pulse = buildClanPulse(
      activity("30d", dayBuckets(days, active, 45), { totalActive: 12 }),
      roster(days.map((d, i) => ({ dayKey: d, count: counts[i]! }))),
    );

    expect(pulse.rosterDelta).toBe(25);
    expect(pulse.verdict.growth).toBe("up");
    expect(pulse.verdict.engagement).toBe("down");
    expect(pulse.verdict.label).toBe("Growing, diluting");
    expect(pulse.verdict.tone).toBe("warning");
  });

  it("a shrinking-but-engaged week is detected end-to-end", () => {
    const days = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"];
    // Roster 20 → 14, active 2 → 9 → rate 10% → 64%.
    const counts = [20, 19, 18, 17, 16, 15, 14];
    const active = [2, 3, 4, 5, 7, 8, 9];

    const pulse = buildClanPulse(
      activity("7d", dayBuckets(days, active, 14), { totalActive: 9 }),
      roster(days.map((d, i) => ({ dayKey: d, count: counts[i]! }))),
    );

    expect(pulse.rosterDelta).toBe(-6);
    expect(pulse.verdict.label).toBe("Tightening core");
    expect(pulse.verdict.tone).toBe("warning");
  });
});

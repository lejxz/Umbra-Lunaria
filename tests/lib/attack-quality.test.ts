import { describe, it, expect } from "vitest";
import {
  summarizeAttackQuality,
  threeStarRateDelta,
  attackTierRows,
  tierOf,
  type AttackQualitySummary,
} from "@/lib/war/attack-quality";
import type { WarAttackQualityPoint } from "@/lib/view-models/dashboard";

/**
 * Tests for the attack-quality windowing math (lib/war/attack-quality.ts).
 *
 * The card slices per-war aggregates client-side — same contract as the
 * war-performance panel — so the distribution, averages, and the
 * window-over-window 3★-rate delta must hold up without a DB. These tests
 * pin that math, including the "not enough history for a fair comparison"
 * guards.
 */

function war(overrides: Partial<WarAttackQualityPoint>): WarAttackQualityPoint {
  return {
    endTime: new Date("2026-09-10T00:00:00Z"),
    teamSize: 5,
    attacks: 10,
    starsSum: 25,
    destructionSum: 830,
    threeStar: 5,
    twoStar: 3,
    oneStar: 1,
    zeroStar: 1,
    destSumThreeStar: 500,
    destSumTwoStar: 240,
    destSumOneStar: 60,
    destSumZeroStar: 30,
    ...overrides,
  };
}

describe("summarizeAttackQuality", () => {
  it("aggregates counts, averages, and the 3★ rate across wars", () => {
    const summary = summarizeAttackQuality([
      war({}),
      war({
        attacks: 4,
        starsSum: 8,
        destructionSum: 260,
        threeStar: 1,
        twoStar: 1,
        oneStar: 2,
        zeroStar: 0,
        destSumThreeStar: 100,
        destSumTwoStar: 80,
        destSumOneStar: 80,
        destSumZeroStar: 0,
      }),
    ]);

    expect(summary.wars).toBe(2);
    expect(summary.attacks).toBe(14);
    expect(summary.threeStar).toBe(6);
    expect(summary.twoStar).toBe(4);
    expect(summary.oneStar).toBe(3);
    expect(summary.zeroStar).toBe(1);
    // (25 + 8) / 14 = 2.36 → 2.36
    expect(summary.avgStars).toBe(2.36);
    // (830 + 260) / 14 = 77.86 → 78
    expect(summary.avgDestruction).toBe(78);
    // 6 / 14 = 42.86 → 42.9
    expect(summary.threeStarRate).toBe(42.9);
  });

  it("returns zero counts and null averages for an empty window", () => {
    const summary: AttackQualitySummary = summarizeAttackQuality([]);
    expect(summary.wars).toBe(0);
    expect(summary.attacks).toBe(0);
    expect(summary.threeStar).toBe(0);
    expect(summary.avgStars).toBeNull();
    expect(summary.avgDestruction).toBeNull();
    expect(summary.threeStarRate).toBeNull();
  });
});

describe("threeStarRateDelta", () => {
  it("is positive when the recent window is cleaner than the prior one", () => {
    // 5 wars, window size 2: current = wars 4–5 (4/4 3★ each), prior = wars
    // 2–3 (2/4 3★ each); war 1 falls outside both windows.
    const points = [
      war({ threeStar: 4, twoStar: 0, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 2, twoStar: 2, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 2, twoStar: 2, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 4, twoStar: 0, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 4, twoStar: 0, oneStar: 0, zeroStar: 0 }),
    ];
    // current: 8/8 = 100%, prior: 4/8 = 50% → +50
    expect(threeStarRateDelta(points, 2)).toBe(50);
  });

  it("is negative when attacks got dirtier", () => {
    const points = [
      war({ threeStar: 4, twoStar: 0, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 4, twoStar: 0, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 0, twoStar: 4, oneStar: 0, zeroStar: 0 }),
      war({ threeStar: 0, twoStar: 4, oneStar: 0, zeroStar: 0 }),
    ];
    // current: 0/8 = 0%, prior: 8/8 = 100% → −100
    expect(threeStarRateDelta(points, 2)).toBe(-100);
  });

  it("is null without a full preceding window of equal size", () => {
    expect(threeStarRateDelta([war({}), war({})], 2)).toBeNull(); // only 2 wars
    expect(threeStarRateDelta([], 2)).toBeNull();
    expect(threeStarRateDelta([war({})], 0)).toBeNull();
  });

  it("is null when either window has no attacks", () => {
    const emptyWar = war({
      attacks: 0,
      starsSum: 0,
      destructionSum: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
      zeroStar: 0,
      destSumThreeStar: 0,
      destSumTwoStar: 0,
      destSumOneStar: 0,
      destSumZeroStar: 0,
    });
    // Prior window (first 2 wars) has attacks; current window is empty wars.
    expect(threeStarRateDelta([war({}), war({}), emptyWar, emptyWar], 2)).toBeNull();
  });
});

describe("attackTierRows", () => {
  it("orders tiers best → worst with counts, shares, and avg destruction", () => {
    const rows = attackTierRows([war({})]);
    expect(rows.map((r) => r.tier)).toEqual(["3", "2", "1", "0"]);
    // war fixture: 5×3★ (dest 500 → avg 100), 3×2★ (240 → 80), 1×1★ (60), 1×0★ (30)
    expect(rows[0]).toEqual({ tier: "3", count: 5, share: 50, avgDestruction: 100 });
    expect(rows[1]).toEqual({ tier: "2", count: 3, share: 30, avgDestruction: 80 });
    expect(rows[2]).toEqual({ tier: "1", count: 1, share: 10, avgDestruction: 60 });
    expect(rows[3]).toEqual({ tier: "0", count: 1, share: 10, avgDestruction: 30 });
  });

  it("gives an empty tier a zero share and null avg destruction", () => {
    const rows = attackTierRows([
      war({ threeStar: 10, twoStar: 0, oneStar: 0, zeroStar: 0 }),
    ]);
    expect(rows[0]).toEqual({ tier: "3", count: 10, share: 100, avgDestruction: 50 });
    expect(rows[1]).toEqual({ tier: "2", count: 0, share: 0, avgDestruction: null });
    expect(rows[2]).toEqual({ tier: "1", count: 0, share: 0, avgDestruction: null });
    expect(rows[3]).toEqual({ tier: "0", count: 0, share: 0, avgDestruction: null });
  });

  it("handles the empty window without dividing by zero", () => {
    const rows = attackTierRows([]);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.count === 0 && r.share === 0 && r.avgDestruction === null)).toBe(true);
  });
});

describe("tierOf", () => {
  it("folds stars ≥ 3 into the 3★ tier", () => {
    expect(tierOf(3)).toBe("3");
    expect(tierOf(4)).toBe("3");
    expect(tierOf(2)).toBe("2");
    expect(tierOf(1)).toBe("1");
    expect(tierOf(0)).toBe("0");
    expect(tierOf(-1)).toBe("0");
  });
});

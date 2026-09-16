import { describe, it, expect } from "vitest";
import {
  maxStars,
  starEfficiency,
  rollingAverage,
  summarizeWarPerformance,
} from "@/lib/war/star-efficiency";
import type { WarPerformancePoint } from "@/lib/view-models/dashboard";

/**
 * Tests for the war-performance normalization math (lib/war/star-efficiency.ts).
 *
 * The whole point of the module: raw stars are incomparable across war sizes
 * (a perfect 5v5 is 15★, a perfect 40v40 is 120★), so efficiency expresses
 * every war on the same 0–100 scale. These tests pin that math — including
 * the real values from the clan's actual war history (5v5…40v40 mix) — so a
 * future refactor can't silently shift the scale.
 */

function point(overrides: Partial<WarPerformancePoint>): WarPerformancePoint {
  return {
    endTime: new Date("2026-09-12T00:00:00Z"),
    opponentName: "Test Clan",
    warType: "regular",
    teamSize: 5,
    ownStars: 15,
    opponentStars: 13,
    ownDestruction: 100,
    opponentDestruction: 87,
    result: "win",
    ...overrides,
  };
}

describe("maxStars", () => {
  it("is 3 per roster slot", () => {
    expect(maxStars(5)).toBe(15);
    expect(maxStars(40)).toBe(120);
  });

  it("is null for unknown or non-positive team sizes", () => {
    expect(maxStars(null)).toBeNull();
    expect(maxStars(0)).toBeNull();
    expect(maxStars(-5)).toBeNull();
  });
});

describe("starEfficiency", () => {
  it("normalizes across war sizes onto one 0–100 scale", () => {
    // Real values from the clan's history: a perfect 5v5 and a 70% 40v40.
    expect(starEfficiency(15, 5)).toBe(100);
    expect(starEfficiency(84, 40)).toBe(70);
    expect(starEfficiency(67, 30)).toBe(74.4);
  });

  it("is 0 for a zero-star war and null when size is unknown", () => {
    expect(starEfficiency(0, 5)).toBe(0);
    expect(starEfficiency(15, null)).toBeNull();
  });

  it("keeps one decimal of precision", () => {
    // 56/75 = 74.666… → 74.7
    expect(starEfficiency(56, 25)).toBe(74.7);
  });
});

describe("rollingAverage", () => {
  it("aligns the trailing mean to the last index of each full window", () => {
    expect(rollingAverage([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
  });

  it("skips null values instead of collapsing the window", () => {
    // Window [null, 2, 3] has only 2 usable values → not full → null.
    expect(rollingAverage([null, 2, 3, 4], 3)).toEqual([null, null, null, 3]);
  });

  it("returns all-null for a non-positive window and identity for n=1", () => {
    expect(rollingAverage([1, 2], 0)).toEqual([null, null]);
    expect(rollingAverage([1, null, 3], 1)).toEqual([1, null, 3]);
  });

  it("handles an empty series", () => {
    expect(rollingAverage([], 3)).toEqual([]);
  });
});

describe("summarizeWarPerformance", () => {
  it("counts W/T/L and averages own efficiency", () => {
    const summary = summarizeWarPerformance([
      point({ ownStars: 15, teamSize: 5, result: "win" }), // 100
      point({ ownStars: 14, teamSize: 5, result: "win" }), // 93.3
      point({ ownStars: 12, opponentStars: 12, result: "loss" }), // 80
      point({ ownStars: 15, opponentStars: 15, result: "tie" }), // 100
    ]);
    expect(summary).toEqual({
      wars: 4,
      wins: 2,
      ties: 1,
      losses: 1,
      avgOwnEfficiency: 93.3, // (100 + 93.3 + 80 + 100) / 4 = 93.325 → 93.3
    });
  });

  it("counts wars without a result toward the total but not W/T/L", () => {
    const summary = summarizeWarPerformance([
      point({ result: null }),
      point({ result: "win" }),
    ]);
    expect(summary.wars).toBe(2);
    expect(summary.wins).toBe(1);
    expect(summary.ties).toBe(0);
    expect(summary.losses).toBe(0);
  });

  it("averages efficiency only over points with a computable team size", () => {
    const summary = summarizeWarPerformance([
      point({ ownStars: 15, teamSize: 5 }), // 100
      point({ ownStars: 84, teamSize: 40 }), // 70
      point({ ownStars: 15, teamSize: null }), // excluded
    ]);
    expect(summary.avgOwnEfficiency).toBe(85);
    expect(summary.wars).toBe(3);
  });

  it("returns a null average when no point has a team size", () => {
    const summary = summarizeWarPerformance([point({ teamSize: null })]);
    expect(summary.avgOwnEfficiency).toBeNull();
  });

  it("returns zeros for an empty set", () => {
    expect(summarizeWarPerformance([])).toEqual({
      wars: 0,
      wins: 0,
      ties: 0,
      losses: 0,
      avgOwnEfficiency: null,
    });
  });
});

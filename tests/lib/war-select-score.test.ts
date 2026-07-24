import { describe, it, expect } from "vitest";
import { computeWarSelectScore, type WarSelectInput } from "@/lib/scoring/war-select-score";

/**
 * Tests for the war auto-select composite score (concept/09 §"Composite score").
 *
 * Covers the 30/25/20/15/10 formula, re-normalization on unavailable
 * components, limited-data flag, opted-out exclusion flag, and edge cases
 * (no history, partial history, all-available).
 */

const MIN_WARS = 3;

function makeInput(over: Partial<WarSelectInput> = {}): WarSelectInput {
  return {
    playerTag: "#P1",
    name: "Test",
    townHallLevel: 14,
    warPreference: "in",
    recentActivityRate: 0.8,
    warAttacksUsed: 10,
    warAttacksAllowed: 10,
    warStarsEarned: 25,
    threeStarAttacks: 5,
    rushedPercent: 10,
    warsTracked: 5,
    ...over,
  };
}

describe("computeWarSelectScore — full data", () => {
  it("computes a high score for a fully-active, high-performing member", () => {
    const score = computeWarSelectScore(makeInput(), MIN_WARS);
    expect(score.total).toBeGreaterThan(60);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.limitedData).toBe(false);
    expect(score.optedOut).toBe(false);
  });

  it("includes all 5 components, all available", () => {
    const score = computeWarSelectScore(makeInput(), MIN_WARS);
    expect(score.components).toHaveLength(5);
    expect(score.components.every((c) => c.available)).toBe(true);
  });

  it("exposes the correct component names", () => {
    const score = computeWarSelectScore(makeInput(), MIN_WARS);
    const names = score.components.map((c) => c.name);
    expect(names).toEqual([
      "activity",
      "participation",
      "averageStars",
      "threeStarRate",
      "accountReadiness",
    ]);
  });
});

describe("computeWarSelectScore — re-normalization on unavailable", () => {
  it("excludes the war components when no war data exists", () => {
    const score = computeWarSelectScore(
      makeInput({
        warAttacksUsed: null,
        warAttacksAllowed: null,
        warStarsEarned: null,
        threeStarAttacks: null,
        warsTracked: 0,
      }),
      MIN_WARS,
    );
    // participation, averageStars, threeStarRate all unavailable.
    const unavailable = score.components.filter((c) => !c.available);
    expect(unavailable.map((c) => c.name)).toEqual([
      "participation",
      "averageStars",
      "threeStarRate",
    ]);
    // Available weights should sum to 1.0 (re-normalized).
    const availableWeights = score.components
      .filter((c) => c.available)
      .reduce((acc, c) => acc + c.weight, 0);
    expect(availableWeights).toBeCloseTo(1.0, 4);
    // Score still computes from activity + readiness.
    expect(score.total).toBeGreaterThan(0);
    expect(score.limitedData).toBe(true); // warsTracked 0 < MIN_WARS 3
  });

  it("excludes account-readiness when rushedPercent is null", () => {
    const score = computeWarSelectScore(makeInput({ rushedPercent: null }), MIN_WARS);
    const readiness = score.components.find((c) => c.name === "accountReadiness")!;
    expect(readiness.available).toBe(false);
    expect(readiness.weight).toBe(0);
    expect(readiness.points).toBe(0);
  });

  it("excludes activity when recentActivityRate is null", () => {
    const score = computeWarSelectScore(makeInput({ recentActivityRate: null }), MIN_WARS);
    const activity = score.components.find((c) => c.name === "activity")!;
    expect(activity.available).toBe(false);
  });

  it("handles all-unavailable (zero score, no crash)", () => {
    const score = computeWarSelectScore(
      makeInput({
        recentActivityRate: null,
        warAttacksUsed: null,
        warAttacksAllowed: null,
        warStarsEarned: null,
        threeStarAttacks: null,
        rushedPercent: null,
        warsTracked: 0,
      }),
      MIN_WARS,
    );
    expect(score.total).toBe(0);
    expect(score.components.every((c) => !c.available)).toBe(true);
  });
});

describe("computeWarSelectScore — opted-out", () => {
  it("flags opted-out members but still computes a score", () => {
    const score = computeWarSelectScore(
      makeInput({ warPreference: "out" }),
      MIN_WARS,
    );
    expect(score.optedOut).toBe(true);
    // The score is still computed — the UI excludes opted-out from the
    // auto-suggestion list but shows the breakdown if leadership looks.
    expect(score.total).toBeGreaterThan(0);
  });
});

describe("computeWarSelectScore — limited-data threshold", () => {
  it("flags limited data when warsTracked < minWarsForConfidentRanking", () => {
    expect(
      computeWarSelectScore(makeInput({ warsTracked: 0 }), MIN_WARS).limitedData,
    ).toBe(true);
    expect(
      computeWarSelectScore(makeInput({ warsTracked: 2 }), MIN_WARS).limitedData,
    ).toBe(true);
    expect(
      computeWarSelectScore(makeInput({ warsTracked: 3 }), MIN_WARS).limitedData,
    ).toBe(false);
    expect(
      computeWarSelectScore(makeInput({ warsTracked: 10 }), MIN_WARS).limitedData,
    ).toBe(false);
  });
});

describe("computeWarSelectScore — normalization correctness", () => {
  it("normalizes average stars by dividing by 3 (max 3 stars)", () => {
    // 6 attacks, 18 stars = 3.0 avg → normalized = 1.0
    const score = computeWarSelectScore(
      makeInput({ warAttacksUsed: 6, warStarsEarned: 18 }),
      MIN_WARS,
    );
    const avg = score.components.find((c) => c.name === "averageStars")!;
    expect(avg.normalized).toBeCloseTo(1.0, 4);
  });

  it("normalizes three-star rate as threeStars/attacksUsed", () => {
    const score = computeWarSelectScore(
      makeInput({ warAttacksUsed: 10, threeStarAttacks: 3 }),
      MIN_WARS,
    );
    const tsr = score.components.find((c) => c.name === "threeStarRate")!;
    expect(tsr.normalized).toBeCloseTo(0.3, 4);
  });

  it("normalizes account readiness as 1 − rushedPercent/100", () => {
    const score = computeWarSelectScore(
      makeInput({ rushedPercent: 40 }),
      MIN_WARS,
    );
    const ar = score.components.find((c) => c.name === "accountReadiness")!;
    expect(ar.normalized).toBeCloseTo(0.6, 4);
  });

  it("clamps normalized values to 0..1", () => {
    // rushedPercent > 100 would give negative readiness — clamp to 0.
    const score = computeWarSelectScore(
      makeInput({ rushedPercent: 150 }),
      MIN_WARS,
    );
    const ar = score.components.find((c) => c.name === "accountReadiness")!;
    expect(ar.normalized).toBe(0);
  });

  it("clamps activity rate above 1 to 1", () => {
    const score = computeWarSelectScore(
      makeInput({ recentActivityRate: 1.5 }),
      MIN_WARS,
    );
    const act = score.components.find((c) => c.name === "activity")!;
    expect(act.normalized).toBe(1);
  });
});

describe("computeWarSelectScore — points sum to total", () => {
  it("total equals the sum of all component points", () => {
    const score = computeWarSelectScore(makeInput(), MIN_WARS);
    const sum = score.components.reduce((acc, c) => acc + c.points, 0);
    expect(score.total).toBeCloseTo(sum, 4);
  });
});

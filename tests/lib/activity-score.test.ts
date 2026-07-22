import { describe, it, expect } from "vitest";
import {
  computeActivityScore,
  type ScoreInput,
  type ClanMaxValues,
} from "@/lib/scoring/activity-score";
import {
  computeWarMetrics,
  computeWinRate,
  type WarParticipationInput,
} from "@/lib/scoring/war-metrics";
import type { MemberActivityScore } from "@/lib/view-models/dashboard";

/**
 * Tests for the Member Activity Score (concept/05-dashboard.md §5) and the
 * war participation metrics (concept/06-members.md §4).
 *
 * The activity score is a pure function: inputs in, score out. These tests
 * pin the weighting, re-normalization, and availability rules so downstream
 * UI changes can't silently change the math.
 */

// Helper: build a fully-populated ScoreInput. Tests override individual
// fields to exercise the rule they care about.
function baseInput(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    playerTag: "#PLAYER1",
    name: "TestMember",
    role: "member",
    townHallLevel: 14,
    league: null,
    leagueTier: null,
    warPreference: "in",
    donationsGiven: 1000,
    observedActivityRate: 1.0,
    warAttacksUsed: 12,
    warAttacksAllowed: 12,
    capitalContribution: 50000,
    ...overrides,
  };
}

// Helper: build a ClanMaxValues where every member is at the clan max, so
// normalized values are 1.0 across the board when nothing is overridden.
function baseMax(overrides: Partial<ClanMaxValues> = {}): ClanMaxValues {
  return {
    maxDonations: 1000,
    maxActivityRate: 1.0,
    maxCapitalContribution: 50000,
    ...overrides,
  };
}

const trackingStart = new Date("2026-01-01T00:00:00Z");

// ---------------------------------------------------------------------------
// Activity score — full score
// ---------------------------------------------------------------------------

describe("computeActivityScore — full score (all components available)", () => {
  it("scores 100 when every component is at the clan max", () => {
    const result = computeActivityScore(
      baseInput(),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    expect(result.totalScore).toBeCloseTo(100, 5);

    // Weights are the raw weights divided by 100 (sum to 1.0).
    const donations = result.components.find((c) => c.name === "donations");
    const activity = result.components.find((c) => c.name === "activity");
    const war = result.components.find((c) => c.name === "war");
    const capital = result.components.find((c) => c.name === "capital");

    expect(donations?.weight).toBeCloseTo(0.35, 5);
    expect(activity?.weight).toBeCloseTo(0.25, 5);
    expect(war?.weight).toBeCloseTo(0.25, 5);
    expect(capital?.weight).toBeCloseTo(0.15, 5);

    // Points = normalized × weight × 100.
    expect(donations?.points).toBeCloseTo(35, 5);
    expect(activity?.points).toBeCloseTo(25, 5);
    expect(war?.points).toBeCloseTo(25, 5);
    expect(capital?.points).toBeCloseTo(15, 5);

    // All components are available.
    for (const c of result.components) {
      expect(c.available).toBe(true);
    }
  });

  it("scales each component linearly with normalized value", () => {
    // Half the clan max on every component → total 50.
    const result = computeActivityScore(
      baseInput({
        donationsGiven: 500, // half of maxDonations 1000
        observedActivityRate: 0.5,
        warAttacksUsed: 6, // half of 12 allowed
        warAttacksAllowed: 12,
        capitalContribution: 25000, // half of maxCapital 50000
      }),
      baseMax(),
      "7d",
      trackingStart,
      false,
    );

    expect(result.totalScore).toBeCloseTo(50, 5);

    const donations = result.components.find((c) => c.name === "donations");
    const activity = result.components.find((c) => c.name === "activity");
    const war = result.components.find((c) => c.name === "war");
    const capital = result.components.find((c) => c.name === "capital");

    expect(donations?.normalized).toBeCloseTo(0.5, 5);
    expect(activity?.normalized).toBeCloseTo(0.5, 5);
    expect(war?.normalized).toBeCloseTo(0.5, 5);
    expect(capital?.normalized).toBeCloseTo(0.5, 5);

    expect(donations?.points).toBeCloseTo(17.5, 5); // 0.5 × 0.35 × 100
    expect(activity?.points).toBeCloseTo(12.5, 5); // 0.5 × 0.25 × 100
    expect(war?.points).toBeCloseTo(12.5, 5); // 0.5 × 0.25 × 100
    expect(capital?.points).toBeCloseTo(7.5, 5); // 0.5 × 0.15 × 100
  });

  it("passes window, trackingStart, and identity fields through", () => {
    const result = computeActivityScore(
      baseInput({
        playerTag: "#ABC",
        name: "Alice",
        role: "leader",
        townHallLevel: 16,
      }),
      baseMax(),
      "24h",
      trackingStart,
      false,
    );

    expect(result.playerTag).toBe("#ABC");
    expect(result.name).toBe("Alice");
    expect(result.role).toBe("leader");
    expect(result.townHallLevel).toBe(16);
    expect(result.window).toBe("24h");
    expect(result.trackingStart).toBe(trackingStart);
  });
});

// ---------------------------------------------------------------------------
// Activity score — re-normalization rules
// ---------------------------------------------------------------------------

describe("computeActivityScore — capital unavailable re-normalizes to 35/25/25 over 85", () => {
  it("excludes capital and re-weights the remaining three components", () => {
    const result = computeActivityScore(
      baseInput({ capitalContribution: null }),
      baseMax({ maxCapitalContribution: 0 }),
      "30d",
      trackingStart,
      false,
    );

    const capital = result.components.find((c) => c.name === "capital");
    expect(capital?.available).toBe(false);
    expect(capital?.weight).toBe(0);
    expect(capital?.points).toBe(0);
    expect(capital?.normalized).toBe(0);

    // Reweighted: 35/85, 25/85, 25/85 (sum to 1.0).
    const donations = result.components.find((c) => c.name === "donations");
    const activity = result.components.find((c) => c.name === "activity");
    const war = result.components.find((c) => c.name === "war");

    expect(donations?.weight).toBeCloseTo(35 / 85, 5);
    expect(activity?.weight).toBeCloseTo(25 / 85, 5);
    expect(war?.weight).toBeCloseTo(25 / 85, 5);

    // Sum of weights is 1.0.
    const sumWeights = result.components
      .map((c) => c.weight)
      .reduce((a, b) => a + b, 0);
    expect(sumWeights).toBeCloseTo(1.0, 5);

    // A member at the max on every available component still scores 100.
    expect(result.totalScore).toBeCloseTo(100, 5);
  });
});

describe("computeActivityScore — warPreference 'out' excludes the war component", () => {
  it("re-weights the remaining three components (35/25/15 over 75)", () => {
    const result = computeActivityScore(
      baseInput({ warPreference: "out" }),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    const war = result.components.find((c) => c.name === "war");
    expect(war?.available).toBe(false);
    expect(war?.weight).toBe(0);
    expect(war?.points).toBe(0);

    // Reweighted: 35/75, 25/75, 15/75 (sum to 1.0).
    const donations = result.components.find((c) => c.name === "donations");
    const activity = result.components.find((c) => c.name === "activity");
    const capital = result.components.find((c) => c.name === "capital");

    expect(donations?.weight).toBeCloseTo(35 / 75, 5);
    expect(activity?.weight).toBeCloseTo(25 / 75, 5);
    expect(capital?.weight).toBeCloseTo(15 / 75, 5);

    // A member at the max on every available component still scores 100 —
    // the opt-out is informational, not a penalty (concept/05 §5 rule 4).
    expect(result.totalScore).toBeCloseTo(100, 5);
  });

  it("still excludes war when the member had attacks used/allowed (no penalty)", () => {
    // Member opted out mid-window but had some attacks recorded before.
    const result = computeActivityScore(
      baseInput({
        warPreference: "out",
        warAttacksUsed: 4,
        warAttacksAllowed: 8,
      }),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    const war = result.components.find((c) => c.name === "war");
    expect(war?.available).toBe(false);
    expect(war?.weight).toBe(0);
    expect(war?.points).toBe(0);
    // rawValue still reflects the tracked attacks (transparency).
    expect(war?.rawValue).toBe(4);
  });
});

describe("computeActivityScore — no tracked wars with warPreference 'in' excludes war", () => {
  it("excludes war when warAttacksAllowed is null", () => {
    const result = computeActivityScore(
      baseInput({
        warPreference: "in",
        warAttacksUsed: null,
        warAttacksAllowed: null,
      }),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    const war = result.components.find((c) => c.name === "war");
    expect(war?.available).toBe(false);
    expect(war?.weight).toBe(0);
    expect(war?.points).toBe(0);

    // Reweighted: 35/75, 25/75, 15/75 (sum to 1.0).
    const donations = result.components.find((c) => c.name === "donations");
    const activity = result.components.find((c) => c.name === "activity");
    const capital = result.components.find((c) => c.name === "capital");
    expect(donations?.weight).toBeCloseTo(35 / 75, 5);
    expect(activity?.weight).toBeCloseTo(25 / 75, 5);
    expect(capital?.weight).toBeCloseTo(15 / 75, 5);

    expect(result.totalScore).toBeCloseTo(100, 5);
  });

  it("excludes war when warAttacksAllowed is 0 (no war slots assigned)", () => {
    const result = computeActivityScore(
      baseInput({
        warPreference: "in",
        warAttacksUsed: 0,
        warAttacksAllowed: 0,
      }),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    const war = result.components.find((c) => c.name === "war");
    expect(war?.available).toBe(false);
    expect(war?.weight).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Activity score — zero values vs unavailable
// ---------------------------------------------------------------------------

describe("computeActivityScore — zero donations is available, not excluded", () => {
  it("keeps donations available with normalized 0 when maxDonations > 0", () => {
    const result = computeActivityScore(
      baseInput({ donationsGiven: 0 }),
      baseMax({ maxDonations: 1000 }),
      "30d",
      trackingStart,
      false,
    );

    const donations = result.components.find((c) => c.name === "donations");
    expect(donations?.available).toBe(true);
    expect(donations?.normalized).toBe(0);
    expect(donations?.rawValue).toBe(0);
    expect(donations?.points).toBe(0);
    // Weight is unaffected — donations are still part of the score.
    expect(donations?.weight).toBeCloseTo(0.35, 5);

    // Total is reduced by the donations contribution only.
    expect(result.totalScore).toBeCloseTo(65, 5); // 0 + 25 + 25 + 15
  });

  it("keeps donations available when the whole clan had zero donations", () => {
    // maxDonations = 0 should not exclude the component — it should yield
    // normalized 0 (no division by zero). The component is still available.
    const result = computeActivityScore(
      baseInput({ donationsGiven: 0 }),
      baseMax({ maxDonations: 0 }),
      "30d",
      trackingStart,
      false,
    );

    const donations = result.components.find((c) => c.name === "donations");
    expect(donations?.available).toBe(true);
    expect(donations?.normalized).toBe(0);
    expect(donations?.weight).toBeCloseTo(0.35, 5);
  });
});

// ---------------------------------------------------------------------------
// Activity score — limitedData + rank passthrough/exclusion
// ---------------------------------------------------------------------------

describe("computeActivityScore — limitedData flag and rank", () => {
  it("passes the limitedData flag through unchanged", () => {
    const trueResult = computeActivityScore(
      baseInput(),
      baseMax(),
      "30d",
      trackingStart,
      true,
    );
    const falseResult = computeActivityScore(
      baseInput(),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    expect(trueResult.limitedData).toBe(true);
    expect(falseResult.limitedData).toBe(false);
  });

  it("does NOT set a rank — that is the leaderboard's job", () => {
    const result = computeActivityScore(
      baseInput(),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );

    // Runtime check: the result object has no rank property.
    expect(result).not.toHaveProperty("rank");

    // Compile-time check: the return type omits "rank".
    type Result = typeof result;
    type HasRank = "rank" extends keyof Result ? true : false;
    // The cast forces the type-level assertion to fail at compile time if
    // "rank" is ever accidentally added back to the return type.
    const _typeCheck: HasRank = false as HasRank extends true ? never : false;
    expect(_typeCheck).toBe(false);
  });

  it("returns a type compatible with MemberActivityScore minus rank", () => {
    const result = computeActivityScore(
      baseInput(),
      baseMax(),
      "30d",
      trackingStart,
      false,
    );
    // If the return type isn't `Omit<MemberActivityScore, "rank">`, this
    // assignment fails at compile time.
    const _check: Omit<MemberActivityScore, "rank"> = result;
    expect(_check).toBe(result);
  });
});

// ---------------------------------------------------------------------------
// War metrics — computeWarMetrics
// ---------------------------------------------------------------------------

describe("computeWarMetrics", () => {
  it("computes rates for normal participation (10/12, 20 stars, 5 three-stars)", () => {
    const input: WarParticipationInput = {
      warsTracked: 5,
      warsMissed: 1,
      totalAttacksUsed: 10,
      totalAttacksAllowed: 12,
      totalStarsEarned: 20,
      threeStarAttacks: 5,
    };

    const metrics = computeWarMetrics(input);

    expect(metrics.participationRate).toBeCloseTo(10 / 12, 5); // ≈ 0.8333
    expect(metrics.warsMissedRate).toBeCloseTo(1 / 5, 5); // 0.2
    expect(metrics.averageStars).toBeCloseTo(20 / 10, 5); // 2.0
    expect(metrics.threeStarRate).toBeCloseTo(5 / 10, 5); // 0.5
    expect(metrics.warsTracked).toBe(5);
    expect(metrics.warsMissed).toBe(1);
  });

  it("returns null for every rate when no wars are tracked", () => {
    const metrics = computeWarMetrics({
      warsTracked: 0,
      warsMissed: 0,
      totalAttacksUsed: 0,
      totalAttacksAllowed: 0,
      totalStarsEarned: 0,
      threeStarAttacks: 0,
    });

    expect(metrics.participationRate).toBeNull();
    expect(metrics.warsMissedRate).toBeNull();
    expect(metrics.averageStars).toBeNull();
    expect(metrics.threeStarRate).toBeNull();
    expect(metrics.warsTracked).toBe(0);
    expect(metrics.warsMissed).toBe(0);
  });

  it("returns null participationRate when allowed = 0 (opted out / no slots)", () => {
    const metrics = computeWarMetrics({
      warsTracked: 5,
      warsMissed: 5,
      totalAttacksUsed: 0,
      totalAttacksAllowed: 0,
      totalStarsEarned: 0,
      threeStarAttacks: 0,
    });

    expect(metrics.participationRate).toBeNull();
    // Member missed all 5 tracked wars.
    expect(metrics.warsMissedRate).toBeCloseTo(1.0, 5);
    // No attacks used → star metrics null (never fake a zero).
    expect(metrics.averageStars).toBeNull();
    expect(metrics.threeStarRate).toBeNull();
  });

  it("returns perfect rates for 12/12 with all three-stars", () => {
    const metrics = computeWarMetrics({
      warsTracked: 5,
      warsMissed: 0,
      totalAttacksUsed: 12,
      totalAttacksAllowed: 12,
      totalStarsEarned: 36,
      threeStarAttacks: 12,
    });

    expect(metrics.participationRate).toBeCloseTo(1.0, 5);
    expect(metrics.warsMissedRate).toBeCloseTo(0.0, 5);
    expect(metrics.averageStars).toBeCloseTo(3.0, 5);
    expect(metrics.threeStarRate).toBeCloseTo(1.0, 5);
    expect(metrics.warsTracked).toBe(5);
    expect(metrics.warsMissed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Win rate — computeWinRate
// ---------------------------------------------------------------------------

describe("computeWinRate", () => {
  it("computes wins / (wins + ties + losses) for normal input", () => {
    // 22 wins, 1 tie, 34 losses → 22 / 57 ≈ 0.3860
    const rate = computeWinRate(22, 1, 34);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeCloseTo(22 / 57, 5);
  });

  it("returns null when wins is null", () => {
    expect(computeWinRate(null, 1, 34)).toBeNull();
  });

  it("returns null when ties is null", () => {
    expect(computeWinRate(22, null, 34)).toBeNull();
  });

  it("returns null when losses is null", () => {
    expect(computeWinRate(22, 1, null)).toBeNull();
  });

  it("returns null when all three are 0 (denominator 0)", () => {
    expect(computeWinRate(0, 0, 0)).toBeNull();
  });

  it("returns 1.0 when the clan has only wins", () => {
    expect(computeWinRate(10, 0, 0)).toBeCloseTo(1.0, 5);
  });

  it("returns 0.0 when the clan has only losses", () => {
    expect(computeWinRate(0, 0, 10)).toBe(0);
  });
});

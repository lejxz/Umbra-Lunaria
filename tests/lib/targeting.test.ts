import { describe, it, expect } from "vitest";
import {
  bucketThDelta,
  computeTargeting,
  type TargetingAttack,
} from "@/lib/scoring/targeting";

/**
 * Tests for lib/scoring/targeting.ts (Phase 3.3 — attack targeting
 * intelligence, implementation-plan §3.3 / assessment F9).
 *
 *   - bucketThDelta: the THΔ classification (defender TH − attacker TH),
 *     clamped to the five plan buckets {−2, −1, 0, +1, +2+}.
 *   - computeTargeting: clan-wide aggregates (always all five buckets) +
 *     per-member summaries incl. best/worst Δ with the ≥2-attack rule.
 */

function attack(overrides: Partial<TargetingAttack> & { attackerTag: string }): TargetingAttack {
  return {
    warId: 1,
    attackerTownhallLevel: 14,
    defenderTownhallLevel: 14,
    stars: 3,
    destructionPercentage: 100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// bucketThDelta
// ---------------------------------------------------------------------------

describe("bucketThDelta", () => {
  it("classifies even matchups as 0", () => {
    expect(bucketThDelta(14, 14)).toBe("0");
  });

  it("positive delta = attacking up", () => {
    expect(bucketThDelta(13, 14)).toBe("+1");
    expect(bucketThDelta(12, 14)).toBe("+2+");
    expect(bucketThDelta(10, 17)).toBe("+2+"); // clamped at the top
  });

  it("negative delta = attacking down", () => {
    expect(bucketThDelta(15, 14)).toBe("-1");
    expect(bucketThDelta(16, 14)).toBe("-2");
    expect(bucketThDelta(17, 10)).toBe("-2"); // clamped at the bottom
  });
});

// ---------------------------------------------------------------------------
// computeTargeting
// ---------------------------------------------------------------------------

describe("computeTargeting", () => {
  it("returns all five buckets in display order, even when empty", () => {
    const result = computeTargeting([]);
    expect(result.aggregate.map((b) => b.delta)).toEqual(["-2", "-1", "0", "+1", "+2+"]);
    expect(result.totalAttacks).toBe(0);
    expect(result.members).toEqual([]);
  });

  it("aggregates stars, destruction, and 3★ rate per bucket", () => {
    const result = computeTargeting([
      attack({ attackerTag: "#A", attackerTownhallLevel: 14, defenderTownhallLevel: 14, stars: 3, destructionPercentage: 100 }),
      attack({ attackerTag: "#A", attackerTownhallLevel: 14, defenderTownhallLevel: 14, stars: 2, destructionPercentage: 80 }),
      attack({ attackerTag: "#A", attackerTownhallLevel: 14, defenderTownhallLevel: 15, stars: 1, destructionPercentage: 45 }),
    ]);

    const even = result.aggregate.find((b) => b.delta === "0");
    expect(even?.attacks).toBe(2);
    expect(even?.avgStars).toBe(2.5);
    expect(even?.avgDestruction).toBe(90);
    expect(even?.threeStarRate).toBe(0.5);

    const up1 = result.aggregate.find((b) => b.delta === "+1");
    expect(up1?.attacks).toBe(1);
    expect(up1?.avgStars).toBe(1);
    expect(up1?.threeStarRate).toBe(0);
  });

  it("keeps zero-attack buckets present with null averages", () => {
    const result = computeTargeting([
      attack({ attackerTag: "#A", defenderTownhallLevel: 14 }),
    ]);
    const down2 = result.aggregate.find((b) => b.delta === "-2");
    expect(down2?.attacks).toBe(0);
    expect(down2?.avgStars).toBeNull();
    expect(down2?.threeStarRate).toBeNull();
  });

  it("summarizes per member and sorts by attacks descending", () => {
    const result = computeTargeting([
      attack({ attackerTag: "#A", stars: 3 }),
      attack({ attackerTag: "#A", stars: 3, defenderTownhallLevel: 16 }),
      attack({ attackerTag: "#A", stars: 2, defenderTownhallLevel: 12 }),
      attack({ attackerTag: "#B", stars: 1 }),
      attack({ attackerTag: "#B", stars: 0, destructionPercentage: 20 }),
    ]);

    expect(result.members.map((m) => m.playerTag)).toEqual(["#A", "#B"]);
    const a = result.members[0]!;
    expect(a.attacks).toBe(3);
    expect(a.avgStars).toBeCloseTo(8 / 3, 5);

    const b = result.members[1]!;
    expect(b.attacks).toBe(2);
    expect(b.avgStars).toBe(0.5);
  });

  it("breaks attack-count ties by tag for deterministic order", () => {
    const result = computeTargeting([
      attack({ attackerTag: "#Z" }),
      attack({ attackerTag: "#A" }),
    ]);
    expect(result.members.map((m) => m.playerTag)).toEqual(["#A", "#Z"]);
  });

  it("best/worst Δ require at least 2 attacks in a bucket", () => {
    // #A has one brilliant up-attack (3★) and two mediocre even attacks —
    // the single up-attack must NOT become bestDelta.
    const result = computeTargeting([
      attack({ attackerTag: "#A", attackerTownhallLevel: 14, defenderTownhallLevel: 16, stars: 3, destructionPercentage: 98 }),
      attack({ attackerTag: "#A", attackerTownhallLevel: 14, defenderTownhallLevel: 14, stars: 1, destructionPercentage: 50 }),
      attack({ attackerTag: "#A", attackerTownhallLevel: 14, defenderTownhallLevel: 14, stars: 1, destructionPercentage: 48 }),
    ]);
    const a = result.members[0]!;
    expect(a.bestDelta).toBe("0"); // avg 1.0 from 2 attacks beats nothing else
    expect(a.worstDelta).toBe("0"); // same bucket — also the worst
  });

  it("identifies best and worst Δ buckets when both qualify", () => {
    const result = computeTargeting([
      // Two strong even attacks → best Δ 0 (avg 3)
      attack({ attackerTag: "#A", defenderTownhallLevel: 14, stars: 3 }),
      attack({ attackerTag: "#A", defenderTownhallLevel: 14, stars: 3 }),
      // Two weak up attacks → worst Δ +1 (avg 0.5)
      attack({ attackerTag: "#A", defenderTownhallLevel: 15, stars: 1 }),
      attack({ attackerTag: "#A", defenderTownhallLevel: 15, stars: 0, destructionPercentage: 30 }),
    ]);
    const a = result.members[0]!;
    expect(a.bestDelta).toBe("0");
    expect(a.worstDelta).toBe("+1");
  });

  it("members with all attacks in one bucket get bestDelta = worstDelta = that bucket", () => {
    const result = computeTargeting([
      attack({ attackerTag: "#A", defenderTownhallLevel: 15, stars: 2 }),
      attack({ attackerTag: "#A", defenderTownhallLevel: 15, stars: 1 }),
    ]);
    const a = result.members[0]!;
    expect(a.bestDelta).toBe("+1");
    expect(a.worstDelta).toBe("+1");
  });
});

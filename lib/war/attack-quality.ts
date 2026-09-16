import type { WarAttackQualityPoint } from "@/lib/view-models/dashboard";

/**
 * Attack-quality math for the war-analytics row's star-distribution card —
 * pure functions so the windowing and rates are unit-testable without a DB.
 *
 * One point per ended own-clan war with recorded attack detail (backfilled
 * warlog wars have none). The card slices these points client-side — same
 * contract as the war-performance panel — so 10 / 20 / all window switches
 * cost zero fetches and the delta-vs-previous-window read falls out of data
 * we already hold.
 */

export interface AttackQualitySummary {
  /** Wars contributing attack rows to the window. */
  wars: number;
  /** Attacks recorded across those wars. */
  attacks: number;
  /** Per-tier counts — the star distribution itself. */
  threeStar: number;
  twoStar: number;
  oneStar: number;
  zeroStar: number;
  /** Mean stars per attack, 0–3 with two decimals. Null on zero attacks. */
  avgStars: number | null;
  /** Mean destruction % per attack. Null on zero attacks. */
  avgDestruction: number | null;
  /** 3★ share of attacks, 0–100 with one decimal. Null on zero attacks. */
  threeStarRate: number | null;
}

/** Distribution + averages for a window of per-war attack-quality points. */
export function summarizeAttackQuality(
  points: WarAttackQualityPoint[],
): AttackQualitySummary {
  let threeStar = 0;
  let twoStar = 0;
  let oneStar = 0;
  let zeroStar = 0;
  let starsSum = 0;
  let destructionSum = 0;
  for (const p of points) {
    threeStar += p.threeStar;
    twoStar += p.twoStar;
    oneStar += p.oneStar;
    zeroStar += p.zeroStar;
    starsSum += p.starsSum;
    destructionSum += p.destructionSum;
  }
  const attacks = threeStar + twoStar + oneStar + zeroStar;
  return {
    wars: points.length,
    attacks,
    threeStar,
    twoStar,
    oneStar,
    zeroStar,
    avgStars: attacks > 0 ? Math.round((starsSum / attacks) * 100) / 100 : null,
    avgDestruction:
      attacks > 0 ? Math.round(destructionSum / attacks) : null,
    threeStarRate:
      attacks > 0 ? Math.round((threeStar / attacks) * 1000) / 10 : null,
  };
}

/**
 * 3★-rate change vs the immediately preceding window of the same size —
 * "are our attacks getting cleaner?" in one number. Points arrive
 * oldest-first; the last `size` are the current window, the `size` before
 * those are the previous one. Null when there aren't enough wars for both
 * windows or the previous window has no attacks (delta is meaningless).
 */
export function threeStarRateDelta(
  points: WarAttackQualityPoint[],
  size: number,
): number | null {
  if (size <= 0 || points.length < size * 2) return null;
  const current = summarizeAttackQuality(points.slice(-size));
  const previous = summarizeAttackQuality(points.slice(-size * 2, -size));
  if (current.attacks === 0 || previous.attacks === 0) return null;
  if (current.threeStarRate == null || previous.threeStarRate == null) {
    return null;
  }
  return Math.round((current.threeStarRate - previous.threeStarRate) * 10) / 10;
}

/** Tier display order of the star distribution: best → worst. */
export const STAR_TIERS = ["3", "2", "1", "0"] as const;

export type StarTier = (typeof STAR_TIERS)[number];

/** Tier a star count belongs to — `>= 3` folds into the 3★ tier. */
export function tierOf(stars: number): StarTier {
  if (stars >= 3) return "3";
  if (stars === 2) return "2";
  if (stars === 1) return "1";
  return "0";
}

export interface AttackTierRow {
  tier: StarTier;
  /** Attacks in this tier across the window. */
  count: number;
  /** Share of all attacks, 0–100 rounded. */
  share: number;
  /** Mean destruction % of this tier's attacks — how close the misses were.
   *  Null when the tier has no attacks. */
  avgDestruction: number | null;
}

/**
 * Per-tier display rows for the star-distribution card, ordered best →
 * worst. Unlike the old donut-only view, these carry the exact counts and
 * each tier's average destruction so the numbers read without hovering.
 */
export function attackTierRows(
  points: WarAttackQualityPoint[],
): AttackTierRow[] {
  const summary = summarizeAttackQuality(points);
  const counts: Record<StarTier, number> = {
    "3": summary.threeStar,
    "2": summary.twoStar,
    "1": summary.oneStar,
    "0": summary.zeroStar,
  };
  const destSums: Record<StarTier, number> = { "3": 0, "2": 0, "1": 0, "0": 0 };
  for (const p of points) {
    destSums["3"] += p.destSumThreeStar;
    destSums["2"] += p.destSumTwoStar;
    destSums["1"] += p.destSumOneStar;
    destSums["0"] += p.destSumZeroStar;
  }
  return STAR_TIERS.map((tier) => {
    const count = counts[tier];
    const destSum = destSums[tier];
    return {
      tier,
      count,
      share:
        summary.attacks > 0 ? Math.round((count / summary.attacks) * 100) : 0,
      avgDestruction: count > 0 ? Math.round(destSum / count) : null,
    };
  });
}

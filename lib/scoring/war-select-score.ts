/**
 * War auto-select composite score (concept/09 §"Composite score").
 *
 * Pure scoring function for the planner's auto-select recommendation. This is
 * a DISTINCT measure from the dashboard's Member Activity Score — the two must
 * never be presented as interchangeable (concept/09 §"Relationship to Member
 * Activity Score").
 *
 * Component weights (default):
 *
 *   | Factor                  | Weight | Source                                         |
 *   |-------------------------|-------:|------------------------------------------------|
 *   | Recent activity         |   30%  | Trailing 14-day activity evidence (0..1).      |
 *   | War attack participation|   25%  | Attacks used ÷ attacks allowed.                |
 *   | Average stars per attack|   20%  | Tracked war attacks (0..3 → 0..1).             |
 *   | Three-star rate         |   15%  | Tracked war attacks (0..1).                    |
 *   | Account readiness       |   10%  | 1 − rushed_percent / 100.                      |
 *
 * Rules (concept/09 §"Confidence and explanation"):
 *   1. Component values normalize to 0..1 before weighting.
 *   2. If a required component is unavailable, the suggestion shows incomplete
 *      data rather than silently assigning a false zero. Unavailable components
 *      are excluded and the available weights are RE-NORMALIZED to 1.0 (same
 *      reweighting rule as the dashboard activity score).
 *   3. Town Hall level is used for roster balance/matchup, NOT folded into the
 *      quality score.
 *   4. Every suggestion exposes the factor breakdown for transparency.
 *
 * Pure: no database access, no React. Tested in tests/lib/war-select-score.test.ts.
 */

/**
 * Inputs for one member. All numeric inputs are raw observed values; the
 * function handles normalization and availability.
 */
export interface WarSelectInput {
  playerTag: string;
  name: string;
  townHallLevel: number | null;
  warPreference: "in" | "out" | null;
  /** Trailing 14-day activity evidence rate (0..1). null when no data. */
  recentActivityRate: number | null;
  /** Total attacks used across tracked wars. null when no tracked wars. */
  warAttacksUsed: number | null;
  /** Total attacks allowed across tracked wars. null when no tracked wars. */
  warAttacksAllowed: number | null;
  /** Total stars earned across tracked war attacks. null when no tracked wars. */
  warStarsEarned: number | null;
  /** Count of 3-star attacks across tracked wars. null when no tracked wars. */
  threeStarAttacks: number | null;
  /** Rushed percent from lib/scoring/rushed.ts (0..100). null when no cap data. */
  rushedPercent: number | null;
  /** Number of wars this member has been tracked in. */
  warsTracked: number;
}

/** One component of the composite score, for the explainable breakdown. */
export interface WarSelectComponent {
  name:
    | "activity"
    | "participation"
    | "averageStars"
    | "threeStarRate"
    | "accountReadiness";
  /** The raw input value (rate, count, stars, etc.). */
  rawValue: number | null;
  /** Normalized to 0..1. 0 when unavailable. */
  normalized: number;
  /** Post-re-normalization weight (0..1). 0 when unavailable. */
  weight: number;
  /** normalized × weight × 100. */
  points: number;
  available: boolean;
}

export interface WarSelectScore {
  playerTag: string;
  name: string;
  townHallLevel: number | null;
  /** 0..100 weighted score. 0 when no components are available. */
  total: number;
  components: WarSelectComponent[];
  /** True when warsTracked < the confidence threshold (passed by caller). */
  limitedData: boolean;
  /** True when warPreference === "out" — excluded from auto-suggestions. */
  optedOut: boolean;
}

// Default raw weights per concept/09 §"Composite score".
const RAW_WEIGHTS = {
  activity: 0.3,
  participation: 0.25,
  averageStars: 0.2,
  threeStarRate: 0.15,
  accountReadiness: 0.1,
} as const;

const WEIGHT_SUM_TOLERANCE = 0.0001;

/**
 * Compute the war auto-select score for a single member.
 *
 * @param input — raw per-member data
 * @param minWarsForConfidentRanking — threshold from clan config; below this
 *   the result carries a `limitedData: true` flag.
 *
 * Re-normalization: when a component is unavailable (null input), its weight
 * is set to 0 and the remaining weights are scaled up to sum to 1.0. This
 * matches the dashboard activity score's rule #2.
 */
export function computeWarSelectScore(
  input: WarSelectInput,
  minWarsForConfidentRanking: number,
): WarSelectScore {
  // ── Availability ─────────────────────────────────────────────────────────
  const activityAvailable =
    input.recentActivityRate !== null && input.recentActivityRate >= 0;
  const hasWarData =
    input.warAttacksUsed !== null &&
    input.warAttacksAllowed !== null &&
    input.warAttacksAllowed > 0;
  const participationAvailable = hasWarData;
  const averageStarsAvailable =
    hasWarData &&
    input.warStarsEarned !== null &&
    input.warAttacksUsed !== null &&
    input.warAttacksUsed > 0;
  const threeStarRateAvailable =
    hasWarData &&
    input.threeStarAttacks !== null &&
    input.warAttacksUsed !== null &&
    input.warAttacksUsed > 0;
  const accountReadinessAvailable =
    input.rushedPercent !== null && input.rushedPercent >= 0;

  // ── Normalized values (0..1) ─────────────────────────────────────────────
  const activityNormalized = activityAvailable
    ? clamp01(input.recentActivityRate!)
    : 0;
  const participationNormalized = participationAvailable
    ? clamp01(input.warAttacksUsed! / input.warAttacksAllowed!)
    : 0;
  // Average stars: 0..3 → 0..1 by dividing by 3.
  const averageStarsNormalized = averageStarsAvailable
    ? clamp01((input.warStarsEarned! / input.warAttacksUsed!) / 3)
    : 0;
  const threeStarRateNormalized = threeStarRateAvailable
    ? clamp01(input.threeStarAttacks! / input.warAttacksUsed!)
    : 0;
  // Account readiness: 1 − rushedPercent/100. Higher rushed = lower readiness.
  const accountReadinessNormalized = accountReadinessAvailable
    ? clamp01(1 - input.rushedPercent! / 100)
    : 0;

  // ── Re-normalization weights ─────────────────────────────────────────────
  const availableSum =
    (activityAvailable ? RAW_WEIGHTS.activity : 0) +
    (participationAvailable ? RAW_WEIGHTS.participation : 0) +
    (averageStarsAvailable ? RAW_WEIGHTS.averageStars : 0) +
    (threeStarRateAvailable ? RAW_WEIGHTS.threeStarRate : 0) +
    (accountReadinessAvailable ? RAW_WEIGHTS.accountReadiness : 0);
  const scale = availableSum > WEIGHT_SUM_TOLERANCE ? 1 / availableSum : 0;

  const activityWeight = activityAvailable ? RAW_WEIGHTS.activity * scale : 0;
  const participationWeight = participationAvailable
    ? RAW_WEIGHTS.participation * scale
    : 0;
  const averageStarsWeight = averageStarsAvailable
    ? RAW_WEIGHTS.averageStars * scale
    : 0;
  const threeStarRateWeight = threeStarRateAvailable
    ? RAW_WEIGHTS.threeStarRate * scale
    : 0;
  const accountReadinessWeight = accountReadinessAvailable
    ? RAW_WEIGHTS.accountReadiness * scale
    : 0;

  // ── Points ──────────────────────────────────────────────────────────────
  const components: WarSelectComponent[] = [
    {
      name: "activity",
      rawValue: input.recentActivityRate,
      normalized: activityNormalized,
      weight: activityWeight,
      points: activityNormalized * activityWeight * 100,
      available: activityAvailable,
    },
    {
      name: "participation",
      rawValue: participationAvailable ? input.warAttacksUsed! : null,
      normalized: participationNormalized,
      weight: participationWeight,
      points: participationNormalized * participationWeight * 100,
      available: participationAvailable,
    },
    {
      name: "averageStars",
      rawValue: averageStarsAvailable
        ? input.warStarsEarned! / input.warAttacksUsed!
        : null,
      normalized: averageStarsNormalized,
      weight: averageStarsWeight,
      points: averageStarsNormalized * averageStarsWeight * 100,
      available: averageStarsAvailable,
    },
    {
      name: "threeStarRate",
      rawValue: threeStarRateAvailable
        ? input.threeStarAttacks! / input.warAttacksUsed!
        : null,
      normalized: threeStarRateNormalized,
      weight: threeStarRateWeight,
      points: threeStarRateNormalized * threeStarRateWeight * 100,
      available: threeStarRateAvailable,
    },
    {
      name: "accountReadiness",
      rawValue: accountReadinessAvailable ? input.rushedPercent! : null,
      normalized: accountReadinessNormalized,
      weight: accountReadinessWeight,
      points: accountReadinessNormalized * accountReadinessWeight * 100,
      available: accountReadinessAvailable,
    },
  ];

  const total = components.reduce((acc, c) => acc + c.points, 0);

  return {
    playerTag: input.playerTag,
    name: input.name,
    townHallLevel: input.townHallLevel,
    total,
    components,
    limitedData: input.warsTracked < minWarsForConfidentRanking,
    optedOut: input.warPreference === "out",
  };
}

/** Clamp a number to the 0..1 range. */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

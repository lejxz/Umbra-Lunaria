/**
 * Member Activity Score.
 *
 * Pure scoring function for the Member Activity Score leaderboard described
 * in concept/05-dashboard.md §5. The score is a transparent, rolling
 * (24h / 7d / 30d) measure of observed clan support — not a claim about
 * player skill or worth.
 *
 * Initial components total 100 points:
 *
 *   | Component             | Weight | Source                                         |
 *   |-----------------------|-------:|------------------------------------------------|
 *   | Donations given       |     35 | Reset-aware member donation totals             |
 *   | Observed activity     |     25 | Active-day/interval rate from snapshots       |
 *   | War commitment        |     25 | Attacks used ÷ attacks allowed in tracked wars|
 *   | Capital contribution  |     15 | Completed raid-season contribution             |
 *
 * Rules (concept/05-dashboard.md §5):
 *
 *   1. Donations received are shown as a separate leaderboard metric; they
 *      do NOT earn contribution points.
 *   2. A temporarily unavailable component is EXCLUDED and the available
 *      component weights are RE-NORMALIZED rather than scored as zero.
 *   3. Members marked `warPreference = "out"` are NOT penalized by the war
 *      component — exclude the war component and re-normalize.
 *   4. Each score has a component breakdown showing rawValue, normalized
 *      (0..1), weight, points, and available flag.
 *
 * The function is pure: no database access, no React. It takes data and
 * returns a score, making it independently testable. Rank assignment is the
 * caller's responsibility (the leaderboard sorts entries and assigns rank),
 * so it is omitted from the return type.
 */
import type {
  ActivityScoreComponent,
  ClanBadgeUrls,
  MemberActivityScore,
  ScoreWindow,
} from "@/lib/view-models/dashboard";

export interface ScoreInput {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  league: { name: string; iconUrls?: ClanBadgeUrls } | null;
  leagueTier: { name: string; iconUrls?: ClanBadgeUrls } | null;
  warPreference: "in" | "out" | null;
  // Per-member source values for the scoring window:
  donationsGiven: number; // reset-aware total for the window
  observedActivityRate: number; // 0..1 — fraction of poll intervals with activity
  warAttacksUsed: number | null; // null = no tracked wars or opted out
  warAttacksAllowed: number | null;
  capitalContribution: number | null; // null = no completed raid seasons tracked
}

export interface ClanMaxValues {
  maxDonations: number; // max donationsGiven across the clan for normalization
  maxActivityRate: number; // max observedActivityRate across the clan (usually 1.0)
  maxCapitalContribution: number; // max capitalContribution across the clan
}

// Initial weights per concept/05-dashboard.md §5. These are the "raw" weights
// before re-normalization. Donations and activity are always available (their
// source values are non-null numbers), so the re-normalization base is
// always at least 60.
const RAW_WEIGHTS = {
  donations: 35,
  activity: 25,
  war: 25,
  capital: 15,
} as const;

/**
 * Compute the Member Activity Score for a single member.
 *
 * Normalization (per concept/05-dashboard.md §5 and the task brief):
 *
 *   - donations: normalized = maxDonations > 0 ? donationsGiven / maxDonations : 0
 *   - activity:  normalized = observedActivityRate (already 0..1)
 *   - war:       available only when warPreference !== "out" AND
 *                warAttacksAllowed !== null AND warAttacksAllowed > 0.
 *                normalized = warAttacksUsed / warAttacksAllowed
 *   - capital:   available when capitalContribution !== null.
 *                normalized = capitalContribution / maxCapitalContribution
 *                (0 when maxCapitalContribution <= 0)
 *
 * Reweighting: after determining which components are available, scale their
 * raw weights to sum to 1.0. Unavailable components get weight 0 and points 0
 * (still emitted in the breakdown with `available: false` for transparency).
 *
 * totalScore = sum of (normalized × reweightedWeight × 100) = sum of points.
 */
export function computeActivityScore(
  input: ScoreInput,
  clanMaxValues: ClanMaxValues,
  window: ScoreWindow,
  trackingStart: Date | null,
  limitedData: boolean,
): Omit<MemberActivityScore, "rank"> {
  // --- Availability -------------------------------------------------------
  // Donations and activity are always available — their inputs are non-null.
  // War is unavailable when opted out OR no tracked war data exists.
  // Capital is unavailable when no completed raid seasons are tracked.
  const warAvailable =
    input.warPreference !== "out" &&
    input.warAttacksAllowed !== null &&
    input.warAttacksAllowed > 0;
  const capitalAvailable = input.capitalContribution !== null;

  // --- Normalized values (0..1) ------------------------------------------
  const donationsNormalized =
    clanMaxValues.maxDonations > 0
      ? input.donationsGiven / clanMaxValues.maxDonations
      : 0;
  // Activity is already normalized to 0..1 by the caller; maxActivityRate
  // is retained in the interface for symmetry and future use.
  const activityNormalized = input.observedActivityRate;
  const warNormalized =
    warAvailable &&
    input.warAttacksUsed !== null &&
    input.warAttacksAllowed !== null
      ? input.warAttacksUsed / input.warAttacksAllowed
      : 0;
  const capitalNormalized =
    capitalAvailable && clanMaxValues.maxCapitalContribution > 0
      ? (input.capitalContribution ?? 0) / clanMaxValues.maxCapitalContribution
      : 0;

  // --- Reweighting --------------------------------------------------------
  // Sum of raw weights for available components, then scale to 1.0.
  const availableSum =
    RAW_WEIGHTS.donations +
    RAW_WEIGHTS.activity +
    (warAvailable ? RAW_WEIGHTS.war : 0) +
    (capitalAvailable ? RAW_WEIGHTS.capital : 0);
  // Donations + activity are always available (raw sum 60), so availableSum
  // is always > 0. The guard is for defensive clarity.
  const scale = availableSum > 0 ? 1 / availableSum : 0;

  const donationsWeight = RAW_WEIGHTS.donations * scale;
  const activityWeight = RAW_WEIGHTS.activity * scale;
  const warWeight = warAvailable ? RAW_WEIGHTS.war * scale : 0;
  const capitalWeight = capitalAvailable ? RAW_WEIGHTS.capital * scale : 0;

  // --- Points -------------------------------------------------------------
  const donationsPoints = donationsNormalized * donationsWeight * 100;
  const activityPoints = activityNormalized * activityWeight * 100;
  const warPoints = warNormalized * warWeight * 100;
  const capitalPoints = capitalNormalized * capitalWeight * 100;

  const components: ActivityScoreComponent[] = [
    {
      name: "donations",
      rawValue: input.donationsGiven,
      normalized: donationsNormalized,
      weight: donationsWeight,
      points: donationsPoints,
      available: true,
    },
    {
      name: "activity",
      rawValue: input.observedActivityRate,
      normalized: activityNormalized,
      weight: activityWeight,
      points: activityPoints,
      available: true,
    },
    {
      name: "war",
      rawValue: input.warAttacksUsed ?? 0,
      normalized: warNormalized,
      weight: warWeight,
      points: warPoints,
      available: warAvailable,
    },
    {
      name: "capital",
      rawValue: input.capitalContribution ?? 0,
      normalized: capitalNormalized,
      weight: capitalWeight,
      points: capitalPoints,
      available: capitalAvailable,
    },
  ];

  const totalScore =
    donationsPoints + activityPoints + warPoints + capitalPoints;

  return {
    playerTag: input.playerTag,
    name: input.name,
    role: input.role,
    townHallLevel: input.townHallLevel,
    league: input.league,
    leagueTier: input.leagueTier,
    totalScore,
    components,
    window,
    limitedData,
    trackingStart,
  };
}

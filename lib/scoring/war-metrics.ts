/**
 * War participation metrics.
 *
 * Pure functions used by the dashboard and the member detail sheet's
 * "War participation — tracked history" section (concept/06-members.md §4):
 *
 *   - participationRate: attacksUsed / attacksAllowed  (null when allowed = 0)
 *   - warsMissedRate:    warsMissed / warsTracked      (null when warsTracked = 0)
 *   - averageStars:      totalStarsEarned / totalAttacksUsed (null when used = 0)
 *   - threeStarRate:     threeStarAttacks / totalAttacksUsed (null when used = 0)
 *
 * Also exports `computeWinRate` for the clan all-time war record
 * (concept/05-dashboard.md §2): wins / (wins + ties + losses), or null when
 * any value is null or the denominator is 0.
 *
 * All functions are pure: no DB access, no React. They take numbers and
 * return numbers (or null), making them independently testable.
 */

export interface WarParticipationInput {
  warsTracked: number;
  warsMissed: number; // wars where the member had 0 attacks
  totalAttacksUsed: number;
  totalAttacksAllowed: number;
  totalStarsEarned: number;
  threeStarAttacks: number;
}

export interface WarParticipationMetrics {
  participationRate: number | null; // attacksUsed / attacksAllowed, null when allowed=0
  warsMissedRate: number | null; // warsMissed / warsTracked, null when warsTracked=0
  averageStars: number | null; // totalStarsEarned / totalAttacksUsed, null when used=0
  threeStarRate: number | null; // threeStarAttacks / totalAttacksUsed, null when used=0
  warsTracked: number;
  warsMissed: number;
}

/**
 * Derive war-participation metrics from raw tracked totals.
 *
 * The "never fake a zero" rule (concept/00-overview.md "Product contract")
 * is enforced: any rate whose denominator is 0 is reported as `null`, not 0,
 * so the UI can render an explicit `Unavailable` state rather than a
 * misleading "0%". This matters for opted-out members (allowed = 0) and for
 * members with no tracked attacks (used = 0).
 */
export function computeWarMetrics(
  input: WarParticipationInput,
): WarParticipationMetrics {
  const participationRate =
    input.totalAttacksAllowed > 0
      ? input.totalAttacksUsed / input.totalAttacksAllowed
      : null;
  const warsMissedRate =
    input.warsTracked > 0 ? input.warsMissed / input.warsTracked : null;
  const averageStars =
    input.totalAttacksUsed > 0
      ? input.totalStarsEarned / input.totalAttacksUsed
      : null;
  const threeStarRate =
    input.totalAttacksUsed > 0
      ? input.threeStarAttacks / input.totalAttacksUsed
      : null;

  return {
    participationRate,
    warsMissedRate,
    averageStars,
    threeStarRate,
    warsTracked: input.warsTracked,
    warsMissed: input.warsMissed,
  };
}

/**
 * Compute the clan's all-time war win rate.
 *
 *   winRate = wins / (wins + ties + losses)
 *
 * Returns `null` when any of the three inputs is `null` (the API did not
 * report a value — common when the war log is private) or when the
 * denominator is 0 (no wars recorded yet). The caller renders an explicit
 * `Unavailable` state in both cases per concept/05-dashboard.md §2.
 */
export function computeWinRate(
  wins: number | null,
  ties: number | null,
  losses: number | null,
): number | null {
  if (wins === null || ties === null || losses === null) return null;
  const denominator = wins + ties + losses;
  if (denominator === 0) return null;
  return wins / denominator;
}

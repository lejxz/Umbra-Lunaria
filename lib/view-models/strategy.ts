/**
 * Strategy page view models — war roster suggestions + member review list.
 *
 * The strategy page is a pure read-only ranking. No admin, no writes.
 * Two lists:
 *   1. Suggested participants — ranked by a composite score using war
 *      history, activity score, and rushed analysis. New members are NOT
 *      penalized — they get a flag but are still ranked.
 *   2. Review needed — members who should be moderated (inactive, low
 *      participation, low activity, rushed).
 */

/** A single suggested participant. */
export interface SuggestedParticipant {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  warPreference: "in" | "out" | null;
  // War history (all-time)
  warsTracked: number;
  attacksUsed: number;
  attacksAllowed: number;
  participationRate: number | null;
  averageStars: number | null;
  threeStarRate: number | null;
  // Activity score (30-day)
  activityScore: number | null;
  // Rushed analysis
  rushedPercent: number | null;
  // Recency
  lastActiveAt: string | null; // ISO string
  isActive: boolean;
  // Derived
  isNewMember: boolean;
  compositeScore: number;
  scoreBreakdown: {
    participation: number;
    performance: number;
    activity: number;
    readiness: number;
    recency: number;
  };
}

/** A member flagged for review. */
export interface ReviewMember {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  // Reason tags
  reasons: string[];
  // Supporting data
  daysInactive: number | null;
  activityScore: number | null;
  warParticipationRate: number | null;
  rushedPercent: number | null;
  warPreference: "in" | "out" | null;
  warsTracked: number;
}

/** The full strategy page data. */
export interface StrategyPageData {
  suggested: SuggestedParticipant[];
  review: ReviewMember[];
  totalMembers: number;
  /**
   * Attack targeting intelligence (Phase 3.3 — F9): how the clan performs by
   * THΔ (defender TH − attacker TH), clan-wide and per member. Null when no
   * snapshot-backed war attacks exist yet (war-log backfilled wars carry no
   * defender detail, so they never contribute here).
   */
  targeting: TargetingIntelligence | null;
}

// ---------------------------------------------------------------------------
// Attack targeting intelligence (Phase 3.3 — F9)
// ---------------------------------------------------------------------------

export interface TargetingThBucket {
  /** "-2" (attack ≥2 down), "-1", "0", "+1", "+2+" (attack ≥2 up). */
  delta: string;
  attacks: number;
  avgStars: number | null;
  avgDestruction: number | null;
  threeStarRate: number | null;
}

export interface TargetingMember {
  playerTag: string;
  name: string;
  townHallLevel: number | null;
  attacks: number;
  avgStars: number | null;
  avgDestruction: number | null;
  threeStarRate: number | null;
  /** Δ bucket this member performs best in (avg stars; ≥2 attacks). */
  bestDelta: string | null;
  /** Δ bucket this member performs worst in (avg stars; ≥2 attacks). */
  worstDelta: string | null;
}

export interface TargetingIntelligence {
  /** Live-tracked (snapshot-backed) wars the analysis covers. */
  coveredWars: number;
  totalAttacks: number;
  aggregate: TargetingThBucket[];
  /** Sorted by attacks descending (query layer caps the list). */
  members: TargetingMember[];
}

/**
 * Typed view models for the Clan Capital page (docs/concept/08-clan-capital.md).
 *
 * Page components receive these shapes — never raw Drizzle rows or raw CoC API
 * payloads. Every value is explicitly typed so the UI can render loading,
 * empty, unavailable, and raid-pending states without guessing. See
 * docs/concept/00 "Product contract".
 */

import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";

// ---------------------------------------------------------------------------
// Current Capital overview (API facts from the cached clan row)
// ---------------------------------------------------------------------------

export interface CapitalDistrict {
  name: string;
  districtHallLevel: number;
}

export interface CapitalOverview {
  capitalHallLevel: number | null;
  capitalPoints: number | null;
  capitalLeague: { name: string } | null;
  districtCount: number | null;
  districts: CapitalDistrict[];
  lastCaptureAt: Date | null;
  // True when the clan row exists but has no districts payload (cold start
  // before the first daily batch ran). The UI shows a pending state.
  hasDistricts: boolean;
}

// ---------------------------------------------------------------------------
// District upgrade history (tracked — diffed from daily snapshots)
// ---------------------------------------------------------------------------

export interface DistrictUpgradeEvent {
  districtName: string;
  fromLevel: number;
  toLevel: number;
  observedAt: Date;
}

export interface DistrictUpgradeHistory {
  events: DistrictUpgradeEvent[];
  // Distinct district names that have at least one snapshot, for the filter.
  districtNames: string[];
  // Earliest snapshot capture time — for the "tracking began" caveat.
  trackingStart: Date | null;
  // True when only one snapshot exists per district (no diffs possible yet).
  isColdStart: boolean;
}

// ---------------------------------------------------------------------------
// Completed Capital raid-weekend history (docs/concept/08 §"Raid-weekend history")
// ---------------------------------------------------------------------------

/** One completed raid season row, summarized for the history list. */
export interface RaidSeasonSummary {
  seasonId: number;
  startTime: Date;
  endTime: Date | null;
  capitalTotalLoot: number | null;
  raidsCompleted: number | null;
  totalAttacks: number | null;
  offensiveReward: number | null;
  defensiveReward: number | null;
  // Derived: per-member contribution count for this season (for the summary).
  participantCount: number;
}

/** A single member's contribution row within one or all seasons. */
export interface RaidContributionEntry {
  playerTag: string;
  name: string;
  // Totals across the seasons the member participated in.
  totalAttacks: number;
  totalCapitalResourcesLooted: number;
  totalRaidWeekendMedals: number;
  seasonsParticipated: number;
}

/** Members who recorded zero attacks in the most recent completed season. */
export interface RaidZeroAttackEntry {
  playerTag: string;
  name: string;
  seasonStartTime: Date;
  attackLimit: number | null;
}

/** Participation rate across tracked seasons. */
export interface RaidParticipationSummary {
  // Members who attacked in the most recent season vs. total retained members.
  latestSeasonParticipants: number;
  latestSeasonRetainedMembers: number;
  participationRate: number | null; // null when retained = 0
  // Average participants per season across all tracked seasons.
  averageParticipants: number;
  totalSeasons: number;
}

/** A single member's contribution in a single raid season (for the history table). */
export interface RaidContributionHistoryEntry {
  playerTag: string;
  name: string;
  seasonId: number;
  seasonStartTime: Date;
  attacksUsed: number;
  attackLimit: number | null;
  bonusAttackLimit: number | null;
  capitalResourcesLooted: number;
  raidWeekendMedals: number | null;
}

/** The full raid-history view model — summary + leaderboard + participation + history. */
export interface RaidHistoryView {
  seasons: RaidSeasonSummary[];
  contributionLeaderboard: RaidContributionEntry[];
  zeroAttackList: RaidZeroAttackEntry[];
  participation: RaidParticipationSummary;
  /** Per-member per-season contribution rows for the history table. */
  contributionHistory: RaidContributionHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Capital raid-weekend live timer (in-progress or next-raid countdown)
// ---------------------------------------------------------------------------

/**
 * The current raid-weekend status.
 *
 * - `state: "inProgress"` — a raid is active; the banner shows "Ends in"
 *   counting down to `endTime`.
 * - `state: "next"` — no raid is active; the banner shows "Starts in"
 *   counting down to `startTime` (estimated from the last season + 7 days).
 *
 * Null when the API fetch failed (the capital page degrades gracefully —
 * the timer is a bonus, not a dependency).
 */
export interface RaidTimer {
  state: "inProgress" | "next";
  startTime: Date;
  endTime: Date;
}

// ---------------------------------------------------------------------------
// Aggregate returned by getCapitalPage()
// ---------------------------------------------------------------------------

export interface CapitalPageData {
  overview: CapitalOverview;
  upgradeHistory: DistrictUpgradeHistory;
  // Raid-weekend status — Step 3.1 adds completed-season ingestion. The UI
  // shows a truthful "raid history pending" state until the first completed
  // season is ingested. (docs/concept/08 §"Raid-weekend history")
  raidHistoryAvailable: boolean;
  raidHistory: RaidHistoryView | null;
  // Live raid-weekend timer — null when no raid is in progress or the live
  // fetch failed. (docs/concept/08 §"Raid-weekend history")
  raidTimer: RaidTimer | null;
}

// Re-export for convenience so the page imports from one place.
export type { ClanBadgeUrls };

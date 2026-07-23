/**
 * Typed view models for the Clan Capital page (concept/08-clan-capital.md).
 *
 * Page components receive these shapes — never raw Drizzle rows or raw CoC API
 * payloads. Every value is explicitly typed so the UI can render loading,
 * empty, unavailable, and raid-pending states without guessing. See
 * concept/00 "Product contract".
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
// Aggregate returned by getCapitalPage()
// ---------------------------------------------------------------------------

export interface CapitalPageData {
  overview: CapitalOverview;
  upgradeHistory: DistrictUpgradeHistory;
  // Raid-weekend status — Phase 3.1 adds completed-season ingestion. Until
  // then the UI shows a truthful "raid history pending" state rather than a
  // fake leaderboard. (concept/08 §"Raid-weekend history")
  raidHistoryAvailable: boolean;
}

// Re-export for convenience so the page imports from one place.
export type { ClanBadgeUrls };

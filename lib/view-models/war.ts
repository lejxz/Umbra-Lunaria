/**
 * Typed view models for the War Center (concept/07-clan-war.md).
 *
 * Page components receive these shapes — never raw Drizzle rows or raw CoC API
 * payloads. Every value is explicitly typed so the UI can render loading,
 * empty, unavailable, private-war-log, stale-capture, and refresh-error
 * states without guessing. See concept/00 "Product contract".
 */

import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";

// ---------------------------------------------------------------------------
// Current war detail (parsed from the stored CocCurrentWar snapshot)
// ---------------------------------------------------------------------------

export interface WarRosterMember {
  tag: string;
  name: string;
  mapPosition: number;
  townhallLevel: number;
  attacksUsed: number;
  attacksAllowed: number;
  attacksRemaining: number;
  // Best single attack this member made (offense). null when the member has
  // not attacked yet — used in the detail sheet, not the compact roster row.
  bestStars: number | null;
  bestDestruction: number | null;
  // Defensive state of this member's BASE — the worst attack against it (max
  // stars + max destruction opponents achieved). null when the base hasn't
  // been attacked yet (preparation, or battle day with no attacks in yet).
  // This is what the compact roster row shows right-aligned: "is this base
  // destroyed?" A 3★ 100% means fully destroyed.
  defendedAgainst: number;
  worstDefenseStars: number | null; // max stars conceded in one attack
  worstDefenseDestruction: number | null; // max destruction conceded
  // True for our clan, false for the opponent — drives whether the row links
  // into the shared member detail sheet (opponent tags are not in `members`).
  isOwnClan: boolean;
}

export interface WarClanSide {
  tag: string;
  name: string;
  clanLevel: number | null;
  badgeUrls: ClanBadgeUrls | null;
  stars: number;
  destructionPercentage: number;
  attacks: number;
  attacksRemaining: number; // teamSize * attacksPerMember - attacks, null-derived to 0
  members: WarRosterMember[];
}

export interface CurrentWarDetail {
  warId: number;
  warType: "regular" | "cwl";
  state: "preparation" | "inWar" | "warEnded";
  teamSize: number | null;
  attacksPerMember: number | null;
  startTime: Date | null;
  endTime: Date | null;
  preparationStartTime: Date | null;
  lastSyncedAt: Date | null;
  clan: WarClanSide;
  opponent: WarClanSide;
}

// ---------------------------------------------------------------------------
// Attack log (merged from both clans' attacks in the snapshot, by order)
// ---------------------------------------------------------------------------

export interface WarAttackLogEntry {
  order: number;
  attackerTag: string;
  attackerName: string;
  attackerMapPosition: number | null;
  attackerTownhallLevel: number | null;
  attackerIsOwnClan: boolean;
  defenderTag: string;
  defenderName: string;
  defenderMapPosition: number | null;
  defenderTownhallLevel: number | null;
  defenderIsOwnClan: boolean;
  stars: number;
  destructionPercentage: number;
  duration: number | null;
}

// ---------------------------------------------------------------------------
// History list (one row per stored war, regular or CWL)
// ---------------------------------------------------------------------------

export interface WarHistoryEntry {
  warId: number;
  warType: "regular" | "cwl";
  opponentName: string | null;
  opponentTag: string | null;
  opponentBadgeUrls: ClanBadgeUrls | null;
  opponentClanLevel: number | null;
  result: "win" | "loss" | "tie" | null; // null while ongoing or backfill-unavailable
  teamSize: number | null;
  ownStars: number | null;
  opponentStars: number | null;
  ownDestructionPercentage: number | null;
  opponentDestructionPercentage: number | null;
  endTime: Date | null;
  startTime: Date | null;
  attacksPerMember: number | null;
  // True when a full snapshot exists (live-tracked) — the history row can open
  // a detail view. False for war-log backfill rows (no roster/attack detail).
  hasDetail: boolean;
  lastSyncedAt: Date | null;
}

// ---------------------------------------------------------------------------
// War detail (opened from the history "View details" button). Same shape as
// CurrentWarDetail but reusable for any live-tracked war by id. Includes the
// attack log so the sheet can render a full analysis.
// ---------------------------------------------------------------------------

export interface WarDetailView {
  detail: CurrentWarDetail;
  attackLog: WarAttackLogEntry[];
  // Derived analysis totals shown at the top of the detail sheet.
  analysis: WarAnalysis;
}

export interface WarAnalysis {
  // Attack efficiency
  ownAttacksUsed: number;
  ownAttacksTotal: number; // teamSize * attacksPerMember
  opponentAttacksUsed: number;
  opponentAttacksTotal: number;
  // Three-star rate (own attacks that scored 3 stars / own attacks used)
  ownThreeStarRate: number | null; // null when ownAttacksUsed = 0
  opponentThreeStarRate: number | null;
  // Average stars per attack
  ownAverageStars: number | null;
  opponentAverageStars: number | null;
  // Members who used 0 attacks (battle day only — null during prep)
  ownNoAttackMembers: number | null;
  opponentNoAttackMembers: number | null;
  // Best attacks (highest destruction at 3 stars)
  ownBestAttack: { attackerName: string; stars: number; destruction: number } | null;
  // TH-level summary for the matchup-quality note
  ownAverageTh: number | null;
  opponentAverageTh: number | null;
}

// ---------------------------------------------------------------------------
// Aggregate returned by getWarCenter()
// ---------------------------------------------------------------------------

export interface WarCenterData {
  // The active war (preparation/inWar) if one exists. null when the clan is at
  // peace — the hero then renders the no-active-war state. Ended wars are NOT
  // promoted to this field (they live in `history`); a backfill row without a
  // snapshot can't render the roster/attack detail.
  currentWar: CurrentWarDetail | null;
  // Attack log for currentWar (empty during preparation, before any attacks).
  attackLog: WarAttackLogEntry[];
  // History list, most-recent first.
  history: WarHistoryEntry[];
  // Most recent ended war, surfaced as a one-line "last result" in the hero
  // when there is no active war (concept/07 §landing state). null on cold
  // start (no wars at all) or when an active war is already shown.
  lastResult: WarHistoryEntry | null;
  // Clan war-log visibility — drives the private-war-log notice.
  warLogPublic: boolean | null;
  // Earliest tracked war/snapshot time — for the "history before tracking may
  // be incomplete" caveat on the history list.
  trackingStart: Date | null;
  // Shared TTL the refresh route enforces, surfaced so the UI can show
  // "try again in Ns" while rate-limited.
  refreshTtlSeconds: number;
}

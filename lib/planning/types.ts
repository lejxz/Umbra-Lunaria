/**
 * Planning view models — the shapes the war roster planner UI receives.
 *
 * These are derived from the same source data as the Members and War pages
 * (member_snapshots, war_participants, the active war snapshot) but projected
 * into a compact form optimized for the planner's two-panel layout.
 *
 * See concept/09-war-planning-and-auto-select.md and concept/12 Step 2.1.
 *
 * Phase 2.1 keeps roster draft state client-side; persistence lands in
 * Step 2.2. The shapes here are what Step 2.2 will eventually serialize into
 * the war_rosters / war_roster_slots tables.
 */

import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import type { WarRosterMember } from "@/lib/view-models/war";

/**
 * A single available member shown in the planner's left panel.
 *
 * Mirrors `MemberRosterEntry` but trims to the fields the planner actually
 * uses, and adds the derived `limitedData` flag.
 */
export interface PlanningMember {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  warPreference: "in" | "out" | null;
  // Activity — null when no snapshot has ever recorded activity.
  lastActiveAt: string | null; // ISO string (serialized for client)
  isActive: boolean;
  // Tracked war participation.
  warsTracked: number;
  attacksUsed: number;
  attacksAllowed: number;
  // Derived: true when warsTracked < minWarsForConfidentRanking.
  limitedData: boolean;
}

/**
 * The opponent's prep-day roster, for the optional matchup context panel.
 *
 * Only present when `prepWar.state === "preparation"`. Each entry mirrors
 * the relevant fields of `WarRosterMember` — on prep day there are no attacks,
 * so the scouting signal is map position + TH level + name.
 */
export interface PrepOpponentMember {
  tag: string;
  name: string;
  mapPosition: number;
  townhallLevel: number;
}

/** Summary of the active preparation-day war, if any. */
export interface PrepWarContext {
  warId: number;
  teamSize: number | null;
  attacksPerMember: number | null;
  startTime: string | null; // ISO string
  endTime: string | null;
  opponentName: string;
  opponentTag: string;
  opponentBadgeUrls: ClanBadgeUrls | null;
  opponentClanLevel: number | null;
  opponentMembers: PrepOpponentMember[];
}

/**
 * The full planning context passed from the server page to the client shell.
 *
 * - `members` is always present (the planner is useful even without an active
 *   war — leadership can stage a roster for an upcoming war).
 * - `prepWar` is null when no war is in preparation. The UI shows a notice
 *   rather than hiding the planner.
 * - `minWarsForConfidentRanking` is passed so the client can re-derive the
 *   limited-data label if members are filtered.
 */
export interface PlanningContext {
  members: PlanningMember[];
  prepWar: PrepWarContext | null;
  minWarsForConfidentRanking: number;
}

/**
 * Allowed war sizes for the planner (concept/09 §"Manual roster builder" #4).
 */
export const WAR_SIZES = [10, 15, 20, 25, 30, 40, 50] as const;
export type WarSize = (typeof WAR_SIZES)[number];

/**
 * A lineup slot. `playerTag` is null for an empty slot. The position is
 * 1-indexed (matches CoC map positions).
 */
export interface LineupSlot {
  position: number;
  playerTag: string | null;
}

/**
 * Helper: convert a `WarRosterMember` (parsed from the war snapshot) to the
 * trimmed `PrepOpponentMember` the planner needs. Exported so tests can call
 * it without a DB.
 */
export function toPrepOpponentMember(m: WarRosterMember): PrepOpponentMember {
  return {
    tag: m.tag,
    name: m.name,
    mapPosition: m.mapPosition,
    townhallLevel: m.townhallLevel,
  };
}

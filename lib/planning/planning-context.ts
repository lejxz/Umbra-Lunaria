/**
 * Planning context query — assembles the data the planner UI needs in one pass.
 *
 * Runs the member roster query (for available members) and the war center
 * query (for the active preparation-day war + opponent roster) in parallel,
 * then projects the results into the compact `PlanningContext` shape.
 *
 * Pure derivation lives here so the page component stays thin and the shape
 * is testable. See concept/09 + concept/12 Step 2.1.
 */

import { getMemberRoster } from "@/lib/db/member-queries";
import { getWarCenter } from "@/lib/db/war-queries";
import { clanConfig } from "@/config/clan.config";
import type { MemberRosterEntry } from "@/lib/view-models/members";
import type {
  PlanningContext,
  PlanningMember,
  PrepOpponentMember,
  PrepWarContext,
} from "@/lib/planning/types";
import { toPrepOpponentMember } from "@/lib/planning/types";

/**
 * Build the planning context. Always returns a value — the UI renders the
 * planner even when there's no active prep war (leadership can stage a roster
 * for an upcoming war).
 *
 * Throws only when the underlying DB queries fail; the page component wraps
 * the call in try/catch and renders an ErrorState.
 */
export async function getPlanningContext(): Promise<PlanningContext> {
  const [roster, warCenter] = await Promise.all([
    getMemberRoster(),
    getWarCenter(),
  ]);

  const members = roster.entries.map(toPlanningMember);

  let prepWar: PrepWarContext | null = null;
  const activeWar = warCenter.currentWar;
  if (activeWar && activeWar.state === "preparation") {
    const opponentMembers: PrepOpponentMember[] = activeWar.opponent.members.map(
      toPrepOpponentMember,
    );
    prepWar = {
      warId: activeWar.warId,
      teamSize: activeWar.teamSize,
      attacksPerMember: activeWar.attacksPerMember,
      startTime: activeWar.startTime ? activeWar.startTime.toISOString() : null,
      endTime: activeWar.endTime ? activeWar.endTime.toISOString() : null,
      opponentName: activeWar.opponent.name,
      opponentTag: activeWar.opponent.tag,
      opponentBadgeUrls: activeWar.opponent.badgeUrls,
      opponentClanLevel: activeWar.opponent.clanLevel,
      opponentMembers,
    };
  }

  return {
    members,
    prepWar,
    minWarsForConfidentRanking: clanConfig.minWarsForConfidentRanking,
  };
}

/**
 * Convert a `MemberRosterEntry` (DB-derived) to the compact `PlanningMember`.
 * Exported so the derivation can be unit-tested without a DB.
 *
 * `limitedData` is true when `warsTracked` is below the confidence threshold
 * from clan config — the planner surfaces this as a "Limited data" cue per
 * concept/09 §"Confidence and explanation" #1.
 */
export function toPlanningMember(entry: MemberRosterEntry): PlanningMember {
  return {
    playerTag: entry.playerTag,
    name: entry.name,
    role: entry.role,
    townHallLevel: entry.townHallLevel,
    warPreference: entry.warPreference,
    lastActiveAt: entry.lastActiveAt ? entry.lastActiveAt.toISOString() : null,
    isActive: entry.isActive,
    warsTracked: entry.warsTracked,
    attacksUsed: entry.attacksUsed,
    attacksAllowed: entry.attacksAllowed,
    limitedData: entry.warsTracked < clanConfig.minWarsForConfidentRanking,
  };
}

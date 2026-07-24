/**
 * Planning context query — assembles the data the planner UI needs in one pass.
 *
 * Runs the member roster query (for available members) + the war center query
 * (for the active preparation-day war + opponent roster) + the war-select
 * inputs query (activity rate, three-star counts, stars earned, rushed percent)
 * in parallel, then projects the results into the `PlanningContext` shape and
 * computes the auto-select score per member.
 *
 * Pure derivation lives here so the page component stays thin and the shape is
 * testable. See concept/09 + concept/12 Steps 2.1 + 3.2.
 */

import { getMemberRoster } from "@/lib/db/member-queries";
import { getWarCenter } from "@/lib/db/war-queries";
import { getWarSelectInputs } from "@/lib/planning/war-select-inputs";
import { computeWarSelectScore } from "@/lib/scoring/war-select-score";
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
  const [roster, warCenter, selectInputs] = await Promise.all([
    getMemberRoster(),
    getWarCenter(),
    getWarSelectInputs(),
  ]);

  const inputsByTag = new Map(
    selectInputs.map((i) => [i.playerTag, i]),
  );

  const members: PlanningMember[] = roster.entries.map((entry) => {
    const base = toPlanningMember(entry);
    const inputs = inputsByTag.get(entry.playerTag);
    if (!inputs) {
      return { ...base, autoSelectScore: null };
    }
    const score = computeWarSelectScore(
      {
        playerTag: entry.playerTag,
        name: entry.name,
        townHallLevel: entry.townHallLevel,
        warPreference: entry.warPreference,
        recentActivityRate: inputs.recentActivityRate,
        warAttacksUsed: entry.attacksUsed > 0 ? entry.attacksUsed : null,
        warAttacksAllowed: entry.attacksAllowed > 0 ? entry.attacksAllowed : null,
        warStarsEarned: inputs.warStarsEarned,
        threeStarAttacks: inputs.threeStarAttacks,
        rushedPercent: inputs.rushedPercent,
        warsTracked: entry.warsTracked,
      },
      clanConfig.minWarsForConfidentRanking,
    );
    return { ...base, autoSelectScore: score };
  });

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
 * Convert a `MemberRosterEntry` (DB-derived) to the compact `PlanningMember`
 * (without the auto-select score — that's computed separately in
 * `getPlanningContext`). Exported so the derivation can be unit-tested.
 *
 * `limitedData` is true when `warsTracked` is below the confidence threshold
 * from clan config — the planner surfaces this as a "Limited data" cue per
 * concept/09 §"Confidence and explanation" #1.
 */
export function toPlanningMember(entry: MemberRosterEntry): Omit<PlanningMember, "autoSelectScore"> {
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

/**
 * Strategy page query — computes the suggested participants + review list.
 *
 * Pure read-only ranking. No writes, no admin. Uses existing data from
 * members, war_participants, war_attacks, member_snapshots, and the
 * precomputed rushedPercent column.
 *
 * The composite score for suggested participants uses 5 factors:
 *   1. War participation rate (30%) — attacks used / allowed, all-time
 *   2. War performance (25%) — average stars + three-star rate
 *   3. Activity score (20%) — from getMemberActivityScore (30-day)
 *   4. Account readiness (15%) — 1 - rushed/100
 *   5. Recency (10%) — how recently active (1 = active today, 0 = 7+ days)
 *
 * New members (warsTracked < minWarsForConfidentRanking) are NOT penalized —
 * they get the same score but with an isNewMember flag so leadership knows
 * their score is based on limited data.
 */

import { and, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  warParticipants,
  warAttacks,
  wars,
} from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  StrategyPageData,
  SuggestedParticipant,
  ReviewMember,
  TargetingIntelligence,
} from "@/lib/view-models/strategy";
import { getMemberActivityScore } from "@/lib/db/queries";
import {
  computeTargeting,
  type TargetingAttack,
} from "@/lib/scoring/targeting";
import type { RawSnapshot } from "@/lib/war/war-snapshot";

/** How many recent live-tracked wars feed the targeting analysis. Caps the
 *  snapshot-parsing work and keeps the panel about “recent form”, not all
 *  history (the full war-history list remains on the War page). */
const TARGETING_WAR_LIMIT = 30;
/** Members shown in the targeting table (most attacks first). */
const TARGETING_MEMBER_LIMIT = 12;

export async function getStrategyPage(): Promise<StrategyPageData> {
  // Fetch retained members with their key columns.
  const retained = await db
    .select({
      playerTag: members.playerTag,
      name: members.name,
      role: members.role,
      townHallLevel: members.townHallLevel,
      warPreference: members.warPreference,
      rushedPercent: members.rushedPercent,
      joinedAt: members.joinedAt,
    })
    .from(members)
    .where(isNull(members.leftAt));

  if (retained.length === 0) {
    return { suggested: [], review: [], totalMembers: 0, targeting: null };
  }

  const tags = retained.map((m) => m.playerTag);

  // Fetch war participation (all-time) per member.
  const warRows = await db
    .select({
      playerTag: warParticipants.playerTag,
      attacksUsed: sql<number>`coalesce(sum(${warParticipants.attacksUsed}), 0)::int`,
      attacksAllowed: sql<number>`coalesce(sum(${warParticipants.attacksAllowed}), 0)::int`,
      starsEarned: sql<number>`coalesce(sum(${warParticipants.starsEarned}), 0)::int`,
      warsTracked: sql<number>`count(*)::int`,
    })
    .from(warParticipants)
    .where(inArray(warParticipants.playerTag, tags))
    .groupBy(warParticipants.playerTag);

  const warMap = new Map(warRows.map((r) => [r.playerTag, r]));

  // Fetch three-star counts per attacker (all-time).
  const threeStarRows = await db
    .select({
      attackerTag: warAttacks.attackerTag,
      count: sql<number>`count(*)::int`,
    })
    .from(warAttacks)
    .where(and(inArray(warAttacks.attackerTag, tags), eq(warAttacks.stars, 3)))
    .groupBy(warAttacks.attackerTag);

  const threeStarMap = new Map(threeStarRows.map((r) => [r.attackerTag, r.count]));

  // Fetch latest activity per member.
  const activityRows = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      lastActiveAt: sql<Date>`max(${memberSnapshots.capturedAt}) filter (where ${memberSnapshots.activityFlag})`,
      lastSnapshot: sql<Date>`max(${memberSnapshots.capturedAt})`,
    })
    .from(memberSnapshots)
    .where(inArray(memberSnapshots.playerTag, tags))
    .groupBy(memberSnapshots.playerTag);

  const activityMap = new Map(activityRows.map((r) => [r.playerTag, r]));

  // Fetch activity scores (30-day).
  const activityScoreMap = new Map<string, number | null>();
  try {
    const scoreData = await getMemberActivityScore("30d");
    for (const entry of scoreData.entries) {
      activityScoreMap.set(entry.playerTag, entry.totalScore);
    }
  } catch {
    // Activity score query may fail — degrade gracefully.
  }

  // Build suggested participants + review list.
  const now = Date.now();
  const minWars = clanConfig.minWarsForConfidentRanking; // 3
  const suggested: SuggestedParticipant[] = [];
  const review: ReviewMember[] = [];

  for (const m of retained) {
    const war = warMap.get(m.playerTag);
    const threeStars = threeStarMap.get(m.playerTag) ?? 0;
    const activity = activityMap.get(m.playerTag);
    const activityScore = activityScoreMap.get(m.playerTag) ?? null;

    const warsTracked = war?.warsTracked ?? 0;
    const attacksUsed = war?.attacksUsed ?? 0;
    const attacksAllowed = war?.attacksAllowed ?? 0;
    const starsEarned = war?.starsEarned ?? 0;

    const participationRate = attacksAllowed > 0 ? attacksUsed / attacksAllowed : null;
    const averageStars = attacksUsed > 0 ? starsEarned / attacksUsed : null;
    const threeStarRate = attacksUsed > 0 ? threeStars / attacksUsed : null;

    const lastActiveAt = activity?.lastActiveAt ?? null;
    // Drizzle may return the Date as a string from raw SQL — normalize it.
    const lastActiveDate = lastActiveAt ? new Date(lastActiveAt) : null;
    const isActive = lastActiveDate
      ? now - lastActiveDate.getTime() < 7 * 24 * 60 * 60 * 1000
      : false;
    const daysSinceActive = lastActiveDate
      ? Math.floor((now - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const isNewMember = warsTracked < minWars;
    const warPref = (m.warPreference as "in" | "out" | null) ?? null;

    // ── Composite score (0-100) ──────────────────────────────────────────
    // 1. Participation (30%) — 0 if no wars, 1 if 100%
    const participationScore = participationRate ?? 0;
    // For new members with no war data, give a neutral 0.5 so they're not
    // at the bottom — they should get a chance.
    const participationComponent = warsTracked === 0 ? 0.5 : participationScore;

    // 2. Performance (25%) — blend of avg stars (0-3 → 0-1) + 3★ rate (0-1)
    const avgStarsNorm = averageStars !== null ? averageStars / 3 : 0;
    const threeStarNorm = threeStarRate ?? 0;
    const performanceComponent = warsTracked === 0
      ? 0.5 // neutral for new members
      : (avgStarsNorm * 0.6 + threeStarNorm * 0.4);

    // 3. Activity (20%) — 0-100 score → 0-1
    const activityComponent = activityScore !== null ? activityScore / 100 : 0.5;

    // 4. Readiness (15%) — 1 - rushed/100
    const readinessComponent = m.rushedPercent !== null
      ? Math.max(0, 1 - m.rushedPercent / 100)
      : 0.5;

    // 5. Recency (10%) — 1 if active today, 0.5 if 3 days, 0 if 7+ days
    let recencyComponent = 0.5;
    if (daysSinceActive !== null) {
      recencyComponent = Math.max(0, 1 - daysSinceActive / 7);
    } else if (isActive) {
      recencyComponent = 1;
    }

    const compositeScore =
      participationComponent * 30 +
      performanceComponent * 25 +
      activityComponent * 20 +
      readinessComponent * 15 +
      recencyComponent * 10;

    suggested.push({
      playerTag: m.playerTag,
      name: m.name,
      role: m.role,
      townHallLevel: m.townHallLevel,
      warPreference: warPref,
      warsTracked,
      attacksUsed,
      attacksAllowed,
      participationRate,
      averageStars,
      threeStarRate,
      activityScore,
      rushedPercent: m.rushedPercent,
      lastActiveAt: lastActiveDate ? lastActiveDate.toISOString() : null,
      isActive,
      isNewMember,
      compositeScore: Math.round(compositeScore * 10) / 10,
      scoreBreakdown: {
        participation: Math.round(participationComponent * 100),
        performance: Math.round(performanceComponent * 100),
        activity: Math.round(activityComponent * 100),
        readiness: Math.round(readinessComponent * 100),
        recency: Math.round(recencyComponent * 100),
      },
    });

    // ── Review list ──────────────────────────────────────────────────────
    const reasons: string[] = [];

    if (daysSinceActive !== null && daysSinceActive >= 4) {
      reasons.push(`${daysSinceActive}d inactive`);
    }
    if (activityScore !== null && activityScore < 30) {
      reasons.push(`Low activity (${Math.round(activityScore)})`);
    }
    if (warsTracked >= 3 && participationRate !== null && participationRate < 0.5) {
      reasons.push(`Low war participation (${Math.round(participationRate * 100)}%)`);
    }
    if (m.rushedPercent !== null && m.rushedPercent > 60) {
      reasons.push(`Rushed (${Math.round(m.rushedPercent)}%)`);
    }
    if (warPref === "out") {
      reasons.push("Opted out");
    }

    if (reasons.length > 0) {
      review.push({
        playerTag: m.playerTag,
        name: m.name,
        role: m.role,
        townHallLevel: m.townHallLevel,
        reasons,
        daysInactive: daysSinceActive,
        activityScore,
        warParticipationRate: participationRate,
        rushedPercent: m.rushedPercent,
        warPreference: warPref,
        warsTracked,
      });
    }
  }

  // Sort suggested by composite score (descending).
  suggested.sort((a, b) => b.compositeScore - a.compositeScore);

  // Sort review by severity (most reasons first, then by days inactive).
  review.sort((a, b) => {
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return (b.daysInactive ?? 0) - (a.daysInactive ?? 0);
  });

  // ---- Attack targeting intelligence (Phase 3.3 — F9) ----
  const memberByTag = new Map(retained.map((m) => [m.playerTag, m]));
  const targeting = await getTargetingIntelligence(tags, memberByTag);

  return {
    suggested,
    review,
    totalMembers: retained.length,
    targeting,
  };
}

// ---------------------------------------------------------------------------
// Attack targeting intelligence (Phase 3.3 — F9)
// ---------------------------------------------------------------------------

/**
 * Build the targeting analysis from the most recent live-tracked wars:
 * war_attacks joined against each war's stored CocCurrentWar snapshot, where
 * both TH levels are resolved (own side + opponent side both live in the
 * snapshot). War-log backfilled wars carry no snapshot, so they never
 * contribute — the panel states this honestly.
 *
 * Best-effort: a malformed/unparseable snapshot skips that war rather than
 * failing the strategy page.
 */
async function getTargetingIntelligence(
  tags: string[],
  memberByTag: Map<
    string,
    { name: string; townHallLevel: number | null }
  >,
): Promise<TargetingIntelligence | null> {
  // Recent snapshot-backed wars (bounded payload: ≤30 war rows).
  const warRows = await db
    .select({ id: wars.id, warSnapshot: wars.warSnapshot })
    .from(wars)
    .where(sql`${wars.warSnapshot} IS NOT NULL`)
    .orderBy(desc(wars.endTime), desc(wars.id))
    .limit(TARGETING_WAR_LIMIT);
  if (warRows.length === 0) return null;

  // Own-side attacks in those wars (war_attacks stores own-clan attackers
  // only — opponent attacks live exclusively in the snapshot).
  const warIds = warRows.map((w) => w.id);
  const attackRows = await db
    .select({
      warId: warAttacks.warId,
      attackerTag: warAttacks.attackerTag,
      defenderTag: warAttacks.defenderTag,
      stars: warAttacks.stars,
      destructionPercentage: warAttacks.destructionPercentage,
    })
    .from(warAttacks)
    .where(
      and(
        inArray(warAttacks.warId, warIds),
        inArray(warAttacks.attackerTag, tags),
      ),
    );
  if (attackRows.length === 0) return null;

  // tag → TH per war, parsed once per snapshot (both clans' members).
  const thByWar = new Map<number, Map<string, number>>();
  for (const w of warRows) {
    const snap = w.warSnapshot as RawSnapshot | null;
    if (!snap?.clan || !snap.opponent) continue;
    const th = new Map<string, number>();
    for (const m of [...(snap.clan.members ?? []), ...(snap.opponent.members ?? [])]) {
      if (m.tag && typeof m.townhallLevel === "number") {
        th.set(m.tag, m.townhallLevel);
      }
    }
    thByWar.set(w.id, th);
  }

  const attacks: TargetingAttack[] = [];
  for (const a of attackRows) {
    const th = thByWar.get(a.warId);
    if (!th) continue;
    const attackerTh = th.get(a.attackerTag);
    const defenderTh = th.get(a.defenderTag);
    if (attackerTh === undefined || defenderTh === undefined) continue;
    attacks.push({
      warId: a.warId,
      attackerTag: a.attackerTag,
      attackerTownhallLevel: attackerTh,
      defenderTownhallLevel: defenderTh,
      stars: a.stars,
      destructionPercentage: a.destructionPercentage,
    });
  }
  if (attacks.length === 0) return null;

  const result = computeTargeting(attacks);

  return {
    coveredWars: warRows.length,
    totalAttacks: result.totalAttacks,
    aggregate: result.aggregate,
    members: result.members
      .slice(0, TARGETING_MEMBER_LIMIT)
      .map((m) => ({
        playerTag: m.playerTag,
        name: memberByTag.get(m.playerTag)?.name ?? m.playerTag,
        townHallLevel: memberByTag.get(m.playerTag)?.townHallLevel ?? null,
        attacks: m.attacks,
        avgStars: m.avgStars,
        avgDestruction: m.avgDestruction,
        threeStarRate: m.threeStarRate,
        bestDelta: m.bestDelta,
        worstDelta: m.worstDelta,
      })),
  };
}

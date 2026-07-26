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

import { and, eq, isNull, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  warParticipants,
  warAttacks,
} from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  StrategyPageData,
  SuggestedParticipant,
  ReviewMember,
} from "@/lib/view-models/strategy";
import { getMemberActivityScore } from "@/lib/db/queries";

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
    return { suggested: [], review: [], totalMembers: 0 };
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

  return {
    suggested,
    review,
    totalMembers: retained.length,
  };
}

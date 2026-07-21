/**
 * Server-side query layer for the Members page.
 *
 * See concept/06-members.md and concept/12 Step 1.3.A/B.
 * All functions are server-only — they import @/lib/db.
 */

import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  wars,
  warParticipants,
  unitLevels,
} from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  MemberRosterEntry,
  MemberRoster,
  MemberDetailView,
} from "@/lib/view-models/members";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { computeWindow } from "@/lib/time/windows";
import { calculateDonationWindow } from "@/lib/scoring/donations";
import { computeWarMetrics } from "@/lib/scoring/war-metrics";
import { computeRushed } from "@/lib/scoring/rushed";

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

export async function getMemberRoster(): Promise<MemberRoster> {
  const retained = await db
    .select()
    .from(members)
    .where(isNull(members.leftAt))
    .orderBy(members.clanRank);

  if (retained.length === 0) {
    return { entries: [], totalMembers: 0, trackingStart: null };
  }

  const tags = retained.map((m) => m.playerTag);

  // Get latest activity per member (most recent snapshot with activityFlag)
  const activityMap = await getLatestActivity(tags);

  // Get war participation summary
  const warMap = await getWarParticipationSummary(tags);

  // Get tracking start
  const trackingStart = await getTrackingStart();

  const entries: MemberRosterEntry[] = retained.map((m) => {
    const activity = activityMap.get(m.playerTag);
    const war = warMap.get(m.playerTag);

    return {
      playerTag: m.playerTag,
      name: m.name,
      role: m.role,
      townHallLevel: m.townHallLevel,
      clanRank: m.clanRank,
      trophies: m.trophies,
      league: (m.league as { name: string; iconUrls?: ClanBadgeUrls }) ?? null,
      leagueTier: (m.leagueTier as { name: string; iconUrls?: ClanBadgeUrls }) ?? null,
      builderBaseTrophies: m.builderBaseTrophies,
      expLevel: m.expLevel,
      warPreference: (m.warPreference as "in" | "out") ?? null,
      currentDonations: m.currentDonations,
      currentDonationsReceived: m.currentDonationsReceived,
      lastActiveAt: activity?.lastActiveAt ?? null,
      isActive: activity?.isActive ?? false,
      warsTracked: war?.warsTracked ?? 0,
      warsMissed: war?.warsMissed ?? 0,
      attacksUsed: war?.attacksUsed ?? 0,
      attacksAllowed: war?.attacksAllowed ?? 0,
      rushedPercent: null, // Phase 3.0 — requires cap reference data
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
      isDeparted: false,
    };
  });

  return { entries, totalMembers: entries.length, trackingStart };
}

// ---------------------------------------------------------------------------
// Member detail
// ---------------------------------------------------------------------------

export async function getMemberDetail(
  playerTag: string,
): Promise<MemberDetailView | null> {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.playerTag, playerTag))
    .limit(1);

  if (!member) return null;

  // Fetch all the data in parallel
  const [activityData, donationData, warData, progressionData] =
    await Promise.all([
      getActivityDetail(member.playerTag),
      getDonationDetail(member.playerTag),
      getWarDetail(member.playerTag),
      getProgressionDetail(member.playerTag),
    ]);

  return {
    profile: {
      playerTag: member.playerTag,
      name: member.name,
      role: member.role,
      townHallLevel: member.townHallLevel,
      townHallWeaponLevel: member.townHallWeaponLevel,
      expLevel: member.expLevel,
      trophies: member.trophies,
      bestTrophies: member.bestTrophies,
      league: (member.league as { name: string; iconUrls?: ClanBadgeUrls }) ?? null,
      leagueTier: (member.leagueTier as { name: string; iconUrls?: ClanBadgeUrls }) ?? null,
      builderHallLevel: member.builderHallLevel,
      builderBaseTrophies: member.builderBaseTrophies,
      bestBuilderBaseTrophies: member.bestBuilderBaseTrophies,
      builderBaseLeague: (member.builderBaseLeague as { name: string }) ?? null,
      clanRank: member.clanRank,
      warPreference: (member.warPreference as "in" | "out") ?? null,
      warStars: member.warStars,
      attackWins: member.attackWins,
      defenseWins: member.defenseWins,
      clanCapitalContributions: member.clanCapitalContributions,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
      isDeparted: member.leftAt !== null,
      isPurged: false,
      lastDetailCaptureAt: member.lastDetailCaptureAt,
    },
    activity: activityData,
    donations: donationData,
    warParticipation: warData,
    career: {
      warStars: member.warStars,
      attackWins: member.attackWins,
      defenseWins: member.defenseWins,
      bestTrophies: member.bestTrophies,
      bestBuilderBaseTrophies: member.bestBuilderBaseTrophies,
      clanCapitalContributions: member.clanCapitalContributions,
      achievements:
        ((member.careerStats as { achievements?: Array<{ name: string; value: number; target?: number; stars?: number; village?: string }> })?.achievements ?? []).map((a) => ({
          name: a.name,
          value: a.value,
          target: a.target ?? null,
          stars: a.stars ?? null,
          village: a.village ?? null,
        })),
    },
    progression: progressionData,
    rushed: computeRushedFromProgression(progressionData),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLatestActivity(tags: string[]) {
  const map = new Map<
    string,
    { lastActiveAt: Date; isActive: boolean }
  >();

  // Get the most recent snapshot per member
  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      activityFlag: memberSnapshots.activityFlag,
    })
    .from(memberSnapshots)
    .where(inArray(memberSnapshots.playerTag, tags))
    .orderBy(desc(memberSnapshots.capturedAt));

  // The threshold for "active" is the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const s of snapshots) {
    if (map.has(s.playerTag)) continue; // Already have the latest
    map.set(s.playerTag, {
      lastActiveAt: s.capturedAt,
      isActive: s.activityFlag && s.capturedAt >= sevenDaysAgo,
    });
  }

  return map;
}

async function getWarParticipationSummary(tags: string[]) {
  const map = new Map<
    string,
    {
      warsTracked: number;
      warsMissed: number;
      attacksUsed: number;
      attacksAllowed: number;
    }
  >();

  // Get all war participants for these tags
  const wpRows = await db
    .select()
    .from(warParticipants)
    .where(inArray(warParticipants.playerTag, tags));

  for (const wp of wpRows) {
    const existing = map.get(wp.playerTag) ?? {
      warsTracked: 0,
      warsMissed: 0,
      attacksUsed: 0,
      attacksAllowed: 0,
    };
    existing.warsTracked += 1;
    if (wp.missed) existing.warsMissed += 1;
    existing.attacksUsed += wp.attacksUsed;
    existing.attacksAllowed += wp.attacksAllowed;
    map.set(wp.playerTag, existing);
  }

  return map;
}

async function getTrackingStart(): Promise<Date | null> {
  const [row] = await db
    .select({ minDate: sql<string>`min(${memberSnapshots.capturedAt})` })
    .from(memberSnapshots);
  if (!row?.minDate) return null;
  return new Date(row.minDate);
}

async function getActivityDetail(playerTag: string) {
  const win = computeWindow("30d");
  const snapshots = await db
    .select({
      capturedAt: memberSnapshots.capturedAt,
      activityFlag: memberSnapshots.activityFlag,
      loginDayFlag: memberSnapshots.loginDayFlag,
      donations: memberSnapshots.donations,
    })
    .from(memberSnapshots)
    .where(
      and(
        eq(memberSnapshots.playerTag, playerTag),
        gte(memberSnapshots.capturedAt, win.from),
        lte(memberSnapshots.capturedAt, win.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  const trackingStart = await getTrackingStart();

  // Build 30-day activity buckets
  const buckets = snapshots.map((s) => ({
    label: new Date(s.capturedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: clanConfig.timezone,
    }),
    active: s.activityFlag,
    timestamp: s.capturedAt,
  }));

  // Login days (where loginDayFlag is true)
  const loginDays = snapshots
    .filter((s) => s.loginDayFlag)
    .map((s) => s.capturedAt);

  const lastActive = snapshots.length > 0
    ? snapshots.filter((s) => s.activityFlag).pop()?.capturedAt ?? null
    : null;

  return {
    lastActiveAt: lastActive ?? null,
    trackingStart,
    hasPartialData: trackingStart !== null && trackingStart > win.from,
    buckets,
    loginDays,
  };
}

async function getDonationDetail(playerTag: string) {
  const win24h = computeWindow("24h");
  const win7d = computeWindow("7d");
  const win30d = computeWindow("30d");

  const snapshots = await db
    .select({
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      donationsReceived: memberSnapshots.donationsReceived,
    })
    .from(memberSnapshots)
    .where(
      and(
        eq(memberSnapshots.playerTag, playerTag),
        lte(memberSnapshots.capturedAt, win30d.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  const givenSnaps = snapshots.map((s) => ({
    capturedAt: s.capturedAt,
    donations: s.donations,
  }));
  const recvSnaps = snapshots.map((s) => ({
    capturedAt: s.capturedAt,
    donations: s.donationsReceived,
  }));

  const given24h = calculateDonationWindow(givenSnaps, win24h);
  const received24h = calculateDonationWindow(recvSnaps, win24h);
  const given7d = calculateDonationWindow(givenSnaps, win7d);
  const received7d = calculateDonationWindow(recvSnaps, win7d);
  const given30d = calculateDonationWindow(givenSnaps, win30d);
  const received30d = calculateDonationWindow(recvSnaps, win30d);

  // 30-day donation buckets (daily)
  const buckets = win30d ? buildDonationBuckets(snapshots, win30d) : [];

  return {
    given24h,
    received24h,
    given7d,
    received7d,
    given30d,
    received30d,
    ratio: received30d > 0 ? given30d / received30d : null,
    buckets,
    activityScore: null, // TODO: compute from getMemberActivityScore
    activityScoreRank: null,
    activityScoreComponents: [],
  };
}

function buildDonationBuckets(
  snapshots: Array<{
    capturedAt: Date;
    donations: number;
    donationsReceived: number;
  }>,
  win: { from: Date; to: Date },
) {
  // Simple per-day bucketing for 30d
  const days: Array<{
    label: string;
    given: number;
    received: number;
    timestamp: Date;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(win.from);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const inDay = snapshots.filter(
      (s) => s.capturedAt >= dayStart && s.capturedAt < dayEnd,
    );

    days.push({
      label: dayStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: clanConfig.timezone,
      }),
      given: inDay.reduce((sum, s) => sum + s.donations, 0),
      received: inDay.reduce((sum, s) => sum + s.donationsReceived, 0),
      timestamp: dayStart,
    });
  }

  return days;
}

async function getWarDetail(playerTag: string) {
  const wpRows = await db
    .select()
    .from(warParticipants)
    .where(eq(warParticipants.playerTag, playerTag));

  let warsTracked = 0;
  let warsMissed = 0;
  let attacksUsed = 0;
  let attacksAllowed = 0;
  let starsEarned = 0;

  for (const wp of wpRows) {
    warsTracked += 1;
    if (wp.missed) warsMissed += 1;
    attacksUsed += wp.attacksUsed;
    attacksAllowed += wp.attacksAllowed;
    starsEarned += wp.starsEarned;
  }

  const metrics = computeWarMetrics({
    warsTracked,
    warsMissed,
    totalAttacksUsed: attacksUsed,
    totalAttacksAllowed: attacksAllowed,
    totalStarsEarned: starsEarned,
    threeStarAttacks: 0, // TODO: count from warAttacks
  });

  // Get recent wars
  const recentWars: Array<{
    warId: number;
    opponentName: string | null;
    result: string | null;
    attacksUsed: number;
    attacksAllowed: number;
    starsEarned: number;
    missed: boolean;
    endTime: Date | null;
  }> = [];

  for (const wp of wpRows.slice(-10).reverse()) {
    const [war] = await db
      .select({
        id: wars.id,
        opponentName: wars.opponentName,
        result: wars.result,
        endTime: wars.endTime,
      })
      .from(wars)
      .where(eq(wars.id, wp.warId))
      .limit(1);

    if (war) {
      recentWars.push({
        warId: war.id,
        opponentName: war.opponentName,
        result: war.result,
        attacksUsed: wp.attacksUsed,
        attacksAllowed: wp.attacksAllowed,
        starsEarned: wp.starsEarned,
        missed: wp.missed,
        endTime: war.endTime,
      });
    }
  }

  // Current war status
  const [currentWar] = await db
    .select()
    .from(wars)
    .where(sql`${wars.state} != 'warEnded'`)
    .orderBy(desc(wars.id))
    .limit(1);

  let currentWarStatus: string | null = null;
  if (currentWar) {
    const [cw] = await db
      .select()
      .from(warParticipants)
      .where(
        and(
          eq(warParticipants.warId, currentWar.id),
          eq(warParticipants.playerTag, playerTag),
        ),
      )
      .limit(1);
    if (cw) {
      currentWarStatus = `${cw.attacksUsed}/${cw.attacksAllowed} attacks used`;
    }
  }

  return {
    warsTracked,
    warsMissed,
    attacksUsed,
    attacksAllowed,
    participationRate: metrics.participationRate,
    starsEarned,
    averageStars: metrics.averageStars,
    threeStarRate: metrics.threeStarRate,
    recentWars,
    currentWarStatus,
  };
}

async function getProgressionDetail(playerTag: string) {
  const [row] = await db
    .select()
    .from(unitLevels)
    .where(eq(unitLevels.playerTag, playerTag))
    .limit(1);

  if (!row) {
    return {
      troops: [],
      heroes: [],
      heroEquipment: [],
      spells: [],
      pets: [],
      builderBaseTroops: [],
      builderBaseHeroes: [],
    };
  }

  const troops = (row.troops as Array<{ name: string; level: number; maxLevel?: number }>) ?? [];
  const heroes = (row.heroes as Array<{ name: string; level: number; maxLevel?: number }>) ?? [];
  const heroEquipment = (row.heroEquipment as Array<{ name: string; level: number; maxLevel?: number }>) ?? [];
  const spells = (row.spells as Array<{ name: string; level: number; maxLevel?: number }>) ?? [];
  const pets = (row.pets as Array<{ name: string; level: number; maxLevel?: number }>) ?? [];
  const builderBase = (row.builderBase as {
    troops?: Array<{ name: string; level: number; maxLevel?: number }>;
    heroes?: Array<{ name: string; level: number; maxLevel?: number }>;
  }) ?? {};

  return {
    troops: troops.map((t) => ({ name: t.name, level: t.level, maxLevel: t.maxLevel ?? null })),
    heroes: heroes.map((h) => ({ name: h.name, level: h.level, maxLevel: h.maxLevel ?? null })),
    heroEquipment: heroEquipment.map((e) => ({ name: e.name, level: e.level, maxLevel: e.maxLevel ?? null })),
    spells: spells.map((s) => ({ name: s.name, level: s.level, maxLevel: s.maxLevel ?? null })),
    pets: pets.map((p) => ({ name: p.name, level: p.level, maxLevel: p.maxLevel ?? null })),
    builderBaseTroops: (builderBase.troops ?? []).map((t) => ({ name: t.name, level: t.level, maxLevel: t.maxLevel ?? null })),
    builderBaseHeroes: (builderBase.heroes ?? []).map((h) => ({ name: h.name, level: h.level, maxLevel: h.maxLevel ?? null })),
  };
}

/**
 * Compute rushed analysis from progression data using the API's maxLevel.
 * See concept/06-members.md §7 and lib/scoring/rushed.ts.
 */
function computeRushedFromProgression(p: {
  troops: Array<{ name: string; level: number; maxLevel: number | null }>;
  heroes: Array<{ name: string; level: number; maxLevel: number | null }>;
  heroEquipment: Array<{ name: string; level: number; maxLevel: number | null }>;
  spells: Array<{ name: string; level: number; maxLevel: number | null }>;
  pets: Array<{ name: string; level: number; maxLevel: number | null }>;
  builderBaseTroops: Array<{ name: string; level: number; maxLevel: number | null }>;
  builderBaseHeroes: Array<{ name: string; level: number; maxLevel: number | null }>;
}) {
  const result = computeRushed([
    { category: "Troops", items: p.troops },
    { category: "Heroes", items: p.heroes },
    { category: "Equipment", items: p.heroEquipment },
    { category: "Spells", items: p.spells },
    { category: "Pets", items: p.pets },
  ]);

  return {
    overallPercent: result.overallPercent,
    categoryBreakdown: result.categoryBreakdown.map((c) => ({
      category: c.category,
      percent: c.percent,
    })),
  };
}

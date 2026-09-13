/**
 * Server-side query layer for the Members page.
 *
 * See docs/concept/06-members.md and docs/concept/12 Step 1.3.A/B.
 * All functions are server-only — they import @/lib/db.
 */

import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  memberCareerSnapshots,
  wars,
  warParticipants,
  warAttacks,
  unitLevels,
  hallOfFameRecords,
} from "@/lib/db/schema";
import type {
  MemberRosterEntry,
  MemberRoster,
  MemberDetailView,
  CareerProgressWindow,
} from "@/lib/view-models/members";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { computeWindow, generateBuckets } from "@/lib/time/windows";
import { calculateDonationWindow } from "@/lib/scoring/donations";
import { diffCareerProgress } from "@/lib/scoring/career-deltas";
import { getMemberActivityScore } from "@/lib/db/queries";
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
  const [activityData, donationData, warData, progressionData, hofRecords, progress] =
    await Promise.all([
      getActivityDetail(member.playerTag),
      getDonationDetail(member.playerTag),
      getWarDetail(member.playerTag),
      getProgressionDetail(member.playerTag),
      db.select().from(hallOfFameRecords).where(eq(hallOfFameRecords.holderTag, member.playerTag)),
      getCareerProgress(member),
    ]);

  const hofMap = hofRecords.reduce((acc, r) => {
    acc[r.awardKey as keyof MemberDetailView["hallOfFame"]] = {
      rank: r.rank,
      valueLabel: r.valueLabel,
    };
    return acc;
  }, {} as Partial<MemberDetailView["hallOfFame"]>);

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
    progress,
    hallOfFame: {
      philanthropist: hofMap.philanthropist ?? null,
      vanguard: hofMap.vanguard ?? null,
      dedicated: hofMap.dedicated ?? null,
      capitalist: hofMap.capitalist ?? null,
      unsleeping: hofMap.unsleeping ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Career progress (Phase 3.1) — diffs member_career_snapshots against the
// live members row for the "Progress (window)" section.
// ---------------------------------------------------------------------------

/** Convert a member_career_snapshots row (or the live members row) into the
 *  pure module's CareerCapture shape. */
function toCareerCapture(row: {
  warStars: number | null;
  attackWins: number | null;
  defenseWins: number | null;
  clanCapitalContributions: number | null;
  expLevel: number | null;
  careerStats: unknown;
}): import("@/lib/scoring/career-deltas").CareerCapture {
  const payload = row.careerStats as {
    achievements?: Array<{
      name: string;
      value: number;
      target?: number | null;
    }>;
  } | null;
  return {
    scalars: {
      warStars: row.warStars,
      attackWins: row.attackWins,
      defenseWins: row.defenseWins,
      clanCapitalContributions: row.clanCapitalContributions,
      expLevel: row.expLevel,
    },
    achievements: (payload?.achievements ?? []).map((a) => ({
      name: a.name,
      value: a.value,
    })),
  };
}

/** The latest career snapshot at or before `from` — the window's baseline. */
async function careerBaselineAtOrBefore(
  playerTag: string,
  from: Date,
): Promise<typeof memberCareerSnapshots.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(memberCareerSnapshots)
    .where(
      and(
        eq(memberCareerSnapshots.playerTag, playerTag),
        lte(memberCareerSnapshots.capturedAt, from),
      ),
    )
    .orderBy(desc(memberCareerSnapshots.capturedAt))
    .limit(1);
  return row ?? null;
}

/** The earliest career snapshot for the member ("all" window baseline). */
async function earliestCareerSnapshot(
  playerTag: string,
): Promise<typeof memberCareerSnapshots.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(memberCareerSnapshots)
    .where(eq(memberCareerSnapshots.playerTag, playerTag))
    .orderBy(memberCareerSnapshots.capturedAt)
    .limit(1);
  return row ?? null;
}

function toProgressWindow(
  baseline: typeof memberCareerSnapshots.$inferSelect | null,
  current: import("@/lib/scoring/career-deltas").CareerCapture,
  partial: boolean,
): CareerProgressWindow {
  const prev = baseline ? toCareerCapture(baseline) : null;
  const diff = diffCareerProgress(prev, current);
  return {
    ...diff,
    baselineAt: baseline?.capturedAt ?? null,
    partial,
  };
}

async function getCareerProgress(
  member: typeof members.$inferSelect,
): Promise<MemberDetailView["progress"]> {
  const now = new Date();
  const current = toCareerCapture(member);

  // Earliest snapshot = the "all" baseline + the honest tracking-start date.
  const earliest = await earliestCareerSnapshot(member.playerTag);
  if (!earliest) {
    // No snapshots yet — the first daily batch after deploy writes them.
    const empty: CareerProgressWindow = {
      warStars: null,
      attackWins: null,
      defenseWins: null,
      clanCapitalContributions: null,
      expLevels: null,
      achievements: [],
      noChange: true,
      baselineAt: null,
      partial: false,
    };
    return {
      trackingStartedAt: null,
      windows: { "7d": empty, "30d": { ...empty }, all: { ...empty } },
    };
  }

  const win7 = computeWindow("7d", now);
  const win30 = computeWindow("30d", now);

  // Baselines for the two preset windows — the LAST snapshot at/before the
  // window start. When tracking started inside the window (no snapshot that
  // old), fall back to the earliest and flag the window partial.
  const [base7Row, base30Row] = await Promise.all([
    careerBaselineAtOrBefore(member.playerTag, win7.from),
    careerBaselineAtOrBefore(member.playerTag, win30.from),
  ]);

  const base7 = base7Row ?? earliest;
  const base30 = base30Row ?? earliest;

  return {
    trackingStartedAt: earliest.capturedAt,
    windows: {
      "7d": toProgressWindow(base7, current, base7Row === null),
      "30d": toProgressWindow(base30, current, base30Row === null),
      // "all" = the entire tracked history; the earliest snapshot is always
      // the right baseline and the window is never partial.
      all: toProgressWindow(earliest, current, false),
    },
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

  // The threshold for "active" is the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get the most recent ACTIVE snapshot per member.
  // fix B-10: DISTINCT ON returns exactly one row per member from Postgres
  // instead of fetching the entire activity-flagged snapshot history into JS
  // (which grows linearly forever — ~36k rows after two years of retained
  // last-of-day snapshots). Same pattern as fetchBoundedSnapshots.
  const result = await db.execute<{
    player_tag: string;
    captured_at: Date;
  }>(sql`
    SELECT DISTINCT ON (player_tag)
      player_tag, captured_at
    FROM member_snapshots
    WHERE player_tag = ANY(${sql.param(tags)}::text[])
      AND activity_flag = true
    ORDER BY player_tag, captured_at DESC
  `);
  const rows = result.rows ?? result;
  for (const r of rows) {
    const capturedAt =
      r.captured_at instanceof Date ? r.captured_at : new Date(r.captured_at);
    map.set(r.player_tag, {
      lastActiveAt: capturedAt,
      isActive: capturedAt >= sevenDaysAgo,
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

  // fix §4.10 (docs/2026-09-10 assessment DB opt 10): aggregate in SQL with a
  // GROUP BY instead of loading every war_participants row into JS — one row
  // per member instead of one row per (member, war) ever tracked.
  const rows = await db
    .select({
      playerTag: warParticipants.playerTag,
      warsTracked: sql<number>`count(*)::int`,
      warsMissed: sql<number>`sum(case when ${warParticipants.missed} then 1 else 0 end)::int`,
      attacksUsed: sql<number>`coalesce(sum(${warParticipants.attacksUsed}), 0)::int`,
      attacksAllowed: sql<number>`coalesce(sum(${warParticipants.attacksAllowed}), 0)::int`,
    })
    .from(warParticipants)
    .where(inArray(warParticipants.playerTag, tags))
    .groupBy(warParticipants.playerTag);

  for (const r of rows) {
    map.set(r.playerTag, {
      warsTracked: r.warsTracked,
      warsMissed: r.warsMissed,
      attacksUsed: r.attacksUsed,
      attacksAllowed: r.attacksAllowed,
    });
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

  // Build 30-day activity buckets by grouping snapshots into daily intervals
  const generatedBuckets = generateBuckets(win);
  
  const buckets = generatedBuckets.map((b, i) => {
    const bucketStart = b.timestamp;
    const bucketEnd = i < generatedBuckets.length - 1 ? generatedBuckets[i + 1]!.timestamp : win.to;
    
    // A day is active if any snapshot within that 24h window had activityFlag = true
    const active = snapshots.some(
      (s) => s.capturedAt >= bucketStart && s.capturedAt < bucketEnd && s.activityFlag
    );
    
    return {
      label: b.label,
      active,
      timestamp: bucketStart,
    };
  });

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

  const activityLeaderboard = await getMemberActivityScore("30d");
  const memberScore = activityLeaderboard.entries.find((e) => e.playerTag === playerTag);

  return {
    given24h,
    received24h,
    given7d,
    received7d,
    given30d,
    received30d,
    ratio: received30d > 0 ? given30d / received30d : null,
    buckets,
    activityScore: memberScore ? memberScore.totalScore : null,
    activityScoreRank: memberScore ? memberScore.rank : null,
    activityScoreComponents: memberScore ? memberScore.components : [],
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
  // Use generateBuckets to get exact daily boundaries
  const generatedBuckets = generateBuckets({ kind: "30d", from: win.from, to: win.to });
  
  const givenSnaps = snapshots.map((s) => ({
    capturedAt: s.capturedAt,
    donations: s.donations,
  }));
  const recvSnaps = snapshots.map((s) => ({
    capturedAt: s.capturedAt,
    donations: s.donationsReceived,
  }));

  const days: Array<{
    label: string;
    given: number;
    received: number;
    timestamp: Date;
  }> = [];

  for (let i = 0; i < generatedBuckets.length; i++) {
    const bucketStart = generatedBuckets[i]!.timestamp;
    const bucketEnd = i < generatedBuckets.length - 1 ? generatedBuckets[i + 1]!.timestamp : win.to;

    const dayWindow = { from: bucketStart, to: bucketEnd };
    
    days.push({
      label: generatedBuckets[i]!.label,
      given: calculateDonationWindow(givenSnaps, dayWindow),
      received: calculateDonationWindow(recvSnaps, dayWindow),
      timestamp: bucketStart,
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

  // Count 3-star attacks from the warAttacks table (was hardcoded to 0).
  const warIds = wpRows.map((wp) => wp.warId);
  let threeStarAttacks = 0;
  if (warIds.length > 0) {
    const threeStarRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warAttacks)
      .where(
        and(
          inArray(warAttacks.warId, warIds),
          eq(warAttacks.attackerTag, playerTag),
          eq(warAttacks.stars, 3),
        ),
      );
    threeStarAttacks = threeStarRows[0]?.count ?? 0;
  }

  const metrics = computeWarMetrics({
    warsTracked,
    warsMissed,
    totalAttacksUsed: attacksUsed,
    totalAttacksAllowed: attacksAllowed,
    totalStarsEarned: starsEarned,
    threeStarAttacks,
  });

  // Get recent wars
  // fix §4.10 (docs/2026-09-10 assessment DB opt 10): one inArray fetch for
  // all recent war rows instead of a per-war SELECT inside the loop
  // (10 sequential round-trips → 1).
  const recentWp = wpRows.slice(-10).reverse();
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

  if (recentWp.length > 0) {
    const warRows = await db
      .select({
        id: wars.id,
        opponentName: wars.opponentName,
        result: wars.result,
        endTime: wars.endTime,
      })
      .from(wars)
      .where(inArray(
        wars.id,
        recentWp.map((wp) => wp.warId),
      ));
    const warById = new Map(warRows.map((w) => [w.id, w]));

    for (const wp of recentWp) {
      const war = warById.get(wp.warId);
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
  }

  // Current war status.
  // involvesOwnClan filter (fix A-4): other clans' CWL wars must never be
  // treated as our current war here.
  const [currentWar] = await db
    .select()
    .from(wars)
    .where(and(sql`${wars.state} != 'warEnded'`, eq(wars.involvesOwnClan, true)))
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
 * See docs/concept/06-members.md §7 and lib/scoring/rushed.ts.
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

/**
 * Server-side query layer for the dashboard.
 *
 * This module owns application reads. Page components receive display-ready
 * view models (defined in @/lib/view-models/dashboard) and never depend on
 * raw Drizzle schema shape. See concept/12 Step 1.1.A.
 *
 * All functions are server-only — they import @/lib/db which requires a
 * DATABASE_URL. Never call these from a client component.
 */

import { and, desc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clans,
  members,
  memberSnapshots,
  membershipEvents,
  wars,
  warParticipants,
  capitalRaidSeasons,
  capitalContributions,
} from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  DashboardClan,
  ClanBadgeUrls,
  CapitalSummaryView,
  DonationTotals,
  DonationWindow,
  DonationLeaderboard,
  DonationLeaderboardEntry,
  DonationTimeline,
  DonationBucket,
  ActivityTimeline,
  ActivityBucket,
  ActivityScoreLeaderboard,
  MemberActivityScore,
  NeedsAttention,
  NeedsAttentionMember,
  ClanLog,
  ClanLogEntry,
  WarSummaryView,
  CapitalNavSummary,
  DashboardData,
} from "@/lib/view-models/dashboard";
import {
  calculateDonationWindow,
  type DonationSnapshot,
} from "@/lib/scoring/donations";
import {
  computeActivityScore,
  type ScoreInput,
  type ClanMaxValues,
} from "@/lib/scoring/activity-score";
// `getWarRecord` is a pure function extracted to lib/scoring/war-record.ts so
// it can be unit-tested without a DATABASE_URL. Re-exported here for API
// stability — callers should keep importing from @/lib/db/queries.
export { getWarRecord } from "@/lib/scoring/war-record";
import { getWarRecord } from "@/lib/scoring/war-record";
import { computeWindow, generateBuckets } from "@/lib/time/windows";

const CLAN_TAG = clanConfig.clanTag;

// ---------------------------------------------------------------------------
// Clan identity, war record, Capital summary
// ---------------------------------------------------------------------------

export async function getDashboardClan(): Promise<DashboardClan | null> {
  const [row] = await db
    .select()
    .from(clans)
    .where(eq(clans.clanTag, CLAN_TAG))
    .limit(1);

  if (!row) return null;

  return {
    tag: row.clanTag,
    name: row.name ?? "",
    description: row.description,
    type: row.type,
    isFamilyFriendly: row.isFamilyFriendly,
    badgeUrls: (row.badgeUrls as DashboardClan["badgeUrls"]) ?? null,
    clanLevel: row.clanLevel,
    memberCount: row.memberCount,
    clanPoints: row.clanPoints,
    clanCapitalPoints: row.clanCapitalPoints,
    location: (row.location as { name: string }) ?? null,
    chatLanguage:
      (row.chatLanguage as { name: string; languageCode: string }) ?? null,
    labels: (row.labels as DashboardClan["labels"]) ?? null,
    warFrequency: row.warFrequency,
    warLeague: (row.warLeague as { name: string }) ?? null,
    capitalLeague: (row.capitalLeague as { name: string }) ?? null,
    requiredTrophies: row.requiredTrophies,
    requiredTownhallLevel: row.requiredTownhallLevel,
    warWins: row.warWins,
    warTies: row.warTies,
    warLosses: row.warLosses,
    warWinStreak: row.warWinStreak,
    isWarLogPublic: row.isWarLogPublic,
    capitalHallLevel: row.capitalHallLevel,
    lastPolledAt: row.lastPolledAt,
    lastDailyBatchAt: row.lastDailyBatchAt,
  };
}

// getWarRecord is imported from @/lib/scoring/war-record (see re-export above).

export async function getCapitalSummary(): Promise<CapitalSummaryView> {
  const [clan] = await db
    .select({
      capitalHallLevel: clans.capitalHallLevel,
      capitalPoints: clans.clanCapitalPoints,
      capitalLeague: clans.capitalLeague,
      districtsPayload: clans.districtsPayload,
      lastPolledAt: clans.lastPolledAt,
    })
    .from(clans)
    .where(eq(clans.clanTag, CLAN_TAG))
    .limit(1);

  const districts = (clan?.districtsPayload as CapitalSummaryView["districts"]) ?? null;

  return {
    capitalHallLevel: clan?.capitalHallLevel ?? null,
    capitalPoints: clan?.capitalPoints ?? null,
    capitalLeague: (clan?.capitalLeague as { name: string }) ?? null,
    districtCount: districts?.length ?? null,
    districts,
    lastCaptureAt: clan?.lastPolledAt ?? null,
  };
}

export async function getCapitalNavSummary(): Promise<CapitalNavSummary> {
  const summary = await getCapitalSummary();
  return {
    capitalHallLevel: summary.capitalHallLevel,
    capitalPoints: summary.capitalPoints,
    capitalLeague: summary.capitalLeague,
    districtCount: summary.districtCount,
    lastCaptureAt: summary.lastCaptureAt,
  };
}

// ---------------------------------------------------------------------------
// Donation analytics
// ---------------------------------------------------------------------------

export async function getDonationTotals(
  windowKind: DonationWindow,
): Promise<DonationTotals> {
  const win = computeWindow(windowKind);
  const trackingStart = await getTrackingStart();

  const retainedMembers = await getRetainedMembers();
  if (retainedMembers.length === 0) {
    return emptyDonationTotals(windowKind, trackingStart);
  }

  const tags = retainedMembers.map((m) => m.playerTag);
  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      donationsReceived: memberSnapshots.donationsReceived,
    })
    .from(memberSnapshots)
    .where(
      and(
        inArray(memberSnapshots.playerTag, tags),
        gte(memberSnapshots.capturedAt, win.from),
        lte(memberSnapshots.capturedAt, win.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  // Group by member
  const byMember = new Map<string, DonationSnapshot[]>();
  for (const s of snapshots) {
    const arr = byMember.get(s.playerTag) ?? [];
    arr.push({ capturedAt: s.capturedAt, donations: s.donations });
    byMember.set(s.playerTag, arr);
  }

  // Also fetch received snapshots separately
  const receivedByMember = new Map<string, DonationSnapshot[]>();
  for (const s of snapshots) {
    const arr = receivedByMember.get(s.playerTag) ?? [];
    arr.push({
      capturedAt: s.capturedAt,
      donations: s.donationsReceived,
    });
    receivedByMember.set(s.playerTag, arr);
  }

  let given = 0;
  let received = 0;
  for (const tag of tags) {
    const givenSnaps = byMember.get(tag) ?? [];
    const recvSnaps = receivedByMember.get(tag) ?? [];
    // For the window calculation, we need a baseline snapshot just before the window.
    // calculateDonationWindow handles this, but we need to pass ALL snapshots for the member,
    // not just the in-window ones, so it can find the baseline.
    given += calculateDonationWindow(givenSnaps, win);
    received += calculateDonationWindow(recvSnaps, win);
  }

  const hasPartialData =
    trackingStart !== null && trackingStart > win.from;

  return {
    window: windowKind,
    given,
    received,
    ratio: received > 0 ? given / received : null,
    trackingStart,
    hasPartialData,
  };
}

export async function getDonationLeaderboard(
  windowKind: DonationWindow,
  limit = 10,
): Promise<DonationLeaderboard> {
  const win = computeWindow(windowKind);
  const retainedMembers = await getRetainedMembers();

  if (retainedMembers.length === 0) {
    return { window: windowKind, topDonors: [], topReceivers: [] };
  }

  const tags = retainedMembers.map((m) => m.playerTag);
  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      donationsReceived: memberSnapshots.donationsReceived,
    })
    .from(memberSnapshots)
    .where(
      and(
        inArray(memberSnapshots.playerTag, tags),
        gte(memberSnapshots.capturedAt, win.from),
        lte(memberSnapshots.capturedAt, win.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  const memberMap = new Map(retainedMembers.map((m) => [m.playerTag, m]));

  // Compute per-member donation totals
  const donorEntries: Array<{
    playerTag: string;
    name: string;
    role: string;
    townHallLevel: number | null;
    given: number;
    received: number;
  }> = [];

  for (const tag of tags) {
    const member = memberMap.get(tag);
    if (!member) continue;

    const memberSnaps = snapshots
      .filter((s) => s.playerTag === tag)
      .map((s) => ({ capturedAt: s.capturedAt, donations: s.donations }));

    const recvSnaps = snapshots
      .filter((s) => s.playerTag === tag)
      .map((s) => ({ capturedAt: s.capturedAt, donations: s.donationsReceived }));

    const given = calculateDonationWindow(memberSnaps, win);
    const received = calculateDonationWindow(recvSnaps, win);

    donorEntries.push({
      playerTag: tag,
      name: member.name,
      role: member.role,
      townHallLevel: member.townHallLevel,
      given,
      received,
    });
  }

  const topDonors: DonationLeaderboardEntry[] = donorEntries
    .sort((a, b) => b.given - a.given)
    .slice(0, limit)
    .map((e, i) => ({
      playerTag: e.playerTag,
      name: e.name,
      role: e.role,
      townHallLevel: e.townHallLevel,
      total: e.given,
      rank: i + 1,
    }));

  const topReceivers: DonationLeaderboardEntry[] = donorEntries
    .sort((a, b) => b.received - a.received)
    .slice(0, limit)
    .map((e, i) => ({
      playerTag: e.playerTag,
      name: e.name,
      role: e.role,
      townHallLevel: e.townHallLevel,
      total: e.received,
      rank: i + 1,
    }));

  return { window: windowKind, topDonors, topReceivers };
}

export async function getDonationTimeline(
  windowKind: DonationWindow,
): Promise<DonationTimeline> {
  const win = computeWindow(windowKind);
  const buckets = generateBuckets(win);
  const trackingStart = await getTrackingStart();

  const retainedMembers = await getRetainedMembers();
  if (retainedMembers.length === 0) {
    return { window: windowKind, buckets: [], hasPartialData: false };
  }

  const tags = retainedMembers.map((m) => m.playerTag);

  // Fetch ALL snapshots in the window PLUS the last snapshot before the window
  // started (as a baseline for the first bucket's delta).
  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      donationsReceived: memberSnapshots.donationsReceived,
    })
    .from(memberSnapshots)
    .where(
      and(
        inArray(memberSnapshots.playerTag, tags),
        lte(memberSnapshots.capturedAt, win.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  // For each bucket, compute the reset-aware donation DELTA (not the raw
  // cumulative counter). The delta is the sum of per-pair differences for
  // snapshots that fall within that bucket, using the last pre-bucket
  // snapshot as the baseline. See concept/04-activity-tracking-and-polling.md
  // "Reset-aware donation accounting".
  const donationBuckets: DonationBucket[] = buckets.map((b, i) => {
    const bucketStart = b.timestamp;
    const bucketEnd =
      i < buckets.length - 1 ? buckets[i + 1]!.timestamp : win.to;

    let given = 0;
    let received = 0;

    for (const tag of tags) {
      const memberSnaps = snapshots
        .filter(
          (s) =>
            s.playerTag === tag && s.capturedAt <= bucketEnd,
        )
        .sort((a, b2) => a.capturedAt.getTime() - b2.capturedAt.getTime());

      if (memberSnaps.length === 0) continue;

      // Find the baseline: last snapshot at or before bucketStart
      let baselineGiven: number | null = null;
      let baselineReceived: number | null = null;
      const inBucket: typeof memberSnaps = [];

      for (const s of memberSnaps) {
        if (s.capturedAt <= bucketStart) {
          baselineGiven = s.donations;
          baselineReceived = s.donationsReceived;
        } else if (s.capturedAt > bucketStart && s.capturedAt <= bucketEnd) {
          inBucket.push(s);
        }
      }

      if (inBucket.length === 0) continue;

      // Compute deltas using the reset-aware rule
      let prevGiven = baselineGiven;
      let prevReceived = baselineReceived;

      for (const s of inBucket) {
        if (prevGiven !== null) {
          if (s.donations >= prevGiven) {
            given += s.donations - prevGiven;
          } else {
            // Weekly reset — new counter value is the contribution
            given += s.donations;
          }
        }
        if (prevReceived !== null) {
          if (s.donationsReceived >= prevReceived) {
            received += s.donationsReceived - prevReceived;
          } else {
            received += s.donationsReceived;
          }
        }
        prevGiven = s.donations;
        prevReceived = s.donationsReceived;
      }
    }

    return {
      label: b.label,
      given,
      received,
      timestamp: b.timestamp,
    };
  });

  return {
    window: windowKind,
    buckets: donationBuckets,
    hasPartialData: trackingStart !== null && trackingStart > win.from,
  };
}

// ---------------------------------------------------------------------------
// Activity timeline
// ---------------------------------------------------------------------------

export async function getActivityTimeline(
  windowKind: DonationWindow,
): Promise<ActivityTimeline> {
  const win = computeWindow(windowKind);
  const buckets = generateBuckets(win);
  const trackingStart = await getTrackingStart();

  const retainedMembers = await getRetainedMembers();
  const totalMembers = retainedMembers.length;

  if (totalMembers === 0) {
    return {
      window: windowKind,
      buckets: [],
      totalActiveMembers: 0,
      totalMembers: 0,
      hasPartialData: false,
    };
  }

  const tags = retainedMembers.map((m) => m.playerTag);
  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      activityFlag: memberSnapshots.activityFlag,
    })
    .from(memberSnapshots)
    .where(
      and(
        inArray(memberSnapshots.playerTag, tags),
        gte(memberSnapshots.capturedAt, win.from),
        lte(memberSnapshots.capturedAt, win.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  // Bucket activity
  const activityBuckets: ActivityBucket[] = buckets.map((b, i) => {
    const bucketStart = b.timestamp;
    const bucketEnd = i < buckets.length - 1 ? buckets[i + 1]!.timestamp : win.to;
    const inBucket = snapshots.filter(
      (s) => s.capturedAt >= bucketStart && s.capturedAt < bucketEnd,
    );
    const activeTags = new Set(
      inBucket.filter((s) => s.activityFlag).map((s) => s.playerTag),
    );
    return {
      label: b.label,
      activeMembers: activeTags.size,
      totalMembers,
      percent: totalMembers > 0 ? (activeTags.size / totalMembers) * 100 : 0,
      timestamp: b.timestamp,
    };
  });

  const totalActive = new Set(
    snapshots.filter((s) => s.activityFlag).map((s) => s.playerTag),
  ).size;

  return {
    window: windowKind,
    buckets: activityBuckets,
    totalActiveMembers: totalActive,
    totalMembers,
    hasPartialData: trackingStart !== null && trackingStart > win.from,
  };
}

// ---------------------------------------------------------------------------
// Member Activity Score leaderboard
// ---------------------------------------------------------------------------

export async function getMemberActivityScore(
  windowKind: DonationWindow = "30d",
): Promise<ActivityScoreLeaderboard> {
  const win = computeWindow(windowKind);
  const trackingStart = await getTrackingStart();
  const minWars = clanConfig.minWarsForConfidentRanking;

  const retainedMembers = await getRetainedMembers();
  if (retainedMembers.length === 0) {
    return { window: windowKind, entries: [], totalMembers: 0 };
  }

  // --- Gather per-member source values ---

  // 1. Donation totals (reset-aware)
  const tags = retainedMembers.map((m) => m.playerTag);
  const allSnapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      donationsReceived: memberSnapshots.donationsReceived,
      activityFlag: memberSnapshots.activityFlag,
    })
    .from(memberSnapshots)
    .where(
      and(
        inArray(memberSnapshots.playerTag, tags),
        gte(memberSnapshots.capturedAt, win.from),
        lte(memberSnapshots.capturedAt, win.to),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  // 2. War participation (tracked wars in the window)
  const warsInWindow = await db
    .select({ id: wars.id, endTime: wars.endTime })
    .from(wars)
    .where(
      and(
        eq(wars.warType, "regular"),
        gte(wars.endTime, win.from),
        lte(wars.endTime, win.to),
      ),
    );

  const warIds = warsInWindow.map((w) => w.id);
  const warParticipationMap = new Map<string, { used: number; allowed: number; warsTracked: number }>();

  if (warIds.length > 0) {
    const wpRows = await db
      .select()
      .from(warParticipants)
      .where(inArray(warParticipants.warId, warIds));

    for (const wp of wpRows) {
      const existing = warParticipationMap.get(wp.playerTag) ?? {
        used: 0,
        allowed: 0,
        warsTracked: 0,
      };
      existing.used += wp.attacksUsed;
      existing.allowed += wp.attacksAllowed;
      existing.warsTracked += 1;
      warParticipationMap.set(wp.playerTag, existing);
    }
  }

  // 3. Capital contribution (completed raid seasons in the window)
  const raidSeasons = await db
    .select({ id: capitalRaidSeasons.id, endTime: capitalRaidSeasons.endTime })
    .from(capitalRaidSeasons)
    .where(
      and(
        gte(capitalRaidSeasons.endTime, win.from),
        lte(capitalRaidSeasons.endTime, win.to),
      ),
    );

  const raidIds = raidSeasons.map((r) => r.id);
  const capitalMap = new Map<string, number>();

  if (raidIds.length > 0) {
    const contribRows = await db
      .select()
      .from(capitalContributions)
      .where(inArray(capitalContributions.raidSeasonId, raidIds));

    for (const c of contribRows) {
      capitalMap.set(
        c.playerTag,
        (capitalMap.get(c.playerTag) ?? 0) + c.capitalResourcesLooted,
      );
    }
  }

  // --- Build ScoreInput per member ---
  const scoreInputs: ScoreInput[] = [];
  for (const member of retainedMembers) {
    const memberSnaps = allSnapshots.filter((s) => s.playerTag === member.playerTag);

    // Donations given (reset-aware)
    const donationSnaps: DonationSnapshot[] = memberSnaps.map((s) => ({
      capturedAt: s.capturedAt,
      donations: s.donations,
    }));
    const donationsGiven = calculateDonationWindow(donationSnaps, win);

    // Observed activity rate
    const activeIntervals = memberSnaps.filter((s) => s.activityFlag).length;
    const totalIntervals = memberSnaps.length;
    const observedActivityRate =
      totalIntervals > 0 ? activeIntervals / totalIntervals : 0;

    // War participation
    const wp = warParticipationMap.get(member.playerTag);
    const warAttacksUsed = wp?.used ?? null;
    const warAttacksAllowed = wp?.allowed ?? null;

    // Capital contribution
    const capitalContribution = capitalMap.get(member.playerTag) ?? null;

    scoreInputs.push({
      playerTag: member.playerTag,
      name: member.name,
      role: member.role,
      townHallLevel: member.townHallLevel,
      league: (member.league as { name: string; iconUrls?: ClanBadgeUrls }) ?? null,
      leagueTier: (member.leagueTier as { name: string; iconUrls?: ClanBadgeUrls }) ?? null,
      warPreference: (member.warPreference as "in" | "out") ?? null,
      donationsGiven,
      observedActivityRate,
      warAttacksUsed,
      warAttacksAllowed,
      capitalContribution,
    });
  }

  // --- Compute clan max values for normalization ---
  const maxDonations = Math.max(...scoreInputs.map((s) => s.donationsGiven), 0);
  const maxActivityRate = Math.max(
    ...scoreInputs.map((s) => s.observedActivityRate),
    1,
  );
  const maxCapitalContribution = Math.max(
    ...scoreInputs.map((s) => s.capitalContribution ?? 0),
    0,
  );

  const clanMax: ClanMaxValues = {
    maxDonations,
    maxActivityRate,
    maxCapitalContribution,
  };

  // --- Compute scores ---
  const scored = scoreInputs.map((input) => {
    const wp = warParticipationMap.get(input.playerTag);
    const limitedData = (wp?.warsTracked ?? 0) < minWars;
    const score = computeActivityScore(
      input,
      clanMax,
      windowKind,
      trackingStart,
      limitedData,
    );
    return score;
  });

  // Sort by totalScore desc and assign rank
  scored.sort((a, b) => b.totalScore - a.totalScore);
  const entries: MemberActivityScore[] = scored.map((s, i) => ({
    ...s,
    rank: i + 1,
  }));

  return {
    window: windowKind,
    entries,
    totalMembers: retainedMembers.length,
  };
}

// ---------------------------------------------------------------------------
// Needs attention
// ---------------------------------------------------------------------------

export async function getNeedsAttention(): Promise<NeedsAttention> {
  const thresholdDays = 7; // TODO: make configurable via runtime_settings
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - thresholdDays);

  const retainedMembers = await getRetainedMembers();

  const inactive: NeedsAttentionMember[] = [];
  const attacksRemaining: NeedsAttentionMember[] = [];
  const warPreferenceOut: NeedsAttentionMember[] = [];

  // Get the latest snapshot per member to determine last activity
  const tags = retainedMembers.map((m) => m.playerTag);
  const latestActivity = new Map<string, Date>();

  if (tags.length > 0) {
    const recentSnaps = await db
      .select({
        playerTag: memberSnapshots.playerTag,
        capturedAt: memberSnapshots.capturedAt,
        activityFlag: memberSnapshots.activityFlag,
      })
      .from(memberSnapshots)
      .where(inArray(memberSnapshots.playerTag, tags))
      .orderBy(memberSnapshots.playerTag, desc(memberSnapshots.capturedAt));

    for (const s of recentSnaps) {
      if (!latestActivity.has(s.playerTag) && s.activityFlag) {
        latestActivity.set(s.playerTag, s.capturedAt);
      }
    }
  }

  // Get current war participants with attacks remaining
  const [currentWar] = await db
    .select()
    .from(wars)
    .where(ne(wars.state, "warEnded"))
    .orderBy(desc(wars.id))
    .limit(1);

  const warAttackMap = new Map<string, { used: number; allowed: number }>();
  if (currentWar) {
    const wpRows = await db
      .select()
      .from(warParticipants)
      .where(eq(warParticipants.warId, currentWar.id));
    for (const wp of wpRows) {
      warAttackMap.set(wp.playerTag, {
        used: wp.attacksUsed,
        allowed: wp.attacksAllowed,
      });
    }
  }

  for (const member of retainedMembers) {
    const lastActive = latestActivity.get(member.playerTag);

    // Inactive check
    if (!lastActive || lastActive < threshold) {
      inactive.push({
        playerTag: member.playerTag,
        name: member.name,
        role: member.role,
        townHallLevel: member.townHallLevel,
        reason: "Inactive",
        detail: lastActive
          ? `Last active ${lastActive.toISOString().split("T")[0]}`
          : "No tracked activity yet",
      });
    }

    // Attacks remaining in active war
    if (currentWar && currentWar.state === "inWar") {
      const wp = warAttackMap.get(member.playerTag);
      if (wp && wp.used < wp.allowed) {
        attacksRemaining.push({
          playerTag: member.playerTag,
          name: member.name,
          role: member.role,
          townHallLevel: member.townHallLevel,
          reason: `${wp.allowed - wp.used} attack(s) remaining`,
          detail: currentWar.opponentName
            ? `vs ${currentWar.opponentName}`
            : null,
        });
      }
    }

    // War preference out
    if (member.warPreference === "out") {
      warPreferenceOut.push({
        playerTag: member.playerTag,
        name: member.name,
        role: member.role,
        townHallLevel: member.townHallLevel,
        reason: "Opted out of wars",
        detail: "Informational — not an error",
      });
    }
  }

  return {
    inactive,
    attacksRemaining,
    warPreferenceOut,
    inactivityThresholdDays: thresholdDays,
  };
}

// ---------------------------------------------------------------------------
// Clan log (membership events)
// ---------------------------------------------------------------------------

export async function getClanLog(
  limit = 20,
  windowDays = 30,
): Promise<ClanLog> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const events = await db
    .select({
      id: membershipEvents.id,
      playerTag: membershipEvents.playerTag,
      nameAtEvent: membershipEvents.nameAtEvent,
      eventType: membershipEvents.eventType,
      eventTime: membershipEvents.eventTime,
    })
    .from(membershipEvents)
    .where(gte(membershipEvents.eventTime, windowStart))
    .orderBy(desc(membershipEvents.eventTime))
    .limit(limit);

  // Check which members are purged (no longer in members table)
  const eventTags = [...new Set(events.map((e) => e.playerTag))];
  const retainedTags = new Set<string>();
  if (eventTags.length > 0) {
    const retained = await db
      .select({ playerTag: members.playerTag })
      .from(members)
      .where(inArray(members.playerTag, eventTags));
    for (const r of retained) retainedTags.add(r.playerTag);
  }

  const entries: ClanLogEntry[] = events.map((e) => ({
    id: e.id,
    playerTag: e.playerTag,
    name: e.nameAtEvent,
    eventType: e.eventType as "join" | "leave" | "rejoin",
    eventTime: e.eventTime,
    isPurged: !retainedTags.has(e.playerTag),
  }));

  return { entries, limit };
}

// ---------------------------------------------------------------------------
// War summary
// ---------------------------------------------------------------------------

export async function getDashboardWarSummary(): Promise<WarSummaryView> {
  const [currentWar] = await db
    .select()
    .from(wars)
    .orderBy(desc(wars.id))
    .limit(1);

  if (!currentWar) {
    return {
      state: null,
      opponentName: null,
      opponentTag: null,
      teamSize: null,
      ownStars: null,
      opponentStars: null,
      ownDestructionPercentage: null,
      opponentDestructionPercentage: null,
      ownAttacks: null,
      opponentAttacks: null,
      attacksPerMember: null,
      startTime: null,
      endTime: null,
      lastSyncedAt: null,
    };
  }

  return {
    state: currentWar.state as WarSummaryView["state"],
    opponentName: currentWar.opponentName,
    opponentTag: currentWar.opponentTag,
    teamSize: currentWar.teamSize,
    ownStars: currentWar.ownStars,
    opponentStars: currentWar.opponentStars,
    ownDestructionPercentage: currentWar.ownDestructionPercentage,
    opponentDestructionPercentage: currentWar.opponentDestructionPercentage,
    ownAttacks: currentWar.ownAttacks,
    opponentAttacks: currentWar.opponentAttacks,
    attacksPerMember: currentWar.attacksPerMember,
    startTime: currentWar.startTime,
    endTime: currentWar.endTime,
    lastSyncedAt: currentWar.lastSyncedAt,
  };
}

// ---------------------------------------------------------------------------
// Aggregate dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(): Promise<DashboardData> {
  // Fetch all 3 windows of donation + activity data in parallel, plus the
  // single-window data (clan, capital, activity score, needs attention, etc.).
  // The 24h/7d/30d tabs switch client-side with no API calls.
  const [
    clan,
    capital,
    donations24h,
    donationTimeline24h,
    donationLeaderboard24h,
    donations7d,
    donationTimeline7d,
    donationLeaderboard7d,
    donations30d,
    donationTimeline30d,
    donationLeaderboard30d,
    activityTimeline24h,
    activityTimeline7d,
    activityTimeline30d,
    activityScore,
    needsAttention,
    clanLog,
    warSummary,
    capitalNav,
    trackingStart,
  ] = await Promise.all([
    getDashboardClan(),
    getCapitalSummary(),
    getDonationTotals("24h"),
    getDonationTimeline("24h"),
    getDonationLeaderboard("24h"),
    getDonationTotals("7d"),
    getDonationTimeline("7d"),
    getDonationLeaderboard("7d"),
    getDonationTotals("30d"),
    getDonationTimeline("30d"),
    getDonationLeaderboard("30d"),
    getActivityTimeline("24h"),
    getActivityTimeline("7d"),
    getActivityTimeline("30d"),
    getMemberActivityScore("30d"),
    getNeedsAttention(),
    getClanLog(),
    getDashboardWarSummary(),
    getCapitalNavSummary(),
    getTrackingStart(),
  ]);

  return {
    clan: clan ?? emptyClan(),
    warRecord: getWarRecord(clan),
    capital,
    // 24h
    donations: donations24h,
    donationTimeline: donationTimeline24h,
    donationLeaderboard: donationLeaderboard24h,
    // 7d
    donations7d,
    donationTimeline7d,
    donationLeaderboard7d,
    // 30d
    donations30d,
    donationTimeline30d,
    donationLeaderboard30d,
    // Activity
    activityTimeline: activityTimeline24h,
    activityTimeline7d,
    activityTimeline30d,
    activityScore,
    needsAttention,
    clanLog,
    warSummary,
    capitalNav,
    trackingStart,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getRetainedMembers() {
  return db
    .select({
      playerTag: members.playerTag,
      name: members.name,
      role: members.role,
      townHallLevel: members.townHallLevel,
      warPreference: members.warPreference,
      league: members.league,
      leagueTier: members.leagueTier,
    })
    .from(members)
    .where(isNull(members.leftAt));
}

async function getTrackingStart(): Promise<Date | null> {
  const [row] = await db
    .select({ minDate: sql<string>`min(${memberSnapshots.capturedAt})` })
    .from(memberSnapshots);
  if (!row?.minDate) return null;
  return new Date(row.minDate);
}

function emptyClan(): DashboardClan {
  return {
    tag: CLAN_TAG,
    name: "",
    description: null,
    type: null,
    isFamilyFriendly: null,
    badgeUrls: null,
    clanLevel: null,
    memberCount: null,
    clanPoints: null,
    clanCapitalPoints: null,
    location: null,
    chatLanguage: null,
    labels: null,
    warFrequency: null,
    warLeague: null,
    capitalLeague: null,
    requiredTrophies: null,
    requiredTownhallLevel: null,
    warWins: null,
    warTies: null,
    warLosses: null,
    warWinStreak: null,
    isWarLogPublic: null,
    capitalHallLevel: null,
    lastPolledAt: null,
    lastDailyBatchAt: null,
  };
}

function emptyDonationTotals(
  window: DonationWindow,
  trackingStart: Date | null,
): DonationTotals {
  return {
    window,
    given: 0,
    received: 0,
    ratio: null,
    trackingStart,
    hasPartialData: false,
  };
}

// Re-export for backwards compat with any existing imports
export { getRetainedMembers as getMembers };

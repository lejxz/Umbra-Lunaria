/**
 * Server-side query layer for the Clan Capital page (concept/08-clan-capital.md).
 *
 * Owns application reads only. Page components receive the `CapitalPageData`
 * view model (defined in @/lib/view-models/capital) and never depend on raw
 * Drizzle rows. See concept/12 Step 1.5.
 *
 * The pure district-diff logic lives in `lib/capital/district-diff.ts` so it
 * can be unit-tested without a database.
 *
 * Server-only — imports @/lib/db which requires a DATABASE_URL. Never call
 * from a client component.
 */

import { asc, desc, eq, sql, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clans, capitalDistrictSnapshots, capitalRaidSeasons, capitalContributions, members } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import { cocClient } from "@/lib/coc-client/client";
import { parseCoCTime } from "@/lib/ingest/war-sync";
import type {
  CapitalPageData,
  CapitalOverview,
  CapitalDistrict,
  DistrictUpgradeHistory,
  RaidHistoryView,
  RaidSeasonSummary,
  RaidContributionEntry,
  RaidZeroAttackEntry,
  RaidParticipationSummary,
  RaidTimer,
} from "@/lib/view-models/capital";
import {
  diffDistrictSnapshots,
  type DistrictSnapshotRow,
} from "@/lib/capital/district-diff";

// ---------------------------------------------------------------------------
// getCapitalPage — the single read the /capital page needs.
// ---------------------------------------------------------------------------

export async function getCapitalPage(): Promise<CapitalPageData> {
  const [overview, upgradeHistory, raidHistory, raidTimer] = await Promise.all([
    getCapitalOverview(),
    getDistrictUpgradeHistory(),
    getRaidHistory(),
    getRaidTimer(),
  ]);

  return {
    overview,
    upgradeHistory,
    raidHistoryAvailable: raidHistory !== null && raidHistory.seasons.length > 0,
    raidHistory,
    raidTimer,
  };
}

// ---------------------------------------------------------------------------
// getCapitalOverview — current Capital facts from the cached clan row.
// ---------------------------------------------------------------------------

export async function getCapitalOverview(): Promise<CapitalOverview> {
  const [clan] = await db
    .select({
      capitalHallLevel: clans.capitalHallLevel,
      clanCapitalPoints: clans.clanCapitalPoints,
      capitalLeague: clans.capitalLeague,
      districtsPayload: clans.districtsPayload,
      lastPolledAt: clans.lastPolledAt,
      lastDailyBatchAt: clans.lastDailyBatchAt,
    })
    .from(clans)
    .where(eq(clans.clanTag, clanConfig.clanTag))
    .limit(1);

  // Latest district-snapshot capture time (more precise than lastDailyBatchAt
  // for the "when was Capital last captured" freshness label).
  const [lastSnap] = await db
    .select({ max: sql<Date>`max(${capitalDistrictSnapshots.capturedAt})` })
    .from(capitalDistrictSnapshots);
  const lastCaptureAt = lastSnap?.max ?? clan?.lastDailyBatchAt ?? null;

  if (!clan) {
    return {
      capitalHallLevel: null,
      capitalPoints: null,
      capitalLeague: null,
      districtCount: null,
      districts: [],
      lastCaptureAt: null,
      hasDistricts: false,
    };
  }

  const districts = parseDistricts(clan.districtsPayload);

  return {
    capitalHallLevel: clan.capitalHallLevel ?? null,
    capitalPoints: clan.clanCapitalPoints ?? null,
    capitalLeague: (clan.capitalLeague as { name: string } | null) ?? null,
    districtCount: districts.length,
    districts,
    lastCaptureAt,
    hasDistricts: districts.length > 0,
  };
}

// ---------------------------------------------------------------------------
// getDistrictUpgradeHistory — diff daily snapshots into upgrade events.
// ---------------------------------------------------------------------------

export async function getDistrictUpgradeHistory(): Promise<DistrictUpgradeHistory> {
  const rows = await db
    .select({
      districtName: capitalDistrictSnapshots.districtName,
      districtHallLevel: capitalDistrictSnapshots.districtHallLevel,
      capturedAt: capitalDistrictSnapshots.capturedAt,
    })
    .from(capitalDistrictSnapshots)
    .orderBy(
      asc(capitalDistrictSnapshots.districtName),
      asc(capitalDistrictSnapshots.capturedAt),
    );

  const snapshotRows: DistrictSnapshotRow[] = rows.map((r) => ({
    districtName: r.districtName,
    districtHallLevel: r.districtHallLevel,
    capturedAt: r.capturedAt,
  }));

  const events = diffDistrictSnapshots(snapshotRows);

  // Distinct district names (for the filter), sorted alphabetically.
  const districtNames = Array.from(
    new Set(snapshotRows.map((r) => r.districtName)),
  ).sort((a, b) => a.localeCompare(b));

  // Earliest capture time.
  const [earliest] = await db
    .select({ min: sql<Date>`min(${capitalDistrictSnapshots.capturedAt})` })
    .from(capitalDistrictSnapshots);
  const trackingStart = earliest?.min ?? null;

  // Cold start = only one snapshot per district (no diffs possible). Compute
  // by checking if any district has > 1 snapshot.
  const counts = new Map<string, number>();
  for (const r of snapshotRows) {
    counts.set(r.districtName, (counts.get(r.districtName) ?? 0) + 1);
  }
  const isColdStart =
    snapshotRows.length === 0 ||
    Array.from(counts.values()).every((c) => c <= 1);

  return {
    events,
    districtNames,
    trackingStart,
    isColdStart,
  };
}

// ---------------------------------------------------------------------------
// getRaidHistory — completed raid-weekend history (Step 3.1).
// ---------------------------------------------------------------------------

const RAID_HISTORY_LIMIT = 12; // ~3 months of weekly raid weekends.

/**
 * Build the raid-history view model from capital_raid_seasons +
 * capital_contributions. Returns null when no completed seasons have been
 * ingested yet (the UI shows a truthful "pending" state in that case).
 *
 * Four sections (concept/08 §"Raid-weekend history"):
 *   - seasons: the most recent N completed seasons (newest first).
 *   - contributionLeaderboard: all-time totals per member, sorted by looted.
 *   - zeroAttackList: members who recorded 0 attacks in the latest season.
 *   - participation: latest + average participation rates.
 */
export async function getRaidHistory(): Promise<RaidHistoryView | null> {
  const seasons = await db
    .select()
    .from(capitalRaidSeasons)
    .orderBy(desc(capitalRaidSeasons.startTime))
    .limit(RAID_HISTORY_LIMIT);

  if (seasons.length === 0) return null;

  const seasonIds = seasons.map((s) => s.id);

  // Per-season participant counts (for the season summary + participation).
  const participantCounts = await db
    .select({
      raidSeasonId: capitalContributions.raidSeasonId,
      count: sql<number>`count(*)::int`,
    })
    .from(capitalContributions)
    .where(inArray(capitalContributions.raidSeasonId, seasonIds))
    .groupBy(capitalContributions.raidSeasonId);
  const countBySeason = new Map(
    participantCounts.map((r) => [r.raidSeasonId, r.count]),
  );

  const seasonSummaries: RaidSeasonSummary[] = seasons.map((s) => ({
    seasonId: s.id,
    startTime: s.startTime,
    endTime: s.endTime,
    capitalTotalLoot: s.capitalTotalLoot ?? null,
    raidsCompleted: s.raidsCompleted ?? null,
    totalAttacks: s.totalAttacks ?? null,
    offensiveReward: s.offensiveReward ?? null,
    defensiveReward: s.defensiveReward ?? null,
    participantCount: countBySeason.get(s.id) ?? 0,
  }));

  // Contribution leaderboard — all-time totals per member across these seasons.
  const leaderboard = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      totalAttacks: sql<number>`coalesce(sum(${capitalContributions.attacksUsed}), 0)::int`,
      totalCapitalResourcesLooted: sql<number>`coalesce(sum(${capitalContributions.capitalResourcesLooted}), 0)::int`,
      totalRaidWeekendMedals: sql<number>`coalesce(sum(coalesce(${capitalContributions.raidWeekendMedals}, 0)), 0)::int`,
      seasonsParticipated: sql<number>`count(distinct ${capitalContributions.raidSeasonId})::int`,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .where(inArray(capitalContributions.raidSeasonId, seasonIds))
    .groupBy(capitalContributions.playerTag, members.name)
    .orderBy(desc(sql`sum(${capitalContributions.capitalResourcesLooted})`))
    .limit(20);

  const contributionLeaderboard: RaidContributionEntry[] = leaderboard.map((r) => ({
    playerTag: r.playerTag,
    name: r.name,
    totalAttacks: r.totalAttacks,
    totalCapitalResourcesLooted: r.totalCapitalResourcesLooted,
    totalRaidWeekendMedals: r.totalRaidWeekendMedals,
    seasonsParticipated: r.seasonsParticipated,
  }));

  // Zero-attack list for the most recent season.
  const latestSeason = seasons[0]!;
  const zeroAttackRows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      attackLimit: capitalContributions.attackLimit,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .where(
      and(
        eq(capitalContributions.raidSeasonId, latestSeason.id),
        eq(capitalContributions.attacksUsed, 0),
      ),
    )
    .orderBy(asc(members.name));

  const zeroAttackList: RaidZeroAttackEntry[] = zeroAttackRows.map((r) => ({
    playerTag: r.playerTag,
    name: r.name,
    seasonStartTime: latestSeason.startTime,
    attackLimit: r.attackLimit,
  }));

  // Participation summary — latest season + average across tracked seasons.
  const latestParticipants = countBySeason.get(latestSeason.id) ?? 0;
  const retainedCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(members)
    .where(isNull(members.leftAt));
  const retained = retainedCount[0]?.count ?? 0;
  const allParticipantCounts = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(capitalContributions)
    .where(inArray(capitalContributions.raidSeasonId, seasonIds))
    .groupBy(capitalContributions.raidSeasonId);
  const averageParticipants =
    allParticipantCounts.length > 0
      ? allParticipantCounts.reduce((a, r) => a + r.count, 0) /
        allParticipantCounts.length
      : 0;

  const participation: RaidParticipationSummary = {
    latestSeasonParticipants: latestParticipants,
    latestSeasonRetainedMembers: retained,
    participationRate: retained > 0 ? latestParticipants / retained : null,
    averageParticipants,
    totalSeasons: seasons.length,
  };

  return {
    seasons: seasonSummaries,
    contributionLeaderboard,
    zeroAttackList,
    participation,
  };
}

// ---------------------------------------------------------------------------
// getRaidTimer — live fetch of the current in-progress raid weekend.
// ---------------------------------------------------------------------------

/**
 * Fetch the current raid-weekend status from the CoC API. Returns a timer
 * when a raid weekend is in progress (state = "inProgress"), null otherwise.
 *
 * This is a live API call (cached by the page's ISR — 5 min). It's wrapped
 * in try/catch so a failed fetch never breaks the capital page; the timer is
 * a bonus surface, not a dependency. The rest of the page renders from DB
 * data regardless.
 *
 * The `capitalraidseasons` endpoint returns seasons newest-first; the first
 * item is the current (or most recent) season. We only surface a timer when
 * it's actually in progress — completed seasons are handled by getRaidHistory.
 */
export async function getRaidTimer(): Promise<RaidTimer | null> {
  try {
    // Pass revalidate=300 so the fetch uses next: { revalidate: 300 } instead
    // of cache: "no-store". This keeps the capital page ISR-cached — without
    // it, the "no-store" fetch would force the page to be dynamically
    // rendered on every request (no ISR). The timer data can be stale by up
    // to 5 min, which is fine for a countdown display.
    const res = await cocClient.getCapitalRaidSeasons(clanConfig.clanTag, 300);
    const latest = res.items?.[0];
    if (!latest || latest.state !== "inProgress") return null;
    const start = parseCoCTime(latest.startTime);
    const end = parseCoCTime(latest.endTime);
    if (!start || !end) return null;
    return { startTime: start, endTime: end };
  } catch {
    // API failure — degrade gracefully. The capital page still renders from
    // DB data; the timer is just absent.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RawDistrict {
  id?: number;
  name?: string;
  districtHallLevel?: number;
}

/**
 * Parse the `districtsPayload` JSONB from the clan row. The payload is the
 * CoC API's `clanCapital.districts[]` array. Defensive: never trust raw JSON.
 */
function parseDistricts(payload: unknown): CapitalDistrict[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((d): CapitalDistrict | null => {
      const raw = d as RawDistrict;
      if (!raw || typeof raw.name !== "string") return null;
      const level =
        typeof raw.districtHallLevel === "number" ? raw.districtHallLevel : 0;
      return { name: raw.name, districtHallLevel: level };
    })
    .filter((d): d is CapitalDistrict => d !== null);
}

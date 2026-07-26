/**
 * Server-side query layer for the dedicated /hall-of-fame page.
 *
 * Composes:
 *   - The 5 cached all-time awards from `hall_of_fame_records` (full
 *     leaderboards, not just the top-5 the dashboard shows).
 *   - Live-computed record categories from raw tables (war_attacks,
 *     capital_contributions, members, membership_events) — no schema changes
 *     needed, the data already exists.
 *
 * Server-only — imports @/lib/db which requires a DATABASE_URL. Never call
 * from a client component.
 */

import { and, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  hallOfFameRecords,
  warAttacks,
  warParticipants,
  capitalContributions,
  capitalRaidSeasons,
  members,
  membershipEvents,
} from "@/lib/db/schema";
import type {
  HallOfFamePageData,
  HallOfFameLeaderboard,
  HallOfFameRankedEntry,
  LiveRecordCategory,
  HallOfFameAwardKey,
} from "@/lib/view-models/hall-of-fame";

const AWARD_ORDER: HallOfFameAwardKey[] = [
  "philanthropist",
  "vanguard",
  "dedicated",
  "capitalist",
  "unsleeping",
];

/**
 * Build the full Hall of Fame page data. Always returns a value — individual
 * sections default to empty arrays if the underlying tables are empty or the
 * queries fail (the page degrades gracefully).
 */
export async function getHallOfFamePage(): Promise<HallOfFamePageData> {
  const [cachedAwards, liveRecords, lastComputedAt] = await Promise.all([
    getCachedAwards(),
    getLiveRecords(),
    getLastComputedAt(),
  ]);

  return { cachedAwards, liveRecords, lastComputedAt };
}

// ---------------------------------------------------------------------------
// Cached awards — the 5 all-time records from hall_of_fame_records.
// ---------------------------------------------------------------------------

async function getCachedAwards(): Promise<HallOfFameLeaderboard[]> {
  let rows: (typeof hallOfFameRecords.$inferSelect)[] = [];
  try {
    rows = await db
      .select()
      .from(hallOfFameRecords)
      .orderBy(hallOfFameRecords.awardKey, hallOfFameRecords.rank);
  } catch {
    // table may not exist yet (cold start) — return empty leaderboards.
  }

  return AWARD_ORDER.map((awardKey) => {
    const entries: HallOfFameRankedEntry[] = rows
      .filter((r) => r.awardKey === awardKey)
      .map((r) => ({
        rank: r.rank,
        playerTag: r.holderTag,
        name: r.holderName,
        value: r.recordValue,
        valueLabel: r.valueLabel,
        metaLabel: r.periodLabel ?? undefined,
      }));
    return { awardKey, entries };
  });
}

async function getLastComputedAt(): Promise<Date | null> {
  try {
    const [row] = await db
      .select({ updatedAt: hallOfFameRecords.updatedAt })
      .from(hallOfFameRecords)
      .orderBy(desc(hallOfFameRecords.updatedAt))
      .limit(1);
    return row?.updatedAt ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Live records — computed from raw tables at page-load time.
// ---------------------------------------------------------------------------

/**
 * Compute the live record categories. Each category runs independently; a
 * failure in one doesn't break the others (caught per-category).
 *
 * Categories:
 *   - Most raid gold all-time (capital_contributions)
 *   - Most raid medals all-time (capital_contributions)
 *   - Most bonus attacks used (capital_contributions.bonusAttackLimit)
 *   - Raid MVP per season (top looter each season — only the latest N seasons)
 *   - Most seasons participated (capital_contributions count per member)
 *   - Best gold per attack (capital_contributions gold / attacks efficiency)
 *   - Perfect-attendance wars (war_participants where used === allowed)
 *   - Fastest 3-star attack (war_attacks where stars=3, min duration)
 *   - Longest-tenured member (membership_events earliest join, still active)
 *
 * Removed:
 *   - Most war attacks used (war_participants) — dropped per user request.
 *   - Highest raid score (capital_contributions max per season) — redundant
 *     with The Capitalist cached award (same metric).
 */
async function getLiveRecords(): Promise<LiveRecordCategory[]> {
  const [
    raidGold,
    raidMedals,
    mostBonusAttacks,
    raidMvp,
    mostSeasons,
    bestGoldPerAttack,
    perfectAttendance,
    fastestThreeStar,
    longestTenure,
  ] = await Promise.all([
    safe("most raid gold", computeMostRaidGold()),
    safe("most raid medals", computeMostRaidMedals()),
    safe("most bonus attacks", computeMostBonusAttacks()),
    safe("raid MVP", computeRaidMvp()),
    safe("most seasons", computeMostSeasons()),
    safe("best gold per attack", computeBestGoldPerAttack()),
    safe("perfect attendance", computePerfectAttendance()),
    safe("fastest 3-star", computeFastestThreeStar()),
    safe("longest tenure", computeLongestTenure()),
  ]);

  return [
    raidGold,
    raidMedals,
    mostBonusAttacks,
    raidMvp,
    mostSeasons,
    bestGoldPerAttack,
    perfectAttendance,
    fastestThreeStar,
    longestTenure,
  ].filter((c): c is LiveRecordCategory => c !== null);
}

/** Wrap a category computation so a DB error returns null instead of throwing. */
async function safe(label: string, p: Promise<LiveRecordCategory | null>): Promise<LiveRecordCategory | null> {
  try {
    return await p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[hall-of-fame] live record "${label}" failed: ${msg}`);
    return null;
  }
}

// ── Most raid gold all-time ──────────────────────────────────────────────
async function computeMostRaidGold(): Promise<LiveRecordCategory | null> {
  const rows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      total: sql<number>`coalesce(sum(${capitalContributions.capitalResourcesLooted}), 0)::int`,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .groupBy(capitalContributions.playerTag, members.name)
    .orderBy(desc(sql`sum(${capitalContributions.capitalResourcesLooted})`))
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "most-raid-gold",
    title: "Most Raid Gold",
    description: "All-time Capital gold looted across every tracked raid weekend.",
    icon: "coins",
    entries: rows.map((r) => ({
      playerTag: r.playerTag,
      name: r.name,
      value: r.total,
      valueLabel: `${r.total.toLocaleString()} gold`,
    })),
  };
}

// ── Most raid medals all-time ────────────────────────────────────────────
async function computeMostRaidMedals(): Promise<LiveRecordCategory | null> {
  const rows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      total: sql<number>`coalesce(sum(coalesce(${capitalContributions.raidWeekendMedals}, 0)), 0)::int`,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .groupBy(capitalContributions.playerTag, members.name)
    .orderBy(desc(sql`sum(coalesce(${capitalContributions.raidWeekendMedals}, 0))`))
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "most-raid-medals",
    title: "Most Raid Medals",
    description: "All-time raid-weekend medals earned (offensive + defensive rewards).",
    icon: "trophy",
    entries: rows.map((r) => ({
      playerTag: r.playerTag,
      name: r.name,
      value: r.total,
      valueLabel: `${r.total.toLocaleString()} 🏅`,
    })),
  };
}

// ── Most bonus attacks used ─────────────────────────────────────────────
// Sum of bonusAttackLimit across all seasons — the players who consistently
// earned + used bonus raid attacks (the most dedicated raiders).
async function computeMostBonusAttacks(): Promise<LiveRecordCategory | null> {
  const rows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      total: sql<number>`coalesce(sum(coalesce(${capitalContributions.bonusAttackLimit}, 0)), 0)::int`,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .groupBy(capitalContributions.playerTag, members.name)
    .having(sql`coalesce(sum(coalesce(${capitalContributions.bonusAttackLimit}, 0)), 0) > 0`)
    .orderBy(desc(sql`sum(coalesce(${capitalContributions.bonusAttackLimit}, 0))`))
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "most-bonus-attacks",
    title: "Most Bonus Attacks",
    description: "Total bonus raid attacks earned across all weekends.",
    icon: "zap",
    entries: rows.map((r) => ({
      playerTag: r.playerTag,
      name: r.name,
      value: r.total,
      valueLabel: `${r.total} bonus attacks`,
    })),
  };
}

// ── Raid MVP per season ────────────────────────────────────────────────
// The top gold-looter from the most recent completed season. Only the latest
// season's MVP is shown — this is the "current defending champion" record.
async function computeRaidMvp(): Promise<LiveRecordCategory | null> {
  // Find the most recent completed season.
  const [latestSeason] = await db
    .select()
    .from(capitalRaidSeasons)
    .orderBy(desc(capitalRaidSeasons.startTime))
    .limit(1);

  if (!latestSeason) return null;

  const rows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      gold: capitalContributions.capitalResourcesLooted,
      attacks: capitalContributions.attacksUsed,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .where(eq(capitalContributions.raidSeasonId, latestSeason.id))
    .orderBy(desc(capitalContributions.capitalResourcesLooted))
    .limit(10);

  if (rows.length === 0) return null;
  const seasonLabel = latestSeason.startTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return {
    key: "raid-mvp",
    title: "Raid MVP",
    description: `Top looter from the latest raid weekend (${seasonLabel}).`,
    icon: "crown",
    entries: rows.map((r) => ({
      playerTag: r.playerTag,
      name: r.name,
      value: r.gold,
      valueLabel: `${r.gold.toLocaleString()} gold`,
      metaLabel: `${r.attacks} attacks`,
    })),
  };
}

// ── Most seasons participated ──────────────────────────────────────────
// Count of distinct raid seasons each member contributed to — the loyal
// raiders who show up every weekend.
async function computeMostSeasons(): Promise<LiveRecordCategory | null> {
  const rows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      seasons: sql<number>`count(distinct ${capitalContributions.raidSeasonId})::int`,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .groupBy(capitalContributions.playerTag, members.name)
    .orderBy(desc(sql`count(distinct ${capitalContributions.raidSeasonId})`))
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "most-seasons",
    title: "Most Seasons",
    description: "Most raid weekends attended.",
    icon: "users",
    entries: rows.map((r) => ({
      playerTag: r.playerTag,
      name: r.name,
      value: r.seasons,
      valueLabel: `${r.seasons} seasons`,
    })),
  };
}

// ── Best gold per attack ──────────────────────────────────────────────
// Gold looted divided by attacks used — the most efficient looter. Requires
// at least 1 attack to avoid divide-by-zero. Members with 0 attacks are
// excluded.
async function computeBestGoldPerAttack(): Promise<LiveRecordCategory | null> {
  const rows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      name: members.name,
      totalGold: sql<number>`coalesce(sum(${capitalContributions.capitalResourcesLooted}), 0)::int`,
      totalAttacks: sql<number>`coalesce(sum(${capitalContributions.attacksUsed}), 0)::int`,
    })
    .from(capitalContributions)
    .innerJoin(members, eq(members.playerTag, capitalContributions.playerTag))
    .groupBy(capitalContributions.playerTag, members.name)
    .having(sql`coalesce(sum(${capitalContributions.attacksUsed}), 0) > 0`)
    .orderBy(desc(sql`coalesce(sum(${capitalContributions.capitalResourcesLooted}), 0)::float / coalesce(sum(${capitalContributions.attacksUsed}), 1)::float`))
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "best-gold-per-attack",
    title: "Best Gold/Attack",
    description: "Most gold per attack — efficiency leader.",
    icon: "coins",
    entries: rows.map((r) => {
      const efficiency = r.totalAttacks > 0 ? Math.round(r.totalGold / r.totalAttacks) : 0;
      return {
        playerTag: r.playerTag,
        name: r.name,
        value: efficiency,
        valueLabel: `${efficiency.toLocaleString()} gold/atk`,
        metaLabel: `${r.totalGold.toLocaleString()} gold in ${r.totalAttacks} atk`,
      };
    }),
  };
}

// ── Perfect-attendance wars (used === allowed, no missed) ────────────────
async function computePerfectAttendance(): Promise<LiveRecordCategory | null> {
  const rows = await db
    .select({
      playerTag: warParticipants.playerTag,
      name: members.name,
      perfect: sql<number>`count(*) filter (where ${warParticipants.attacksUsed} = ${warParticipants.attacksAllowed} and ${warParticipants.missed} = false)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(warParticipants)
    .innerJoin(members, eq(members.playerTag, warParticipants.playerTag))
    .groupBy(warParticipants.playerTag, members.name)
    .having(sql`count(*) filter (where ${warParticipants.attacksUsed} = ${warParticipants.attacksAllowed} and ${warParticipants.missed} = false) > 0`)
    .orderBy(desc(sql`count(*) filter (where ${warParticipants.attacksUsed} = ${warParticipants.attacksAllowed} and ${warParticipants.missed} = false)`))
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "perfect-attendance",
    title: "Perfect Attendance",
    description: "Wars where every attack was used — no misses.",
    icon: "crown",
    entries: rows.map((r) => ({
      playerTag: r.playerTag,
      name: r.name,
      value: r.perfect,
      valueLabel: `${r.perfect} perfect wars`,
      metaLabel: `of ${r.total} tracked`,
    })),
  };
}

// ── Fastest 3-star attack ────────────────────────────────────────────────
async function computeFastestThreeStar(): Promise<LiveRecordCategory | null> {
  // Duration is in seconds. Lower = faster. Only 3-star attacks count.
  const rows = await db
    .select({
      attackerTag: warAttacks.attackerTag,
      name: members.name,
      duration: sql<number>`min(${warAttacks.duration})`,
      destruction: sql<number>`max(${warAttacks.destructionPercentage})`,
    })
    .from(warAttacks)
    .innerJoin(members, eq(members.playerTag, warAttacks.attackerTag))
    .where(and(eq(warAttacks.stars, 3), sql`${warAttacks.duration} is not null`))
    .groupBy(warAttacks.attackerTag, members.name)
    .orderBy(sql`min(${warAttacks.duration}) asc`)
    .limit(10);

  if (rows.length === 0) return null;
  return {
    key: "fastest-3-star",
    title: "Fastest 3-Star",
    description: "Quickest 3-star attacks by duration.",
    icon: "zap",
    entries: rows.map((r) => ({
      playerTag: r.attackerTag,
      name: r.name,
      value: r.duration ?? 0,
      valueLabel: `${Math.floor((r.duration ?? 0) / 60)}:${String((r.duration ?? 0) % 60).padStart(2, "0")}`,
      metaLabel: `${r.destruction}% destruction`,
    })),
  };
}

// ── Longest-tenured member ───────────────────────────────────────────────
async function computeLongestTenure(): Promise<LiveRecordCategory | null> {
  // Earliest join event among currently-retained members.
  const rows = await db
    .select({
      playerTag: membershipEvents.playerTag,
      name: membershipEvents.nameAtEvent,
      firstSeen: sql<Date>`min(${membershipEvents.eventTime})`,
    })
    .from(membershipEvents)
    .where(
      and(
        eq(membershipEvents.eventType, "join"),
        // Only count members still in the clan (not departed).
        inArray(
          membershipEvents.playerTag,
          db.select({ playerTag: members.playerTag }).from(members).where(isNull(members.leftAt)),
        ),
      ),
    )
    .groupBy(membershipEvents.playerTag, membershipEvents.nameAtEvent)
    .orderBy(sql`min(${membershipEvents.eventTime}) asc`)
    .limit(10);

  if (rows.length === 0) return null;
  const now = Date.now();
  return {
    key: "longest-tenure",
    title: "Longest Tenured",
    description: "Members who have been here the longest (by first-observed join).",
    icon: "clock",
    entries: rows.map((r) => {
      const days = Math.floor((now - r.firstSeen.getTime()) / 86_400_000);
      return {
        playerTag: r.playerTag,
        name: r.name,
        value: days,
        valueLabel: `${days} days`,
        metaLabel: `since ${r.firstSeen.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      };
    }),
  };
}

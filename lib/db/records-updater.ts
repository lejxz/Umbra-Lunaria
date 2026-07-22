/**
 * Hall of Fame records updater.
 *
 * Computes all 5 all-time clan records from existing DB tables and upserts
 * them into `hall_of_fame_records`. Called at the end of the daily batch
 * so it never runs during the 5-minute light polls.
 *
 * Awards:
 *   philanthropist — highest all-time cumulative donations given (reset-aware)
 *   vanguard       — most 3-star war attacks all time + best 3-star %
 *   dedicated      — longest consecutive daily login streak
 *   capitalist     — highest capital gold looted in a single raid weekend
 *   unsleeping     — highest raw activity score (sum of raw component values,
 *                    not the normalized 0-100 score, so it grows without cap)
 */

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  warAttacks,
  capitalContributions,
  capitalRaidSeasons,
  hallOfFameRecords,
} from "@/lib/db/schema";
import { calculateDonationWindow } from "@/lib/scoring/donations";
import { computeWindow } from "@/lib/time/windows";
import { isSameDayInClanTz } from "@/lib/time/windows";

export type AwardKey =
  | "philanthropist"
  | "vanguard"
  | "dedicated"
  | "capitalist"
  | "unsleeping";

interface RecordCandidate {
  awardKey: AwardKey;
  holderTag: string;
  holderName: string;
  recordValue: number;
  valueLabel: string;
  periodLabel: string | null;
  achievedAt: Date;
}

// ---------------------------------------------------------------------------
// Main entry point — compute all records and upsert
// ---------------------------------------------------------------------------

export async function checkHallOfFameRecords(): Promise<string[]> {
  const errors: string[] = [];

  const allMembers = await db
    .select({
      playerTag: members.playerTag,
      name: members.name,
    })
    .from(members);

  if (allMembers.length === 0) return errors;

  const candidates: RecordCandidate[] = [];

  try {
    const r = await computePhilanthropist(allMembers);
    if (r) candidates.push(r);
  } catch (e) {
    errors.push(`hall-of-fame philanthropist: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const r = await computeVanguard(allMembers);
    if (r) candidates.push(r);
  } catch (e) {
    errors.push(`hall-of-fame vanguard: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const r = await computeDedicated(allMembers);
    if (r) candidates.push(r);
  } catch (e) {
    errors.push(`hall-of-fame dedicated: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const r = await computeCapitalist(allMembers);
    if (r) candidates.push(r);
  } catch (e) {
    errors.push(`hall-of-fame capitalist: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const r = await computeUnsleeping(allMembers);
    if (r) candidates.push(r);
  } catch (e) {
    errors.push(`hall-of-fame unsleeping: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Fetch existing records to compare — only update if new value is strictly higher
  const existing = await db.select().from(hallOfFameRecords);
  const existingMap = new Map(existing.map((r) => [r.awardKey, r]));

  const now = new Date();
  for (const candidate of candidates) {
    const current = existingMap.get(candidate.awardKey);
    if (!current || candidate.recordValue > current.recordValue) {
      await db
        .insert(hallOfFameRecords)
        .values({
          awardKey: candidate.awardKey,
          holderTag: candidate.holderTag,
          holderName: candidate.holderName,
          recordValue: candidate.recordValue,
          valueLabel: candidate.valueLabel,
          periodLabel: candidate.periodLabel,
          achievedAt: candidate.achievedAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: hallOfFameRecords.awardKey,
          set: {
            holderTag: candidate.holderTag,
            holderName: candidate.holderName,
            recordValue: candidate.recordValue,
            valueLabel: candidate.valueLabel,
            periodLabel: candidate.periodLabel,
            achievedAt: candidate.achievedAt,
            updatedAt: now,
          },
        });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// The Philanthropist — highest cumulative all-time donations given
// ---------------------------------------------------------------------------

async function computePhilanthropist(
  allMembers: { playerTag: string; name: string }[],
): Promise<RecordCandidate | null> {
  const tags = allMembers.map((m) => m.playerTag);
  const win = computeWindow("all");

  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
    })
    .from(memberSnapshots)
    .where(inArray(memberSnapshots.playerTag, tags))
    .orderBy(memberSnapshots.capturedAt);

  let bestTag = "";
  let bestName = "";
  let bestValue = 0;
  let bestAt = new Date();

  for (const m of allMembers) {
    const memberSnaps = snapshots
      .filter((s) => s.playerTag === m.playerTag)
      .map((s) => ({ capturedAt: s.capturedAt, donations: s.donations }));

    const total = calculateDonationWindow(memberSnaps, win);

    if (total > bestValue) {
      bestValue = total;
      bestTag = m.playerTag;
      bestName = m.name;
      bestAt = memberSnaps[memberSnaps.length - 1]?.capturedAt ?? new Date();
    }
  }

  if (!bestTag) return null;

  return {
    awardKey: "philanthropist",
    holderTag: bestTag,
    holderName: bestName,
    recordValue: bestValue,
    valueLabel: `${bestValue.toLocaleString()} troops`,
    periodLabel: `Since tracking began`,
    achievedAt: bestAt,
  };
}

// ---------------------------------------------------------------------------
// The Vanguard — most 3-star war attacks all time
// ---------------------------------------------------------------------------

async function computeVanguard(
  allMembers: { playerTag: string; name: string }[],
): Promise<RecordCandidate | null> {
  const tags = allMembers.map((m) => m.playerTag);

  const rows = await db
    .select({
      attackerTag: warAttacks.attackerTag,
      totalAttacks: sql<number>`cast(count(*) as int)`,
      threeStars: sql<number>`cast(sum(case when ${warAttacks.stars} = 3 then 1 else 0 end) as int)`,
    })
    .from(warAttacks)
    .where(inArray(warAttacks.attackerTag, tags))
    .groupBy(warAttacks.attackerTag);

  let bestTag = "";
  let bestName = "";
  let bestThreeStars = 0;
  let bestTotal = 0;

  for (const row of rows) {
    if (row.threeStars > bestThreeStars) {
      bestThreeStars = row.threeStars;
      bestTotal = row.totalAttacks;
      bestTag = row.attackerTag;
      bestName = allMembers.find((m) => m.playerTag === row.attackerTag)?.name ?? row.attackerTag;
    }
  }

  if (!bestTag) return null;

  const pct = bestTotal > 0 ? Math.round((bestThreeStars / bestTotal) * 100) : 0;

  return {
    awardKey: "vanguard",
    holderTag: bestTag,
    holderName: bestName,
    recordValue: bestThreeStars,
    valueLabel: `${bestThreeStars} three-stars (${pct}% rate)`,
    periodLabel: `All-time`,
    achievedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// The Dedicated — longest consecutive daily login streak
// ---------------------------------------------------------------------------

async function computeDedicated(
  allMembers: { playerTag: string; name: string }[],
): Promise<RecordCandidate | null> {
  const tags = allMembers.map((m) => m.playerTag);

  // Fetch all login day snapshots for all members
  const loginSnaps = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
    })
    .from(memberSnapshots)
    .where(
      and(
        inArray(memberSnapshots.playerTag, tags),
        eq(memberSnapshots.loginDayFlag, true),
      ),
    )
    .orderBy(memberSnapshots.capturedAt);

  let bestTag = "";
  let bestName = "";
  let bestStreak = 0;
  let bestStreakStart = new Date();

  for (const m of allMembers) {
    const memberLogins = loginSnaps
      .filter((s) => s.playerTag === m.playerTag)
      .map((s) => s.capturedAt);

    if (memberLogins.length === 0) continue;

    // Deduplicate to one entry per calendar day
    const uniqueDays: Date[] = [];
    for (const ts of memberLogins) {
      const last = uniqueDays[uniqueDays.length - 1];
      if (!last || !isSameDayInClanTz(ts, last)) {
        uniqueDays.push(ts);
      }
    }

    // Find the longest consecutive streak (days where diff = 1 day)
    let streak = 1;
    let maxStreak = 1;
    let streakStart = uniqueDays[0]!;
    let maxStreakStart = uniqueDays[0]!;

    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = uniqueDays[i - 1]!;
      const curr = uniqueDays[i]!;
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays <= 1.5) {
        // Same day or consecutive day (allow a bit of tolerance for timezone edges)
        streak++;
        if (streak > maxStreak) {
          maxStreak = streak;
          maxStreakStart = streakStart;
        }
      } else {
        streak = 1;
        streakStart = curr;
      }
    }

    if (maxStreak > bestStreak) {
      bestStreak = maxStreak;
      bestTag = m.playerTag;
      bestName = m.name;
      bestStreakStart = maxStreakStart;
    }
  }

  if (!bestTag) return null;

  return {
    awardKey: "dedicated",
    holderTag: bestTag,
    holderName: bestName,
    recordValue: bestStreak,
    valueLabel: `${bestStreak} consecutive days`,
    periodLabel: null,
    achievedAt: bestStreakStart,
  };
}

// ---------------------------------------------------------------------------
// The Capitalist — highest capital gold looted in a single raid weekend
// ---------------------------------------------------------------------------

async function computeCapitalist(
  allMembers: { playerTag: string; name: string }[],
): Promise<RecordCandidate | null> {
  const tags = allMembers.map((m) => m.playerTag);

  const seasons = await db
    .select({ id: capitalRaidSeasons.id, startTime: capitalRaidSeasons.startTime })
    .from(capitalRaidSeasons);

  if (seasons.length === 0) return null;

  const seasonIds = seasons.map((s) => s.id);
  const seasonStartMap = new Map(seasons.map((s) => [s.id, s.startTime]));

  const contribs = await db
    .select({
      playerTag: capitalContributions.playerTag,
      raidSeasonId: capitalContributions.raidSeasonId,
      looted: capitalContributions.capitalResourcesLooted,
    })
    .from(capitalContributions)
    .where(
      and(
        inArray(capitalContributions.playerTag, tags),
        inArray(capitalContributions.raidSeasonId, seasonIds),
      ),
    );

  let bestTag = "";
  let bestName = "";
  let bestValue = 0;
  let bestSeasonId = 0;

  for (const c of contribs) {
    if (c.looted > bestValue) {
      bestValue = c.looted;
      bestTag = c.playerTag;
      bestName = allMembers.find((m) => m.playerTag === c.playerTag)?.name ?? c.playerTag;
      bestSeasonId = c.raidSeasonId;
    }
  }

  if (!bestTag) return null;

  const seasonStart = seasonStartMap.get(bestSeasonId);
  const periodLabel = seasonStart
    ? `Raid ${seasonStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : null;

  return {
    awardKey: "capitalist",
    holderTag: bestTag,
    holderName: bestName,
    recordValue: bestValue,
    valueLabel: `${bestValue.toLocaleString()} gold`,
    periodLabel,
    achievedAt: seasonStart ?? new Date(),
  };
}

// ---------------------------------------------------------------------------
// The Unsleeping — highest raw cumulative activity metric (uncapped)
//
// "Raw" = sum of:
//   - all-time donations given (absolute count)
//   - all-time login days (each day worth 100 pts to give it weight)
//   - all-time war 3-stars (each worth 500 pts)
//   - all-time capital gold looted (raw)
//
// This produces a large, ever-growing uncapped number that rewards
// consistent long-term activity across all pillars.
// ---------------------------------------------------------------------------

async function computeUnsleeping(
  allMembers: { playerTag: string; name: string }[],
): Promise<RecordCandidate | null> {
  const tags = allMembers.map((m) => m.playerTag);
  const win = computeWindow("all");

  // 1. All-time donations
  const snapshots = await db
    .select({
      playerTag: memberSnapshots.playerTag,
      capturedAt: memberSnapshots.capturedAt,
      donations: memberSnapshots.donations,
      loginDayFlag: memberSnapshots.loginDayFlag,
    })
    .from(memberSnapshots)
    .where(inArray(memberSnapshots.playerTag, tags))
    .orderBy(memberSnapshots.capturedAt);

  // 2. All-time 3-stars
  const warRows = await db
    .select({
      attackerTag: warAttacks.attackerTag,
      threeStars: sql<number>`cast(sum(case when ${warAttacks.stars} = 3 then 1 else 0 end) as int)`,
    })
    .from(warAttacks)
    .where(inArray(warAttacks.attackerTag, tags))
    .groupBy(warAttacks.attackerTag);

  const warStarMap = new Map(warRows.map((r) => [r.attackerTag, r.threeStars]));

  // 3. All-time capital looted
  const capitalRows = await db
    .select({
      playerTag: capitalContributions.playerTag,
      totalLooted: sql<number>`cast(sum(${capitalContributions.capitalResourcesLooted}) as int)`,
    })
    .from(capitalContributions)
    .where(inArray(capitalContributions.playerTag, tags))
    .groupBy(capitalContributions.playerTag);

  const capitalMap = new Map(capitalRows.map((r) => [r.playerTag, r.totalLooted]));

  let bestTag = "";
  let bestName = "";
  let bestRawScore = 0;

  for (const m of allMembers) {
    const memberSnaps = snapshots.filter((s) => s.playerTag === m.playerTag);

    const donationsGiven = calculateDonationWindow(
      memberSnaps.map((s) => ({ capturedAt: s.capturedAt, donations: s.donations })),
      win,
    );

    // Count unique login days
    const loginDays: Date[] = [];
    for (const s of memberSnaps) {
      if (!s.loginDayFlag) continue;
      const last = loginDays[loginDays.length - 1];
      if (!last || !isSameDayInClanTz(s.capturedAt, last)) {
        loginDays.push(s.capturedAt);
      }
    }

    const threeStars = warStarMap.get(m.playerTag) ?? 0;
    const capitalLooted = capitalMap.get(m.playerTag) ?? 0;

    // Weighted raw score — each pillar contributes meaningfully
    const rawScore =
      donationsGiven +
      loginDays.length * 100 +
      threeStars * 500 +
      Math.round(capitalLooted / 10);

    if (rawScore > bestRawScore) {
      bestRawScore = rawScore;
      bestTag = m.playerTag;
      bestName = m.name;
    }
  }

  if (!bestTag) return null;

  return {
    awardKey: "unsleeping",
    holderTag: bestTag,
    holderName: bestName,
    recordValue: bestRawScore,
    valueLabel: `${bestRawScore.toLocaleString()} pts`,
    periodLabel: `All-time`,
    achievedAt: new Date(),
  };
}

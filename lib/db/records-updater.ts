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

import { and, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  members,
  memberSnapshots,
  warAttacks,
  capitalContributions,
  capitalRaidSeasons,
  hallOfFameRecords,
} from "@/lib/db/schema";
import { longestClanTzDayStreak } from "@/lib/scoring/login-streak";

export type AwardKey =
  | "philanthropist"
  | "vanguard"
  | "dedicated"
  | "capitalist"
  | "unsleeping";

interface RecordCandidate {
  awardKey: AwardKey;
  rank: number;
  holderTag: string;
  holderName: string;
  recordValue: number;
  valueLabel: string;
  periodLabel: string | null;
  achievedAt: Date;
}

export async function checkHallOfFameRecords(): Promise<string[]> {
  const errors: string[] = [];
  // Store top-100 per award — enough for any clan (max 50 members) plus
  // departed members. The dashboard shows top-5; the HoF page shows top-10.
  // Was 1000 (5000 rows total = ~1 MB) — reduced to 100 (500 rows = ~100 KB).
  const LIMIT = 100;

  const allMembersRaw = await db
    .select({
      playerTag: members.playerTag,
      name: members.name,
      cumulativeDonationsGiven: members.cumulativeDonationsGiven,
      cumulativeDonationsReceived: members.cumulativeDonationsReceived,
      cumulativeLoginDays: members.cumulativeLoginDays,
    })
    .from(members);

  if (allMembersRaw.length === 0) return errors;

  const tags = allMembersRaw.map((m) => m.playerTag);
  const nameMap = new Map(allMembersRaw.map((m) => [m.playerTag, m.name]));

  const candidates: RecordCandidate[] = [];
  const now = new Date();

  try {
    // ── Philanthropist ── (uses checkpoint columns — computed by the daily
    // batch before this runs, and re-computed by the purge route as a safety
    // net. No need to re-read all snapshots.)
    const philoScores: { tag: string; value: number }[] = [];
    for (const m of allMembersRaw) {
      philoScores.push({
        tag: m.playerTag,
        value: m.cumulativeDonationsGiven ?? 0,
      });
    }
    philoScores.sort((a, b) => b.value - a.value);
    
    philoScores.slice(0, LIMIT).forEach((s, i) => {
      if (s.value <= 0) return;
      candidates.push({
        awardKey: "philanthropist",
        rank: i + 1,
        holderTag: s.tag,
        holderName: nameMap.get(s.tag) ?? s.tag,
        recordValue: s.value,
        valueLabel: `${s.value.toLocaleString()} troops`,
        periodLabel: "Since tracking began",
        achievedAt: now,
      });
    });

    // ── Vanguard ──
    const warRows = await db
      .select({
        attackerTag: warAttacks.attackerTag,
        totalAttacks: sql<number>`cast(count(*) as int)`,
        threeStars: sql<number>`cast(sum(case when ${warAttacks.stars} = 3 then 1 else 0 end) as int)`,
      })
      .from(warAttacks)
      .where(inArray(warAttacks.attackerTag, tags))
      .groupBy(warAttacks.attackerTag);

    warRows.sort((a, b) => b.threeStars - a.threeStars);
    warRows.slice(0, LIMIT).forEach((r, i) => {
      if (r.threeStars <= 0) return;
      const pct = r.totalAttacks > 0 ? Math.round((r.threeStars / r.totalAttacks) * 100) : 0;
      candidates.push({
        awardKey: "vanguard",
        rank: i + 1,
        holderTag: r.attackerTag,
        holderName: nameMap.get(r.attackerTag) ?? r.attackerTag,
        recordValue: r.threeStars,
        valueLabel: `${r.threeStars} three-stars`,
        periodLabel: `${pct}% rate`,
        achievedAt: now,
      });
    });

    // ── Dedicated ── (uses checkpoint column for login days count.
    // Note: the checkpoint stores total unique login days, not the longest
    // streak. For the streak we'd still need the daily snapshots. However,
    // the daily last-of-day snapshots are kept forever (not pruned), so the
    // streak can still be computed from them. We use the checkpoint as a
    // fallback when snapshots are insufficient.)
    const dedicatedScores: { tag: string; value: number }[] = [];
    // Fetch only the daily snapshots (last per day) for streak computation.
    // These are the snapshots that survive pruning — safe to read.
    const dailyLoginSnaps = await db
      .select({
        playerTag: memberSnapshots.playerTag,
        capturedAt: memberSnapshots.capturedAt,
        loginDayFlag: memberSnapshots.loginDayFlag,
      })
      .from(memberSnapshots)
      .where(inArray(memberSnapshots.playerTag, tags))
      .orderBy(memberSnapshots.playerTag, memberSnapshots.capturedAt);

    for (const m of allMembersRaw) {
      const memberLogins = dailyLoginSnaps
        .filter((s) => s.playerTag === m.playerTag && s.loginDayFlag)
        .map((s) => s.capturedAt);
      if (memberLogins.length === 0) {
        // Fallback: use the checkpoint count as a rough value.
        const checkpointDays = m.cumulativeLoginDays ?? 0;
        if (checkpointDays > 0) {
          dedicatedScores.push({ tag: m.playerTag, value: checkpointDays });
        }
        continue;
      }
      // fix B-1 + §8.1: the streak algorithm now lives in the pure, tested
      // lib/scoring/login-streak.ts (clan-timezone calendar-day continuity,
      // same-day dedup inside) instead of being embedded in this DB-coupled
      // function.
      dedicatedScores.push({ tag: m.playerTag, value: longestClanTzDayStreak(memberLogins) });
    }
    dedicatedScores.sort((a, b) => b.value - a.value);
    
    dedicatedScores.slice(0, LIMIT).forEach((s, i) => {
      if (s.value <= 0) return;
      candidates.push({
        awardKey: "dedicated",
        rank: i + 1,
        holderTag: s.tag,
        holderName: nameMap.get(s.tag) ?? s.tag,
        recordValue: s.value,
        valueLabel: `${s.value} days`,
        periodLabel: "Since tracking began",
        achievedAt: now,
      });
    });

    // ── Capitalist ──
    const raidSeasonIds = (await db.select({ id: capitalRaidSeasons.id }).from(capitalRaidSeasons)).map((r) => r.id);
    const capitalEntries: { tag: string; value: number }[] = [];
    if (raidSeasonIds.length > 0) {
      const contribs = await db
        .select({ playerTag: capitalContributions.playerTag, looted: capitalContributions.capitalResourcesLooted })
        .from(capitalContributions)
        .where(and(inArray(capitalContributions.playerTag, tags), inArray(capitalContributions.raidSeasonId, raidSeasonIds)));
      const bestPerMember = new Map<string, number>();
      for (const c of contribs) {
        bestPerMember.set(c.playerTag, Math.max(bestPerMember.get(c.playerTag) ?? 0, c.looted));
      }
      for (const m of allMembersRaw) {
        capitalEntries.push({ tag: m.playerTag, value: bestPerMember.get(m.playerTag) ?? 0 });
      }
    }
    capitalEntries.sort((a, b) => b.value - a.value);
    
    capitalEntries.slice(0, LIMIT).forEach((s, i) => {
      if (s.value <= 0) return;
      candidates.push({
        awardKey: "capitalist",
        rank: i + 1,
        holderTag: s.tag,
        holderName: nameMap.get(s.tag) ?? s.tag,
        recordValue: s.value,
        valueLabel: `${s.value.toLocaleString()} gold`,
        periodLabel: "Since tracking began",
        achievedAt: now,
      });
    });

    // ── Unsleeping ── (uses checkpoint columns for donations + login days)
    const warStarMap = new Map(warRows.map((r) => [r.attackerTag, r.threeStars]));
    const capitalMap = new Map(capitalEntries.map((e) => [e.tag, e.value]));
    const unsleepingScores: { tag: string; value: number }[] = [];
    for (const m of allMembersRaw) {
      const donated = m.cumulativeDonationsGiven ?? 0;
      const loginDays = m.cumulativeLoginDays ?? 0;
      const raw = donated + loginDays * 100 + (warStarMap.get(m.playerTag) ?? 0) * 500 + Math.round((capitalMap.get(m.playerTag) ?? 0) / 10);
      unsleepingScores.push({ tag: m.playerTag, value: raw });
    }
    unsleepingScores.sort((a, b) => b.value - a.value);
    
    unsleepingScores.slice(0, LIMIT).forEach((s, i) => {
      if (s.value <= 0) return;
      candidates.push({
        awardKey: "unsleeping",
        rank: i + 1,
        holderTag: s.tag,
        holderName: nameMap.get(s.tag) ?? s.tag,
        recordValue: s.value,
        valueLabel: `${s.value.toLocaleString()} pts`,
        periodLabel: "Since tracking began",
        achievedAt: now,
      });
    });
  } catch (e) {
    errors.push(`hall-of-fame compute error: ${e instanceof Error ? e.message : String(e)}`);
    return errors;
  }

  // Wipe the table and re-insert the new Top N for all categories.
  // fix (docs/2026-09-11, DB opt §6): the delete + insert now run in one
  // transaction — a failure between the two used to leave the HoF empty
  // until the next daily batch.
  try {
    await db.transaction(async (tx) => {
      await tx.delete(hallOfFameRecords);
      if (candidates.length > 0) {
        await tx.insert(hallOfFameRecords).values(candidates.map((c) => ({
          awardKey: c.awardKey,
          rank: c.rank,
          holderTag: c.holderTag,
          holderName: c.holderName,
          recordValue: c.recordValue,
          valueLabel: c.valueLabel,
          periodLabel: c.periodLabel,
          achievedAt: c.achievedAt,
          updatedAt: now,
        })));
      }
    });
  } catch (e) {
    errors.push(`hall-of-fame db insert error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return errors;
}

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
import { computeWindow, isSameDayInClanTz } from "@/lib/time/windows";

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
  // Set a high limit so we store ranks for the whole clan (for member detail views)
  const LIMIT = 1000;

  const allMembersRaw = await db
    .select({ playerTag: members.playerTag, name: members.name })
    .from(members);

  if (allMembersRaw.length === 0) return errors;

  const tags = allMembersRaw.map((m) => m.playerTag);
  const nameMap = new Map(allMembersRaw.map((m) => [m.playerTag, m.name]));
  const winAll = computeWindow("all");

  const candidates: RecordCandidate[] = [];
  const now = new Date();

  try {
    const allSnaps = await db
      .select({
        playerTag: memberSnapshots.playerTag,
        capturedAt: memberSnapshots.capturedAt,
        donations: memberSnapshots.donations,
        loginDayFlag: memberSnapshots.loginDayFlag,
      })
      .from(memberSnapshots)
      .where(inArray(memberSnapshots.playerTag, tags))
      .orderBy(memberSnapshots.capturedAt);

    // ── Philanthropist ──
    const philoScores: { tag: string; value: number }[] = [];
    for (const m of allMembersRaw) {
      const snaps = allSnaps
        .filter((s) => s.playerTag === m.playerTag)
        .map((s) => ({ capturedAt: s.capturedAt, donations: s.donations }));
      philoScores.push({ tag: m.playerTag, value: calculateDonationWindow(snaps, winAll) });
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

    // ── Dedicated ──
    const loginSnaps = allSnaps.filter((s) => s.loginDayFlag);
    const dedicatedScores: { tag: string; value: number }[] = [];
    for (const m of allMembersRaw) {
      const memberLogins = loginSnaps
        .filter((s) => s.playerTag === m.playerTag)
        .map((s) => s.capturedAt);
      if (memberLogins.length === 0) continue;
      const uniqueDays: Date[] = [];
      for (const ts of memberLogins) {
        const last = uniqueDays[uniqueDays.length - 1];
        if (!last || !isSameDayInClanTz(ts, last)) uniqueDays.push(ts);
      }
      let streak = 1, maxStreak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const diffDays = (uniqueDays[i]!.getTime() - uniqueDays[i - 1]!.getTime()) / 86400000;
        if (diffDays <= 1.5) { streak++; maxStreak = Math.max(maxStreak, streak); } else { streak = 1; }
      }
      dedicatedScores.push({ tag: m.playerTag, value: maxStreak });
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

    // ── Unsleeping ──
    const warStarMap = new Map(warRows.map((r) => [r.attackerTag, r.threeStars]));
    const capitalMap = new Map(capitalEntries.map((e) => [e.tag, e.value]));
    const unsleepingScores: { tag: string; value: number }[] = [];
    for (const m of allMembersRaw) {
      const snaps = allSnaps.filter((s) => s.playerTag === m.playerTag);
      const donated = calculateDonationWindow(snaps.map((s) => ({ capturedAt: s.capturedAt, donations: s.donations })), winAll);
      const loginDaysUniq: Date[] = [];
      for (const s of snaps.filter((s) => s.loginDayFlag)) {
        const last = loginDaysUniq[loginDaysUniq.length - 1];
        if (!last || !isSameDayInClanTz(s.capturedAt, last)) loginDaysUniq.push(s.capturedAt);
      }
      const raw = donated + loginDaysUniq.length * 100 + (warStarMap.get(m.playerTag) ?? 0) * 500 + Math.round((capitalMap.get(m.playerTag) ?? 0) / 10);
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

  // Wipe the table and re-insert the new Top 10 for all categories
  try {
    await db.delete(hallOfFameRecords);
    if (candidates.length > 0) {
      await db.insert(hallOfFameRecords).values(candidates.map((c) => ({
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
  } catch (e) {
    errors.push(`hall-of-fame db insert error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return errors;
}

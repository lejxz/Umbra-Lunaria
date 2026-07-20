import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { clans, members, wars, capitalDistrictSnapshots, memberSnapshots, warParticipants } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import { gte } from "drizzle-orm";

// UI reads stay behind this module so pages never depend on Drizzle's schema shape.
export const getClanInfo = () => db.select().from(clans).where(eq(clans.clanTag, clanConfig.clanTag)).limit(1);
export const getMembers = () => db.select().from(members).orderBy(desc(members.name));
export const getMemberDetail = (playerTag: string) => db.select().from(members).where(eq(members.playerTag, playerTag)).limit(1);
export const getWarHistory = (limit = 20) => db.select().from(wars).where(eq(wars.state, "warEnded")).orderBy(desc(wars.endTime)).limit(limit);
export const getCurrentWar = () => db.select().from(wars).where(ne(wars.state, "warEnded")).orderBy(desc(wars.id)).limit(1);
export const getCapitalDistricts = () => db.select().from(capitalDistrictSnapshots).orderBy(desc(capitalDistrictSnapshots.capturedAt));

export type DonationWindow = "24h" | "7d" | "30d";
export async function getDonationTotals(window: DonationWindow) {
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : 24 * 30;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const snapshots = await db.select().from(memberSnapshots).where(gte(memberSnapshots.capturedAt, since));
  const byMember = new Map<string, typeof snapshots>();
  for (const snapshot of snapshots) byMember.set(snapshot.playerTag, [...(byMember.get(snapshot.playerTag) ?? []), snapshot]);
  const donors = [...byMember.entries()].map(([playerTag, rows]) => {
    const ordered = rows.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    let given = 0;
    let received = 0;
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (!previous || !current) continue;
      // Weekly Supercell resets appear as negative deltas. Ignore the reset
      // itself, but keep counting positive deltas on either side of it.
      given += Math.max(0, current.donations - previous.donations);
      received += Math.max(0, current.donationsReceived - previous.donationsReceived);
    }
    return { playerTag, given, received };
  }).sort((a, b) => b.given - a.given);
  return { given: donors.reduce((sum, item) => sum + item.given, 0), received: donors.reduce((sum, item) => sum + item.received, 0), donors: donors.slice(0, 5) };
}

export async function getActivityTimeline(window: DonationWindow) {
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : 24 * 30;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const snapshots = await db.select().from(memberSnapshots).where(gte(memberSnapshots.capturedAt, since));
  const buckets = new Map<string, Set<string>>();
  for (const snapshot of snapshots) { const date = new Date(snapshot.capturedAt); const key = window === "24h" ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00` : `${date.getMonth() + 1}/${date.getDate()}`; if (!buckets.has(key)) buckets.set(key, new Set()); if (snapshot.activityFlag) buckets.get(key)?.add(snapshot.playerTag); }
  return [...buckets.entries()].map(([label, members]) => ({ label, active: members.size }));
}

export const getClanLog = (limit = 20) => db.select({ name: members.name, playerTag: members.playerTag, joinedAt: members.joinedAt, leftAt: members.leftAt }).from(members).orderBy(desc(members.joinedAt)).limit(limit);
export const getWarParticipation = (playerTag: string) => db.select().from(warParticipants).where(eq(warParticipants.playerTag, playerTag));

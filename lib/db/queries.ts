import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { clans, members, wars, capitalDistrictSnapshots, warParticipants } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";

// UI reads stay behind this module so pages never depend on Drizzle's schema shape.
export const getClanInfo = () => db.select().from(clans).where(eq(clans.clanTag, clanConfig.clanTag)).limit(1);
export const getMembers = () => db.select().from(members).orderBy(desc(members.name));
export const getMemberDetail = (playerTag: string) => db.select().from(members).where(eq(members.playerTag, playerTag)).limit(1);
export const getWarHistory = (limit = 20) => db.select().from(wars).where(eq(wars.state, "warEnded")).orderBy(desc(wars.endTime)).limit(limit);
export const getCurrentWar = () => db.select().from(wars).where(ne(wars.state, "warEnded")).orderBy(desc(wars.id)).limit(1);
export const getCapitalDistricts = () => db.select().from(capitalDistrictSnapshots).orderBy(desc(capitalDistrictSnapshots.capturedAt));

export const getWarParticipation = (playerTag: string) => db.select().from(warParticipants).where(eq(warParticipants.playerTag, playerTag));

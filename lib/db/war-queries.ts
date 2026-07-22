/**
 * Server-side query layer for the War Center (concept/07-clan-war.md).
 *
 * Owns application reads only. Page components receive the `WarCenterData`
 * view model (defined in @/lib/view-models/war) and never depend on raw
 * Drizzle rows or raw CoC API payloads. See concept/12 Step 1.4.B.
 *
 * Server-only — imports @/lib/db which requires a DATABASE_URL. Never call
 * from a client component.
 */

import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wars, clans } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  WarCenterData,
  CurrentWarDetail,
  WarClanSide,
  WarRosterMember,
  WarAttackLogEntry,
  WarHistoryEntry,
} from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";

// TTL the refresh route enforces — surfaced to the UI for the "try again in
// Ns" hint. Kept in sync with app/api/war/refresh/route.ts.
const REFRESH_TTL_SECONDS = 45;

// ---------------------------------------------------------------------------
// getWarClanIdentity — minimal read for the War Center hero (our clan badge +
// name). Kept separate from getDashboardClan so the war page doesn't pull the
// full clan identity payload it doesn't need.
// ---------------------------------------------------------------------------

export async function getWarClanIdentity(): Promise<{
  name: string | null;
  badgeUrls: ClanBadgeUrls | null;
} | null> {
  const [row] = await db
    .select({ name: clans.name, badgeUrls: clans.badgeUrls })
    .from(clans)
    .where(eq(clans.clanTag, clanConfig.clanTag))
    .limit(1);
  if (!row) return null;
  return {
    name: row.name,
    badgeUrls: (row.badgeUrls as ClanBadgeUrls | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// getWarCenter — the single read the /war page needs.
// ---------------------------------------------------------------------------

export async function getWarCenter(): Promise<WarCenterData> {
  // Active war first (preparation or inWar — at most one per clan), else the
  // most recent ended war so the page always answers "what's the situation?".
  let warRow: typeof wars.$inferSelect | null = null;

  const [active] = await db
    .select()
    .from(wars)
    .where(inArray(wars.state, ["preparation", "inWar"]))
    .orderBy(desc(wars.startTime))
    .limit(1);
  if (active) {
    warRow = active;
  } else {
    const [ended] = await db
      .select()
      .from(wars)
      .where(eq(wars.state, "warEnded"))
      .orderBy(desc(wars.endTime))
      .limit(1);
    warRow = ended ?? null;
  }

  // ---- Clan war-log visibility (drives the private-war-log notice) ----
  const [clanRow] = await db
    .select({ isWarLogPublic: clans.isWarLogPublic })
    .from(clans)
    .where(eq(clans.clanTag, clanConfig.clanTag))
    .limit(1);

  // ---- History list (most-recent first, excluding the displayed current war) ----
  const historyRows = await db
    .select()
    .from(wars)
    .orderBy(desc(wars.endTime), desc(wars.id))
    .limit(50);

  // ---- Tracking start (earliest observed war) for the "history may be
  // incomplete before tracking" caveat. ----
  const [trackingRow] = await db
    .select({ earliest: sql<Date>`min(${wars.lastSyncedAt})` })
    .from(wars);

  // ---- Parse current war + attack log from the snapshot ----
  let currentWar: CurrentWarDetail | null = null;
  let attackLog: WarAttackLogEntry[] = [];
  if (warRow) {
    const parsed = parseWarSnapshot(warRow);
    if (parsed) {
      currentWar = parsed.detail;
      attackLog = parsed.attackLog;
    }
  }

  const history: WarHistoryEntry[] = historyRows
    .filter((r) => !warRow || r.id !== warRow.id)
    .map(toHistoryEntry);

  return {
    currentWar,
    attackLog,
    history,
    warLogPublic: clanRow?.isWarLogPublic ?? null,
    trackingStart: trackingRow?.earliest ?? null,
    refreshTtlSeconds: REFRESH_TTL_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// Snapshot parsing — defensive: the JSONB column holds the CocCurrentWar
// payload as-is, but we never trust raw JSON shape blindly.
// ---------------------------------------------------------------------------

interface RawAttack {
  attackerTag?: string;
  defenderTag?: string;
  stars?: number;
  destructionPercentage?: number;
  order?: number;
  duration?: number;
}

interface RawMember {
  tag?: string;
  name?: string;
  townhallLevel?: number;
  mapPosition?: number;
  attacks?: RawAttack[];
  opponentAttacks?: RawAttack[];
}

interface RawClanSide {
  tag?: string;
  name?: string;
  clanLevel?: number;
  badgeUrls?: ClanBadgeUrls;
  attacks?: number;
  stars?: number;
  destructionPercentage?: number;
  members?: RawMember[];
}

interface RawSnapshot {
  state?: string;
  teamSize?: number;
  attacksPerMember?: number;
  startTime?: string;
  endTime?: string;
  preparationStartTime?: string;
  clan?: RawClanSide;
  opponent?: RawClanSide;
}

interface RosterLookup {
  name: string;
  mapPosition: number;
  townhallLevel: number;
  isOwnClan: boolean;
}

function parseWarSnapshot(row: typeof wars.$inferSelect): {
  detail: CurrentWarDetail;
  attackLog: WarAttackLogEntry[];
} | null {
  if (!row.warSnapshot) return null;
  const snap = row.warSnapshot as RawSnapshot;
  if (!snap.clan || !snap.opponent) return null;

  const attacksPerMember = snap.attacksPerMember ?? row.attacksPerMember ?? 2;
  const teamSize = snap.teamSize ?? row.teamSize ?? null;

  // Build a tag → roster lookup across both clans for attack-log enrichment.
  const lookup = new Map<string, RosterLookup>();
  for (const m of snap.clan.members ?? []) {
    if (m.tag) {
      lookup.set(m.tag, {
        name: m.name ?? "Unknown",
        mapPosition: m.mapPosition ?? 0,
        townhallLevel: m.townhallLevel ?? 0,
        isOwnClan: true,
      });
    }
  }
  for (const m of snap.opponent.members ?? []) {
    if (m.tag) {
      lookup.set(m.tag, {
        name: m.name ?? "Unknown",
        mapPosition: m.mapPosition ?? 0,
        townhallLevel: m.townhallLevel ?? 0,
        isOwnClan: false,
      });
    }
  }

  const clanSide = buildClanSide(snap.clan, true, teamSize, attacksPerMember);
  const opponentSide = buildClanSide(
    snap.opponent,
    false,
    teamSize,
    attacksPerMember,
  );

  // Merge both clans' attacks into one ordered log.
  const allAttacks: RawAttack[] = [
    ...(snap.clan.members ?? []).flatMap((m) => m.attacks ?? []),
    ...(snap.opponent.members ?? []).flatMap((m) => m.attacks ?? []),
  ];
  const attackLog: WarAttackLogEntry[] = allAttacks
    .filter((a) => a.attackerTag && a.defenderTag && typeof a.order === "number")
    .map((a) => {
      const attacker = lookup.get(a.attackerTag!);
      const defender = lookup.get(a.defenderTag!);
      return {
        order: a.order!,
        attackerTag: a.attackerTag!,
        attackerName: attacker?.name ?? "Unknown",
        attackerMapPosition: attacker?.mapPosition ?? null,
        attackerTownhallLevel: attacker?.townhallLevel ?? null,
        attackerIsOwnClan: attacker?.isOwnClan ?? false,
        defenderTag: a.defenderTag!,
        defenderName: defender?.name ?? "Unknown",
        defenderMapPosition: defender?.mapPosition ?? null,
        defenderTownhallLevel: defender?.townhallLevel ?? null,
        defenderIsOwnClan: defender?.isOwnClan ?? false,
        stars: a.stars ?? 0,
        destructionPercentage: a.destructionPercentage ?? 0,
        duration: a.duration ?? null,
      };
    })
    .sort((a, b) => a.order - b.order);

  const detail: CurrentWarDetail = {
    warId: row.id,
    warType: row.warType as "regular" | "cwl",
    state: row.state as CurrentWarDetail["state"],
    teamSize,
    attacksPerMember: attacksPerMember,
    startTime: row.startTime,
    endTime: row.endTime,
    preparationStartTime: row.preparationStartTime,
    lastSyncedAt: row.lastSyncedAt,
    clan: clanSide,
    opponent: opponentSide,
  };

  return { detail, attackLog };
}

function buildClanSide(
  side: RawClanSide,
  isOwnClan: boolean,
  teamSize: number | null,
  attacksPerMember: number,
): WarClanSide {
  const totalAllowed =
    teamSize != null ? teamSize * attacksPerMember : null;
  const attacks = side.attacks ?? 0;
  return {
    tag: side.tag ?? "",
    name: side.name ?? "Unknown",
    clanLevel: side.clanLevel ?? null,
    badgeUrls: side.badgeUrls ?? null,
    stars: side.stars ?? 0,
    destructionPercentage: side.destructionPercentage ?? 0,
    attacks,
    attacksRemaining: totalAllowed != null ? Math.max(0, totalAllowed - attacks) : 0,
    members: (side.members ?? [])
      .slice()
      .sort((a, b) => (a.mapPosition ?? 0) - (b.mapPosition ?? 0))
      .map((m) => buildRosterMember(m, isOwnClan, attacksPerMember)),
  };
}

function buildRosterMember(
  m: RawMember,
  isOwnClan: boolean,
  attacksAllowed: number,
): WarRosterMember {
  const ownAttacks = m.attacks ?? [];
  const defenseAttacks = m.opponentAttacks ?? [];
  const attacksUsed = ownAttacks.length;
  const bestStars = ownAttacks.length
    ? Math.max(...ownAttacks.map((a) => a.stars ?? 0))
    : null;
  const bestDestruction = ownAttacks.length
    ? Math.max(...ownAttacks.map((a) => a.destructionPercentage ?? 0))
    : null;
  const bestDefenseStars = defenseAttacks.length
    ? Math.min(...defenseAttacks.map((a) => a.stars ?? 0))
    : null;
  return {
    tag: m.tag ?? "",
    name: m.name ?? "Unknown",
    mapPosition: m.mapPosition ?? 0,
    townhallLevel: m.townhallLevel ?? 0,
    attacksUsed,
    attacksAllowed,
    attacksRemaining: Math.max(0, attacksAllowed - attacksUsed),
    bestStars,
    bestDestruction,
    defendedAgainst: defenseAttacks.length,
    bestDefenseStars,
    isOwnClan,
  };
}

function toHistoryEntry(row: typeof wars.$inferSelect): WarHistoryEntry {
  return {
    warId: row.id,
    warType: row.warType as "regular" | "cwl",
    opponentName: row.opponentName,
    opponentTag: row.opponentTag,
    opponentBadgeUrls: row.opponentBadgeUrls as ClanBadgeUrls | null,
    opponentClanLevel: row.opponentClanLevel,
    result: row.result as WarHistoryEntry["result"],
    teamSize: row.teamSize,
    ownStars: row.ownStars,
    opponentStars: row.opponentStars,
    ownDestructionPercentage: row.ownDestructionPercentage,
    opponentDestructionPercentage: row.opponentDestructionPercentage,
    endTime: row.endTime,
    startTime: row.startTime,
    attacksPerMember: row.attacksPerMember,
    hasDetail: !!row.warSnapshot,
    lastSyncedAt: row.lastSyncedAt,
  };
}

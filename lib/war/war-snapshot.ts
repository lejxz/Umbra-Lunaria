/**
 * War snapshot parsing + analysis — pure logic extracted from
 * `lib/db/war-queries.ts` so it can be unit-tested without a database
 * (concept/12 Step 1.1.C / the "mocked query boundary" test strategy — see
 * tests/README.md).
 *
 * `parseWarSnapshot` takes a war row (with the JSONB `warSnapshot` payload)
 * and returns the parsed `{ detail, attackLog }` view models. `buildAnalysis`
 * derives the analysis totals. `toHistoryEntry` maps a projected row to the
 * history view model.
 *
 * Pure: no DB, no React, no I/O. The `WarRow` interface decouples these
 * functions from the Drizzle row type so they can be tested with plain
 * fixture objects.
 */

import type {
  CurrentWarDetail,
  WarClanSide,
  WarRosterMember,
  WarAttackLogEntry,
  WarHistoryEntry,
  WarAnalysis,
} from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";

// ---------------------------------------------------------------------------
// Raw JSONB shapes — defensive: the snapshot column holds the CocCurrentWar
// payload as-is, but we never trust raw JSON shape blindly.
// ---------------------------------------------------------------------------

export interface RawAttack {
  attackerTag?: string;
  defenderTag?: string;
  stars?: number;
  destructionPercentage?: number;
  order?: number;
  duration?: number;
}

export interface RawMember {
  tag?: string;
  name?: string;
  townhallLevel?: number;
  mapPosition?: number;
  attacks?: RawAttack[];
  opponentAttacks?: RawAttack[];
}

export interface RawClanSide {
  tag?: string;
  name?: string;
  clanLevel?: number;
  badgeUrls?: ClanBadgeUrls;
  attacks?: number;
  stars?: number;
  destructionPercentage?: number;
  members?: RawMember[];
}

export interface RawSnapshot {
  state?: string;
  teamSize?: number;
  attacksPerMember?: number;
  startTime?: string;
  endTime?: string;
  preparationStartTime?: string;
  clan?: RawClanSide;
  opponent?: RawClanSide;
}

// ---------------------------------------------------------------------------
// WarRow — the minimal row shape parseWarSnapshot reads. Decoupled from
// Drizzle so tests can pass plain fixtures.
// ---------------------------------------------------------------------------

export interface WarRow {
  id: number;
  warType: string;
  state: string;
  teamSize: number | null;
  attacksPerMember: number | null;
  startTime: Date | null;
  endTime: Date | null;
  preparationStartTime: Date | null;
  lastSyncedAt: Date | null;
  warSnapshot: unknown;
}

export interface HistoryProjection {
  id: number;
  warType: string;
  opponentName: string | null;
  opponentTag: string | null;
  opponentBadgeUrls: unknown;
  opponentClanLevel: number | null;
  result: string | null;
  teamSize: number | null;
  ownStars: number | null;
  opponentStars: number | null;
  ownDestructionPercentage: number | null;
  opponentDestructionPercentage: number | null;
  endTime: Date | null;
  startTime: Date | null;
  attacksPerMember: number | null;
  lastSyncedAt: Date | null;
  hasSnapshot: boolean;
}

// ---------------------------------------------------------------------------
// parseWarSnapshot
// ---------------------------------------------------------------------------

interface RosterLookup {
  name: string;
  mapPosition: number;
  townhallLevel: number;
  isOwnClan: boolean;
}

export function parseWarSnapshot(row: WarRow): {
  detail: CurrentWarDetail;
  attackLog: WarAttackLogEntry[];
} | null {
  if (!row.warSnapshot) return null;
  const snap = row.warSnapshot as RawSnapshot;
  if (!snap.clan || !snap.opponent) return null;

  const attacksPerMember = snap.attacksPerMember ?? row.attacksPerMember ?? 2;
  const teamSize = snap.teamSize ?? row.teamSize ?? null;

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
    attacksPerMember,
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
  const totalAllowed = teamSize != null ? teamSize * attacksPerMember : null;
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
  const worstDefenseStars = defenseAttacks.length
    ? Math.max(...defenseAttacks.map((a) => a.stars ?? 0))
    : null;
  const worstDefenseDestruction = defenseAttacks.length
    ? Math.max(...defenseAttacks.map((a) => a.destructionPercentage ?? 0))
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
    worstDefenseStars,
    worstDefenseDestruction,
    isOwnClan,
  };
}

// ---------------------------------------------------------------------------
// buildAnalysis
// ---------------------------------------------------------------------------

export function buildAnalysis(
  detail: CurrentWarDetail,
  attackLog: WarAttackLogEntry[],
): WarAnalysis {
  const ownAttacks = attackLog.filter((a) => a.attackerIsOwnClan);
  const oppAttacks = attackLog.filter((a) => !a.attackerIsOwnClan);
  const ownAttacksUsed = ownAttacks.length;
  const oppAttacksUsed = oppAttacks.length;
  const total =
    detail.teamSize != null && detail.attacksPerMember != null
      ? detail.teamSize * detail.attacksPerMember
      : null;
  const ownAttacksTotal = total ?? 0;
  const opponentAttacksTotal = total ?? 0;

  const ownThree = ownAttacks.filter((a) => a.stars >= 3).length;
  const oppThree = oppAttacks.filter((a) => a.stars >= 3).length;
  const ownStarsSum = ownAttacks.reduce((s, a) => s + a.stars, 0);
  const oppStarsSum = oppAttacks.reduce((s, a) => s + a.stars, 0);

  const isBattle = detail.state !== "preparation";
  const ownNoAttack = isBattle
    ? detail.clan.members.filter((m) => m.attacksUsed === 0).length
    : null;
  const oppNoAttack = isBattle
    ? detail.opponent.members.filter((m) => m.attacksUsed === 0).length
    : null;

  let ownBestAttack: WarAnalysis["ownBestAttack"] = null;
  if (ownAttacks.length > 0) {
    const sorted = [...ownAttacks].sort(
      (a, b) =>
        b.destructionPercentage - a.destructionPercentage || b.stars - a.stars,
    );
    const top = sorted[0];
    if (top) {
      ownBestAttack = {
        attackerName: top.attackerName,
        stars: top.stars,
        destruction: top.destructionPercentage,
      };
    }
  }

  const ownThs = detail.clan.members.map((m) => m.townhallLevel).filter((t) => t > 0);
  const oppThs = detail.opponent.members
    .map((m) => m.townhallLevel)
    .filter((t) => t > 0);
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null;

  return {
    ownAttacksUsed,
    ownAttacksTotal,
    opponentAttacksUsed: oppAttacksUsed,
    opponentAttacksTotal,
    ownThreeStarRate: ownAttacksUsed > 0 ? ownThree / ownAttacksUsed : null,
    opponentThreeStarRate: oppAttacksUsed > 0 ? oppThree / oppAttacksUsed : null,
    ownAverageStars: ownAttacksUsed > 0 ? ownStarsSum / ownAttacksUsed : null,
    opponentAverageStars: oppAttacksUsed > 0 ? oppStarsSum / oppAttacksUsed : null,
    ownNoAttackMembers: ownNoAttack,
    opponentNoAttackMembers: oppNoAttack,
    ownBestAttack,
    ownAverageTh: avg(ownThs),
    opponentAverageTh: avg(oppThs),
  };
}

// ---------------------------------------------------------------------------
// toHistoryEntry
// ---------------------------------------------------------------------------

export function toHistoryEntry(row: HistoryProjection): WarHistoryEntry {
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
    hasDetail: row.hasSnapshot,
    lastSyncedAt: row.lastSyncedAt,
  };
}

/**
 * Server-side query layer for the War Center (concept/07-clan-war.md).
 *
 * Owns application reads only. Page components receive the `WarCenterData`
 * view model (defined in @/lib/view-models/war) and never depend on raw
 * Drizzle rows or raw CoC API payloads. See concept/12 Step 1.4.B.
 *
 * The pure parsing/analysis logic (`parseWarSnapshot`, `buildAnalysis`,
 * `toHistoryEntry`) lives in `lib/war/war-snapshot.ts` so it can be unit-tested
 * without a database. This module owns only the DB queries + wiring.
 *
 * Server-only — imports @/lib/db which requires a DATABASE_URL. Never call
 * from a client component.
 */

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wars, clans, cwlSeasons } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  WarCenterData,
  CurrentWarDetail,
  WarAttackLogEntry,
  WarHistoryEntry,
  WarDetailView,
  WarLeadAnalysis,
  CwlSeasonView,
  CwlClanStanding,
  CwlRoundWar,
} from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import {
  parseWarSnapshot,
  buildAnalysis,
  toHistoryEntry,
  type HistoryProjection,
} from "@/lib/war/war-snapshot";

// TTL the refresh route enforces — surfaced to the UI for the "try again in
// Ns" hint. Kept in sync with app/api/war/refresh/route.ts.
const REFRESH_TTL_SECONDS = 45;

// ---------------------------------------------------------------------------
// getWarClanIdentity
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
// computeLeadAnalysis — "who's winning" for the war hero.
// ---------------------------------------------------------------------------

function computeLeadAnalysis(
  currentWar: CurrentWarDetail | null,
): WarLeadAnalysis {
  if (!currentWar || !currentWar.clan || !currentWar.opponent) {
    return { leader: "unknown", summary: "" };
  }
  const { clan, opponent, state } = currentWar;
  if (state === "preparation") {
    return { leader: "unknown", summary: "Preparation day — no attacks yet" };
  }
  const starDiff = clan.stars - opponent.stars;
  if (starDiff > 0) {
    return { leader: "own", summary: `Leading by ${starDiff} star${starDiff === 1 ? "" : "s"}` };
  }
  if (starDiff < 0) {
    return { leader: "opponent", summary: `Trailing by ${Math.abs(starDiff)} star${Math.abs(starDiff) === 1 ? "" : "s"}` };
  }
  // Stars tied — check destruction.
  const destDiff = clan.destructionPercentage - opponent.destructionPercentage;
  if (destDiff > 0) {
    return { leader: "own", summary: "Tied on stars, ahead on destruction" };
  }
  if (destDiff < 0) {
    return { leader: "opponent", summary: "Tied on stars, behind on destruction" };
  }
  return { leader: "tied", summary: "Dead even — same stars and destruction" };
}

// ---------------------------------------------------------------------------
// getWarCenter
// ---------------------------------------------------------------------------

export async function getWarCenter(): Promise<WarCenterData> {
  // Active war (preparation or inWar — at most one per clan).
  const [active] = await db
    .select()
    .from(wars)
    .where(inArray(wars.state, ["preparation", "inWar"]))
    .orderBy(desc(wars.startTime))
    .limit(1);
  const warRow = active ?? null;

  // Clan war-log visibility.
  const [clanRow] = await db
    .select({ isWarLogPublic: clans.isWarLogPublic })
    .from(clans)
    .where(eq(clans.clanTag, clanConfig.clanTag))
    .limit(1);

  // History list — project only needed columns + a hasSnapshot boolean.
  const historyProjection = {
    id: wars.id,
    warType: wars.warType,
    opponentName: wars.opponentName,
    opponentTag: wars.opponentTag,
    opponentBadgeUrls: wars.opponentBadgeUrls,
    opponentClanLevel: wars.opponentClanLevel,
    result: wars.result,
    teamSize: wars.teamSize,
    ownStars: wars.ownStars,
    opponentStars: wars.opponentStars,
    ownDestructionPercentage: wars.ownDestructionPercentage,
    opponentDestructionPercentage: wars.opponentDestructionPercentage,
    endTime: wars.endTime,
    startTime: wars.startTime,
    attacksPerMember: wars.attacksPerMember,
    lastSyncedAt: wars.lastSyncedAt,
    hasSnapshot: sql<boolean>`${wars.warSnapshot} IS NOT NULL`,
  };
  const historyRows: HistoryProjection[] = warRow
    ? await db
        .select(historyProjection)
        .from(wars)
        .where(ne(wars.id, warRow.id))
        .orderBy(desc(wars.endTime), desc(wars.id))
        .limit(50)
    : await db
        .select(historyProjection)
        .from(wars)
        .orderBy(desc(wars.endTime), desc(wars.id))
        .limit(50);

  // Tracking start.
  const [trackingRow] = await db
    .select({ earliest: sql<Date>`min(${wars.lastSyncedAt})` })
    .from(wars);

  // Parse current war + attack log from the snapshot.
  let currentWar: CurrentWarDetail | null = null;
  let attackLog: WarAttackLogEntry[] = [];
  if (warRow) {
    const parsed = parseWarSnapshot(warRow);
    if (parsed) {
      currentWar = parsed.detail;
      attackLog = parsed.attackLog;
    }
  }

  // Last result (most recent ended war when no active war).
  let lastResult: WarHistoryEntry | null = null;
  if (!currentWar && historyRows.length > 0 && historyRows[0]) {
    lastResult = toHistoryEntry(historyRows[0]);
  }

  const history: WarHistoryEntry[] = historyRows.map(toHistoryEntry);

  // Lead analysis + CWL season — run in parallel.
  const [leadAnalysis, cwlSeason] = await Promise.all([
    Promise.resolve(computeLeadAnalysis(currentWar)),
    getCwlSeason(),
  ]);

  return {
    currentWar,
    attackLog,
    history,
    lastResult,
    warLogPublic: clanRow?.isWarLogPublic ?? null,
    trackingStart: trackingRow?.earliest ?? null,
    refreshTtlSeconds: REFRESH_TTL_SECONDS,
    leadAnalysis,
    cwlSeason,
  };
}

// ---------------------------------------------------------------------------
// getWarDetail — fetch a single live-tracked war by id for the detail sheet.
// ---------------------------------------------------------------------------

export async function getWarDetail(warId: number): Promise<WarDetailView | null> {
  const [row] = await db
    .select()
    .from(wars)
    .where(eq(wars.id, warId))
    .limit(1);
  if (!row) return null;

  const parsed = parseWarSnapshot(row);
  if (!parsed) return null;

  const analysis = buildAnalysis(parsed.detail, parsed.attackLog);
  return {
    detail: parsed.detail,
    attackLog: parsed.attackLog,
    analysis,
  };
}

// ---------------------------------------------------------------------------
// getCwlSeason — fetch the latest CWL season with standings + day-by-day.
// ---------------------------------------------------------------------------

interface RawLeagueGroupClan {
  tag?: string;
  name?: string;
  clanLevel?: number;
  badgeUrls?: ClanBadgeUrls;
}

interface RawLeagueGroup {
  state?: string;
  season?: string;
  clans?: RawLeagueGroupClan[];
  rounds?: Array<{ warTags: string[] }>;
}

export async function getCwlSeason(): Promise<CwlSeasonView | null> {
  // Get the latest CWL season row.
  const [seasonRow] = await db
    .select()
    .from(cwlSeasons)
    .orderBy(desc(cwlSeasons.capturedAt))
    .limit(1);
  if (!seasonRow) return null;

  const group = seasonRow.leagueGroup as RawLeagueGroup;
  const clanTag = clanConfig.clanTag;
  const leagueClans = group.clans ?? [];

  // Build standings from all CWL wars in this season.
  // We need ALL CWL wars (including other clans') to build the full table.
  // The wars are stored with warType='cwl'; for our wars, opponentTag is the
  // enemy; for other clans' wars, opponentTag is one clan and the "own" side
  // (ownStars etc.) is the other clan. We need to identify both participants.
  //
  // Problem: for other clans' wars, we store opponentTag but NOT the "clan"
  // (first) side's tag in a queryable column. The war_tag identifies the war
  // but not the first clan. We need to look up the warTag from the league
  // group rounds to map each war to its two participants.
  //
  // Approach: for each round's warTags, we know which warTags map to which
  // wars. We fetch all CWL wars and match by warTag to the league group's
  // round structure. For each war, the API response has clan.tag and
  // opponent.tag — but we only stored opponentTag in the DB. For our wars,
  // the "clan" side is us. For other clans' wars, we don't know the first
  // clan's tag from the DB row alone.
  //
  // Simplification: build standings from the league group's clan list + our
  // CWL wars only. For each league clan, check if we have a war where they
  // are the opponent (our war) — if so, we know the result. For clans we
  // haven't faced yet, show "not played". Other clans' wars against each
  // other are not reflected (we'd need to store the first clan's tag).
  //
  // This gives a partial standings table — our record is complete, others are
  // partial. Honest about the limitation.

  // Fetch all CWL wars (both ours and others').
  const cwlWars = await db
    .select()
    .from(wars)
    .where(eq(wars.warType, "cwl"))
    .orderBy(desc(wars.id));

  // Build a warTag → war lookup.
  const warByTag = new Map<string, typeof wars.$inferSelect>();
  for (const w of cwlWars) {
    if (w.warTag) warByTag.set(w.warTag, w);
  }

  // Build rounds (day-by-day view for OUR clan).
  const rounds: CwlRoundWar[] = (group.rounds ?? []).map((round, index) => {
    // Find our clan's war in this round.
    let ourWar: typeof wars.$inferSelect | null = null;
    for (const warTag of round.warTags ?? []) {
      if (!warTag || warTag === "#0") continue;
      const w = warByTag.get(warTag);
      if (w && (w.opponentTag || w.warTag === warTag)) {
        // Check if this war involves us: either opponentTag matches a known
        // clan in the league AND the war was synced as ours (has a snapshot
        // or was synced with our clan as the "own" side), OR we can check
        // the war's opponent — if the opponent is one of the league clans
        // and the war has a snapshot, it's likely ours.
        // Actually, the simplest check: our wars have warSnapshot !== null
        // (syncCurrentWar stores the snapshot). Other clans' wars have
        // warSnapshot === null (syncCwlOtherWar doesn't store one).
        if (w.warSnapshot) {
          ourWar = w;
          break;
        }
      }
    }
    return {
      warTag: ourWar?.warTag ?? null,
      roundIndex: index,
      opponentName: ourWar?.opponentName ?? null,
      opponentTag: ourWar?.opponentTag ?? null,
      opponentBadgeUrls: (ourWar?.opponentBadgeUrls as ClanBadgeUrls | null) ?? null,
      result: (ourWar?.result as CwlRoundWar["result"]) ?? null,
      ownStars: ourWar?.ownStars ?? null,
      opponentStars: ourWar?.opponentStars ?? null,
      state: ourWar?.state ?? null,
      warId: ourWar?.id ?? null,
    };
  });

  // Build standings — from our CWL wars only (partial for other clans).
  const standings: CwlClanStanding[] = leagueClans.map((lc) => {
    const isOwn = lc.tag === clanTag;
    // Find our war against this clan.
    const warVs = cwlWars.find(
      (w) => w.warSnapshot && w.opponentTag === lc.tag,
    );
    const wins = warVs?.result === "win" ? 1 : 0;
    const losses = warVs?.result === "loss" ? 1 : 0;
    const ties = warVs?.result === "tie" ? 1 : 0;
    const warsPlayed = warVs ? 1 : 0;
    const starsFor = warVs?.ownStars ?? 0;
    const starsAgainst = warVs?.opponentStars ?? 0;
    const destructionPercentage = warVs?.ownDestructionPercentage ?? null;

    return {
      tag: lc.tag ?? "",
      name: lc.name ?? "Unknown",
      clanLevel: lc.clanLevel ?? null,
      badgeUrls: lc.badgeUrls ?? null,
      warsPlayed,
      wins,
      losses,
      ties,
      starsFor,
      starsAgainst,
      destructionPercentage,
      isOwnClan: isOwn,
    };
  });

  // Sort standings: by starsFor desc, then destruction desc.
  standings.sort((a, b) => {
    if (b.starsFor !== a.starsFor) return b.starsFor - a.starsFor;
    return (b.destructionPercentage ?? 0) - (a.destructionPercentage ?? 0);
  });

  // Find our rank.
  const ourRank = standings.findIndex((s) => s.isOwnClan);
  const isOwnClanInLeague = leagueClans.some((c) => c.tag === clanTag);

  return {
    season: seasonRow.season,
    state: seasonRow.state,
    rounds,
    standings,
    ourRank: ourRank >= 0 ? ourRank + 1 : null,
    isOwnClanInLeague,
    capturedAt: seasonRow.capturedAt,
  };
}

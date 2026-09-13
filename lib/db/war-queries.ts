/**
 * Server-side query layer for the War Center (docs/concept/07-clan-war.md).
 *
 * Owns application reads only. Page components receive the `WarCenterData`
 * view model (defined in @/lib/view-models/war) and never depend on raw
 * Drizzle rows or raw CoC API payloads. See docs/concept/12 Step 1.4.B.
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
  // involvesOwnClan filter (fix A-4): during CWL, the table also holds other
  // clans' preparation/inWar rows — never select one of those as OUR war.
  const [active] = await db
    .select()
    .from(wars)
    .where(
      and(
        inArray(wars.state, ["preparation", "inWar"]),
        eq(wars.involvesOwnClan, true),
      ),
    )
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
    expEarned: wars.expEarned,
    expPerAttack: wars.expPerAttack,
  };
  const historyRows: HistoryProjection[] = warRow
    ? await db
        .select(historyProjection)
        .from(wars)
        .where(
          and(
            ne(wars.id, warRow.id),
            // fix A-4: other clans' CWL wars crowd out our own history — exclude.
            eq(wars.involvesOwnClan, true),
          ),
        )
        .orderBy(desc(wars.endTime), desc(wars.id))
        .limit(50)
    : await db
        .select(historyProjection)
        .from(wars)
        .where(eq(wars.involvesOwnClan, true))
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

  // Build standings from ALL stored CWL wars (fix A-4 + Feature 1). The wars
  // table now records which clan the "own" side is (wars.own_clan_tag) and
  // whether the war involves us (wars.involves_own_clan), so the full 8-clan
  // standings can be computed from every league war — not just our own
  // matches. Pre-fix foreign rows have own_clan_tag = NULL, so their first
  // side is unknown and those wars only count for the opponent-side clan; the
  // table completes as each round is re-synced.

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

  // Build rounds (day-by-day view for OUR clan). Our war in a round is the
  // one flagged involvesOwnClan (foreign CWL rows are flagged false by the
  // sync and by the migration 0010 backfill).
  const rounds: CwlRoundWar[] = (group.rounds ?? []).map((round, index) => {
    // Find our clan's war in this round.
    let ourWar: typeof wars.$inferSelect | null = null;
    for (const warTag of round.warTags ?? []) {
      if (!warTag || warTag === "#0") continue;
      const w = warByTag.get(warTag);
      if (w && w.involvesOwnClan) {
        ourWar = w;
        break;
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

  // Build standings from every stored CWL war. Each league clan's record is
  // aggregated over wars where it appears on EITHER side:
  //   - own side    (wars.own_clan_tag = clan tag): starsFor = own_stars
  //   - as opponent (wars.opponent_tag = clan tag): starsFor = opponent_stars
  // `result` is stored from the own side's perspective, so it flips when the
  // clan is the opponent. Wars still in preparation carry no stars and are
  // skipped; inWar/warEnded rows count even while live.
  const standings: CwlClanStanding[] = leagueClans.map((lc) => {
    const isOwn = lc.tag === clanTag;

    let warsPlayed = 0;
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let starsFor = 0;
    let starsAgainst = 0;
    let destructionSum = 0;
    let destructionCount = 0;

    for (const w of cwlWars) {
      if (w.state === "preparation") continue;

      const asOwn = w.ownClanTag === lc.tag;
      const asOpponent = !asOwn && w.opponentTag === lc.tag;
      if (!asOwn && !asOpponent) continue;

      // Skip unplayed wars: no stars on the board and no result yet.
      const clanStars = asOwn ? (w.ownStars ?? 0) : (w.opponentStars ?? 0);
      const oppStars = asOwn ? (w.opponentStars ?? 0) : (w.ownStars ?? 0);
      if (clanStars === 0 && oppStars === 0 && w.result == null) continue;

      warsPlayed += 1;
      starsFor += clanStars;
      starsAgainst += oppStars;

      if (w.result === "win") {
        if (asOwn) wins++;
        else losses++;
      } else if (w.result === "loss") {
        if (asOwn) losses++;
        else wins++;
      } else if (w.result === "tie") {
        ties++;
      }

      const destruction = asOwn
        ? w.ownDestructionPercentage
        : w.opponentDestructionPercentage;
      if (destruction != null) {
        destructionSum += destruction;
        destructionCount += 1;
      }
    }

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
      destructionPercentage:
        destructionCount > 0
          ? Math.round(destructionSum / destructionCount)
          : null,
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

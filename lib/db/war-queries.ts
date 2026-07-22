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

import { desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wars, clans } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  WarCenterData,
  CurrentWarDetail,
  WarAttackLogEntry,
  WarHistoryEntry,
  WarDetailView,
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

  return {
    currentWar,
    attackLog,
    history,
    lastResult,
    warLogPublic: clanRow?.isWarLogPublic ?? null,
    trackingStart: trackingRow?.earliest ?? null,
    refreshTtlSeconds: REFRESH_TTL_SECONDS,
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

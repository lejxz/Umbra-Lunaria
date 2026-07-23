/**
 * Server-side query layer for the Clan Capital page (concept/08-clan-capital.md).
 *
 * Owns application reads only. Page components receive the `CapitalPageData`
 * view model (defined in @/lib/view-models/capital) and never depend on raw
 * Drizzle rows. See concept/12 Step 1.5.
 *
 * The pure district-diff logic lives in `lib/capital/district-diff.ts` so it
 * can be unit-tested without a database.
 *
 * Server-only — imports @/lib/db which requires a DATABASE_URL. Never call
 * from a client component.
 */

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clans, capitalDistrictSnapshots } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";
import type {
  CapitalPageData,
  CapitalOverview,
  CapitalDistrict,
  DistrictUpgradeHistory,
} from "@/lib/view-models/capital";
import {
  diffDistrictSnapshots,
  type DistrictSnapshotRow,
} from "@/lib/capital/district-diff";

// ---------------------------------------------------------------------------
// getCapitalPage — the single read the /capital page needs.
// ---------------------------------------------------------------------------

export async function getCapitalPage(): Promise<CapitalPageData> {
  const [overview, upgradeHistory] = await Promise.all([
    getCapitalOverview(),
    getDistrictUpgradeHistory(),
  ]);

  return {
    overview,
    upgradeHistory,
    // Phase 3.1 adds raid-season ingestion. Until then, no raid history.
    raidHistoryAvailable: false,
  };
}

// ---------------------------------------------------------------------------
// getCapitalOverview — current Capital facts from the cached clan row.
// ---------------------------------------------------------------------------

export async function getCapitalOverview(): Promise<CapitalOverview> {
  const [clan] = await db
    .select({
      capitalHallLevel: clans.capitalHallLevel,
      clanCapitalPoints: clans.clanCapitalPoints,
      capitalLeague: clans.capitalLeague,
      districtsPayload: clans.districtsPayload,
      lastPolledAt: clans.lastPolledAt,
      lastDailyBatchAt: clans.lastDailyBatchAt,
    })
    .from(clans)
    .where(eq(clans.clanTag, clanConfig.clanTag))
    .limit(1);

  // Latest district-snapshot capture time (more precise than lastDailyBatchAt
  // for the "when was Capital last captured" freshness label).
  const [lastSnap] = await db
    .select({ max: sql<Date>`max(${capitalDistrictSnapshots.capturedAt})` })
    .from(capitalDistrictSnapshots);
  const lastCaptureAt = lastSnap?.max ?? clan?.lastDailyBatchAt ?? null;

  if (!clan) {
    return {
      capitalHallLevel: null,
      capitalPoints: null,
      capitalLeague: null,
      districtCount: null,
      districts: [],
      lastCaptureAt: null,
      hasDistricts: false,
    };
  }

  const districts = parseDistricts(clan.districtsPayload);

  return {
    capitalHallLevel: clan.capitalHallLevel ?? null,
    capitalPoints: clan.clanCapitalPoints ?? null,
    capitalLeague: (clan.capitalLeague as { name: string } | null) ?? null,
    districtCount: districts.length,
    districts,
    lastCaptureAt,
    hasDistricts: districts.length > 0,
  };
}

// ---------------------------------------------------------------------------
// getDistrictUpgradeHistory — diff daily snapshots into upgrade events.
// ---------------------------------------------------------------------------

export async function getDistrictUpgradeHistory(): Promise<DistrictUpgradeHistory> {
  const rows = await db
    .select({
      districtName: capitalDistrictSnapshots.districtName,
      districtHallLevel: capitalDistrictSnapshots.districtHallLevel,
      capturedAt: capitalDistrictSnapshots.capturedAt,
    })
    .from(capitalDistrictSnapshots)
    .orderBy(
      asc(capitalDistrictSnapshots.districtName),
      asc(capitalDistrictSnapshots.capturedAt),
    );

  const snapshotRows: DistrictSnapshotRow[] = rows.map((r) => ({
    districtName: r.districtName,
    districtHallLevel: r.districtHallLevel,
    capturedAt: r.capturedAt,
  }));

  const events = diffDistrictSnapshots(snapshotRows);

  // Distinct district names (for the filter), sorted alphabetically.
  const districtNames = Array.from(
    new Set(snapshotRows.map((r) => r.districtName)),
  ).sort((a, b) => a.localeCompare(b));

  // Earliest capture time.
  const [earliest] = await db
    .select({ min: sql<Date>`min(${capitalDistrictSnapshots.capturedAt})` })
    .from(capitalDistrictSnapshots);
  const trackingStart = earliest?.min ?? null;

  // Cold start = only one snapshot per district (no diffs possible). Compute
  // by checking if any district has > 1 snapshot.
  const counts = new Map<string, number>();
  for (const r of snapshotRows) {
    counts.set(r.districtName, (counts.get(r.districtName) ?? 0) + 1);
  }
  const isColdStart =
    snapshotRows.length === 0 ||
    Array.from(counts.values()).every((c) => c <= 1);

  return {
    events,
    districtNames,
    trackingStart,
    isColdStart,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RawDistrict {
  id?: number;
  name?: string;
  districtHallLevel?: number;
}

/**
 * Parse the `districtsPayload` JSONB from the clan row. The payload is the
 * CoC API's `clanCapital.districts[]` array. Defensive: never trust raw JSON.
 */
function parseDistricts(payload: unknown): CapitalDistrict[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((d): CapitalDistrict | null => {
      const raw = d as RawDistrict;
      if (!raw || typeof raw.name !== "string") return null;
      const level =
        typeof raw.districtHallLevel === "number" ? raw.districtHallLevel : 0;
      return { name: raw.name, districtHallLevel: level };
    })
    .filter((d): d is CapitalDistrict => d !== null);
}

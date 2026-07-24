"use client";

import { useState } from "react";
import type { CapitalPageData } from "@/lib/view-models/capital";
import { CapitalOverviewCard } from "./capital-overview-card";
import { RaidPendingCard } from "./raid-pending-card";
import { UpgradeTimeline } from "./upgrade-timeline";
import { DistrictList } from "./district-list";

/**
 * Capital page shell — client-side composition root. Holds the district-filter
 * state for the upgrade timeline.
 *
 * Layout order (revised 2026-07-23 per user request):
 *   1. Overview — current Capital facts (Hall, points, league, districts).
 *   2. Raid-weekend history — the high-value seasonal content (pending until
 *      Phase 3.1 ingestion, but positioned where users expect it).
 *   3. Upgrade timeline — tracked district-level changes over time.
 *   4. District list — the full current-level reference, last because district
 *      levels change infrequently (a level-up is a multi-day event).
 *
 * Every section renders its own empty/unavailable/cold-start state.
 */
export function CapitalShell({ data }: { data: CapitalPageData }) {
  const [filter, setFilter] = useState<string>("all");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CapitalOverviewCard overview={data.overview} />
        <DistrictList districts={data.overview.districts} hasDistricts={data.overview.hasDistricts} />
      </div>

      <RaidPendingCard available={data.raidHistoryAvailable} />

      <UpgradeTimeline
        history={data.upgradeHistory}
        filter={filter}
        onFilterChange={setFilter}
      />
    </div>
  );
}

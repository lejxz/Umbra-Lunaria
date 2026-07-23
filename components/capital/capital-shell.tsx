"use client";

import { useState } from "react";
import type { CapitalPageData } from "@/lib/view-models/capital";
import { CapitalOverviewCard } from "./capital-overview-card";
import { DistrictList } from "./district-list";
import { UpgradeTimeline } from "./upgrade-timeline";
import { RaidPendingCard } from "./raid-pending-card";

/**
 * Capital page shell — client-side composition root. Holds the district-filter
 * state for the upgrade timeline.
 *
 * Layout (concept/08): overview first, then the district list, then the
 * upgrade timeline, then the raid-weekend pending state. Every section
 * renders its own empty/unavailable/cold-start state.
 */
export function CapitalShell({ data }: { data: CapitalPageData }) {
  const [filter, setFilter] = useState<string>("all");

  return (
    <div className="space-y-5">
      <CapitalOverviewCard overview={data.overview} />

      <DistrictList districts={data.overview.districts} hasDistricts={data.overview.hasDistricts} />

      <UpgradeTimeline
        history={data.upgradeHistory}
        filter={filter}
        onFilterChange={setFilter}
      />

      <RaidPendingCard available={data.raidHistoryAvailable} />
    </div>
  );
}

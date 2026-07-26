"use client";

import { useState } from "react";
import type { CapitalPageData } from "@/lib/view-models/capital";
import { CardMount } from "@/components/ui/card-mount";
import { CapitalOverviewCard } from "./capital-overview-card";
import { RaidPendingCard } from "./raid-pending-card";
import { RaidHistory } from "./raid-history";
import { RaidTimerBanner } from "./raid-timer-banner";
import { UpgradeTimeline } from "./upgrade-timeline";
import { DistrictList } from "./district-list";

/**
 * Capital page shell — client-side composition root. Holds the district-filter
 * state for the upgrade timeline.
 *
 * Layout order:
 *   1. Overview — current Capital facts (Hall, points, league, districts).
 *   2. Raid-weekend timer — a live countdown when a raid is in progress.
 *   3. Raid-weekend history — the full history view when seasons are available,
 *      or a truthful "pending" placeholder until the first completed season.
 *   4. Upgrade timeline — tracked district-level changes over time.
 *   5. District list — the full current-level reference.
 */
export function CapitalShell({
  data,
  serverNow,
}: {
  data: CapitalPageData;
  /** Server's current time in ms — for clock-drift-tolerant raid countdown. */
  serverNow?: number;
}) {
  const [filter, setFilter] = useState<string>("all");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CardMount delay={0.04}>
          <CapitalOverviewCard overview={data.overview} />
        </CardMount>
        <CardMount delay={0.08}>
          <DistrictList districts={data.overview.districts} hasDistricts={data.overview.hasDistricts} />
        </CardMount>
      </div>

      {data.raidTimer && (
        <CardMount delay={0.12}>
          <RaidTimerBanner timer={data.raidTimer} serverNow={serverNow} />
        </CardMount>
      )}

      <CardMount delay={0.16}>
        {data.raidHistoryAvailable && data.raidHistory ? (
          <RaidHistory history={data.raidHistory} />
        ) : (
          <RaidPendingCard available={false} />
        )}
      </CardMount>

      <CardMount delay={0.2}>
        <UpgradeTimeline
          history={data.upgradeHistory}
          filter={filter}
          onFilterChange={setFilter}
        />
      </CardMount>
    </div>
  );
}

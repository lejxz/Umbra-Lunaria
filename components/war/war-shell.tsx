"use client";

import { useState } from "react";
import type { WarCenterData } from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { WarHero } from "./war-hero";
import { WarRosters } from "./war-rosters";
import { WarAttackLog } from "./war-attack-log";
import { WarHistory } from "./war-history";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";

/**
 * War Center shell — the client-side composition root. Holds the shared
 * member-detail-sheet state (selectedTag) so every clickable own-clan member
 * — in the roster, the attack log, or anywhere else — opens the same sheet
 * the Dashboard and Members pages use.
 *
 * Layout (concept/07): hero summary first, then roster + attack log for the
 * current war, then the full history list. Every section renders its own
 * empty/unavailable/private/stale state.
 */
export function WarShell({
  data,
  clanBadgeUrls,
  clanName,
}: {
  data: WarCenterData;
  clanBadgeUrls?: ClanBadgeUrls | null;
  clanName?: string | null;
}) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <WarHero
        currentWar={data.currentWar}
        clanBadgeUrls={clanBadgeUrls}
        clanName={clanName}
        lastResult={data.lastResult}
        refreshTtlSeconds={data.refreshTtlSeconds}
      />

      {data.currentWar && (
        <>
          <WarRosters
            currentWar={data.currentWar}
            onMemberClick={setSelectedTag}
          />
          <WarAttackLog
            attackLog={data.attackLog}
            warState={data.currentWar.state}
            onMemberClick={setSelectedTag}
          />
        </>
      )}

      <WarHistory
        history={data.history}
        warLogPublic={data.warLogPublic}
        trackingStart={data.trackingStart}
      />

      <MemberDetailSheet playerTag={selectedTag} onClose={() => setSelectedTag(null)} />
    </div>
  );
}

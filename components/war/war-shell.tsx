"use client";

import { useState } from "react";
import type { WarCenterData } from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { WarHero } from "./war-hero";
import { WarRosters } from "./war-rosters";
import { WarAttackLog } from "./war-attack-log";
import { WarHistory } from "./war-history";
import { WarDetailSheet } from "./war-detail-sheet";
import { CwlLeagueView } from "./cwl-league-view";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";

/**
 * War Center shell — the client-side composition root. Holds three pieces of
 * shared state:
 *   - selectedTag  → opens the member detail sheet (own-clan roster/attack-log
 *     clicks), reusing the dashboard's MemberDetailSheet for UI consistency.
 *   - detailWarId  → opens the war detail sheet (history "View details"
 *     clicks), which fetches /api/war/[id] and renders the full analysis.
 *
 * Layout (concept/07):
 *   1. CWL league view (if in CWL season — shows standings + day tabs).
 *   2. War hero (current war summary + lead analysis + refresh).
 *   3. Roster + attack log for the current war.
 *   4. Full history list.
 *
 * Every section renders its own empty/unavailable/private/stale state.
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
  const [detailWarId, setDetailWarId] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      {/* CWL league view — shown when the clan is in CWL */}
      {data.cwlSeason && (
        <CwlLeagueView season={data.cwlSeason} onViewDetail={setDetailWarId} />
      )}

      <WarHero
        currentWar={data.currentWar}
        clanBadgeUrls={clanBadgeUrls}
        clanName={clanName}
        lastResult={data.lastResult}
        leadAnalysis={data.leadAnalysis}
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
        onViewDetail={setDetailWarId}
      />

      <MemberDetailSheet playerTag={selectedTag} onClose={() => setSelectedTag(null)} />
      <WarDetailSheet
        warId={detailWarId}
        clanBadgeUrls={clanBadgeUrls}
        clanName={clanName}
        onClose={() => setDetailWarId(null)}
      />
    </div>
  );
}

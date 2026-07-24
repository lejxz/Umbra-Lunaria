"use client";

/**
 * HallOfFameShell — the dedicated /hall-of-fame page composition root.
 *
 * Two sections:
 *   1. All-Time Legends — the 5 cached award leaderboards from
 *      hall_of_fame_records (computed by the daily batch). Each renders the
 *      FULL leaderboard (not just top 5 like the dashboard card).
 *   2. Live Records — record categories computed on-demand from raw tables
 *      (raid gold, raid medals, war attacks, perfect attendance, fastest
 *      3-star, longest tenure).
 *
 * Each ranked row is clickable → opens the shared MemberDetailSheet (lazy
 * fetch by playerTag), mirroring the dashboard + war + members pattern.
 *
 * See concept/05-dashboard.md §"Hall of Fame" + concept/12.
 */

import { useState } from "react";
import { PageScaffold } from "@/components/page-scaffold";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";
import { AwardSection } from "./award-section";
import { LiveRecordSection } from "./live-record-section";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTrophy } from "@/components/ui/icons";
import type { HallOfFamePageData } from "@/lib/view-models/hall-of-fame";

export function HallOfFameShell({ data }: { data: HallOfFamePageData }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { cachedAwards, liveRecords, lastComputedAt } = data;

  const hasCached = cachedAwards.some((a) => a.entries.length > 0);
  const hasLive = liveRecords.length > 0;

  return (
    <PageScaffold
      section="Hall of Fame"
      title="Hall of Fame"
      description="All-time clan records — donations, war heroics, raid-weekend dominance, and tenure. Records are recomputed daily from tracked data."
    >
      {/* ── Last-computed freshness stamp ──────────────────────────────── */}
      {lastComputedAt && (
        <p className="mb-5 font-mono text-xs text-umbra-muted">
          Cached awards last recomputed{" "}
          <span className="text-umbra-lilac">
            {lastComputedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
          . Live records are fresh at page load.
        </p>
      )}

      {/* ── Section 1: All-Time Legends (cached awards) ─────────────────── */}
      {hasCached ? (
        <section className="mb-8">
          <h2 className="mb-4 font-display text-xl text-umbra-lilac">
            All-Time Legends
          </h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {cachedAwards.map((board) => (
              <AwardSection
                key={board.awardKey}
                board={board}
                onMemberClick={setSelectedMember}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="glass mb-8 rounded-2xl p-8">
          <EmptyState
            icon={<IconTrophy className="h-10 w-10 text-umbra-purple/40" />}
            title="No all-time records yet"
            description="The daily batch computes the 5 all-time awards (Philanthropist, Vanguard, Dedicated, Capitalist, Unsleeping). They'll appear here once the batch has run with enough tracked data."
          />
        </section>
      )}

      {/* ── Section 2: Live Records ────────────────────────────────────── */}
      {hasLive ? (
        <section>
          <h2 className="mb-4 font-display text-xl text-umbra-lilac">
            Live Records
          </h2>
          <p className="mb-4 text-sm text-umbra-muted">
            Computed on-demand from raw tracked data — war attacks, raid
            contributions, war participation, and membership history.
          </p>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {liveRecords.map((cat, i) => (
              <LiveRecordSection
                key={cat.key}
                category={cat}
                index={i}
                onMemberClick={setSelectedMember}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="glass rounded-2xl p-8">
          <EmptyState
            icon={<IconTrophy className="h-10 w-10 text-umbra-purple/40" />}
            title="No live records yet"
            description="Live records (raid gold, war attacks, perfect attendance, fastest 3-star, tenure) appear once the tracker has accumulated war + raid + membership data."
          />
        </section>
      )}

      {/* ── Shared member detail sheet (lazy fetch) ──────────────────────── */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </PageScaffold>
  );
}

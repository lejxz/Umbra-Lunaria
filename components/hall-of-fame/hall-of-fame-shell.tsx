"use client";

/**
 * HallOfFameShell — the dedicated /hall-of-fame page composition root.
 *
 * Two sections:
 *   1. All-Time Legends — the 5 cached award leaderboards from
 *      hall_of_fame_records (computed by the daily batch). Each renders the
 *      FULL leaderboard (not just top 5 like the dashboard card).
 *   2. Live Records — record categories computed on-demand from raw tables.
 *
 * Each ranked row is clickable → opens the shared MemberDetailSheet (lazy
 * fetch by playerTag), mirroring the dashboard + war + members pattern.
 *
 * Design: both sections use the same card grid (3-col on xl), consistent
 * header heights, and a shared section-header style for visual rhythm.
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
    <PageScaffold section="Hall of Fame" title="Hall of Fame">
      {/* ── Last-computed freshness stamp ──────────────────────────────── */}
      {lastComputedAt && (
        <p className="mb-6 font-mono text-xs text-umbra-muted">
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
        <section className="mb-10">
          <SectionHeader title="All-Time Legends" />
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
        <section className="glass mb-10 rounded-2xl p-8">
          <EmptyState
            icon={<IconTrophy className="h-10 w-10 text-umbra-purple/40" />}
            title="No all-time records yet"
            description="The daily batch computes the 5 all-time awards. They'll appear here once the batch has run with enough tracked data."
          />
        </section>
      )}

      {/* ── Section 2: Live Records ────────────────────────────────────── */}
      {hasLive ? (
        <section>
          <SectionHeader title="Live Records" />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {liveRecords.map((cat) => (
              <LiveRecordSection
                key={cat.key}
                category={cat}
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
            description="Live records appear once the tracker has accumulated war + raid + membership data."
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

/**
 * Section header — a consistent eyebrow + title used by both sections so the
 * "All-Time Legends" and "Live Records" headers have the same visual weight.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-5 w-1 rounded-full bg-umbra-purple" aria-hidden />
      <h2 className="font-display text-xl text-umbra-lilac">{title}</h2>
    </div>
  );
}

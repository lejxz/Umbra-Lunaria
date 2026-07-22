"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/view-models/dashboard";
import { ClanIdentityCard } from "./clan-identity-card";
import { WarRecordCard } from "./war-record-card";
import { CurrentWarCard } from "./current-war-card";
import { CapitalSummaryCard } from "./capital-summary-card";
import { DonationAnalytics } from "./donation-analytics";
import { ActivityTimelinePanel } from "./activity-timeline";
import { ActivityScoreLeaderboard } from "./activity-score-leaderboard";
import { NeedsAttentionPanel } from "./needs-attention";
import { ClanLogPanel } from "./clan-log";
import { NavSummaries } from "./nav-summaries";
import { MemberDetailSheet } from "./member-detail-sheet";

/**
 * Dashboard shell — the client-side composition root for the dashboard.
 * Manages the member-detail-sheet state and passes data to all panels.
 *
 * The 24h/7d/30d tab state is managed locally within DonationAnalytics and
 * ActivityTimelinePanel (each has its own Tabs). The data for all 3 windows
 * is fetched server-side and passed in, so tab switches are instant with no
 * API calls or page reloads.
 */
export function DashboardShell({ data }: { data: DashboardData }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
      {/* Header */}
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          Command center / overview
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-lilac sm:text-4xl">
          The clan observatory
        </h1>
        <p className="mt-2 text-sm text-umbra-muted">
          Identity first. Donations and member contribution at the center.
        </p>
      </header>

      {/* Row 1: Identity card — full width */}
      <ClanIdentityCard clan={data.clan} />

      {/* Row 2: War record | Current war | Capital overview — 3 even columns */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <WarRecordCard record={data.warRecord} />
        <CurrentWarCard warSummary={data.warSummary} />
        <CapitalSummaryCard capital={data.capital} />
      </div>

      {/* Row 3: Clan donations — full width (primary analytical panel) */}
      <div className="mt-5">
        <DonationAnalytics
          dataByWindow={{
            "24h": {
              totals: data.donations,
              timeline: data.donationTimeline,
              leaderboard: data.donationLeaderboard,
            },
            "7d": {
              totals: data.donations7d,
              timeline: data.donationTimeline7d,
              leaderboard: data.donationLeaderboard7d,
            },
            "30d": {
              totals: data.donations30d,
              timeline: data.donationTimeline30d,
              leaderboard: data.donationLeaderboard30d,
            },
          }}
        />
      </div>

      {/* Row 4: Activity Score Leaderboard | Activity Timeline — 2 cols */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ActivityScoreLeaderboard
          leaderboard={data.activityScore}
          onMemberClick={setSelectedMember}
        />
        <ActivityTimelinePanel
          dataByWindow={{
            "24h": data.activityTimeline,
            "7d": data.activityTimeline7d,
            "30d": data.activityTimeline30d,
          }}
        />
      </div>

      {/* Row 5: Needs Attention | Clan Log — 2 cols */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <NeedsAttentionPanel
          attention={data.needsAttention}
          onMemberClick={setSelectedMember}
        />
        <ClanLogPanel
          log={data.clanLog}
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Row 6: Navigation summary — full width strip */}
      <div className="mt-5">
        <NavSummaries
          warSummary={data.warSummary}
          capitalNav={data.capitalNav}
        />
      </div>

      {/* Compact data freshness footer */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded-lg border border-umbra-line/30 bg-umbra-ink/30 px-4 py-2.5">
        <FreshnessChip label="Last poll" date={data.clan.lastPolledAt} />
        <FreshnessChip label="Daily batch" date={data.clan.lastDailyBatchAt} />
        <FreshnessChip label="Tracking started" date={data.trackingStart} />
        <FreshnessChip label="War synced" date={data.warSummary.lastSyncedAt} />
      </div>

      {/* Footer */}
      <footer className="mt-6 border-t border-umbra-line pt-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
          Umbra Lunaria · Clan Observatory · Single-clan deployment
        </p>
      </footer>

      {/* Member detail sheet — fetches full detail on click */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}

function FreshnessChip({
  label,
  date,
}: {
  label: string;
  date: Date | string | null;
}) {
  const formatted = date
    ? new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      })
    : "—";
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="font-mono text-[10px] text-umbra-lilac">{formatted}</span>
    </div>
  );
}

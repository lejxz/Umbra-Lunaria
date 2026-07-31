"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { DashboardData } from "@/lib/view-models/dashboard";
import { ClanIdentityCard } from "./clan-identity-card";
import { WarRecordCard } from "./war-record-card";
import { Badge } from "@/components/ui/badge";
import { CurrentWarCard } from "./current-war-card";
import { CapitalSummaryCard } from "./capital-summary-card";
import { AttentionPanel } from "./needs-attention";
import { ClanLogPanel } from "./clan-log";
import { NavSummaries } from "./nav-summaries";
import { IconTrophy, IconChevronRight } from "@/components/ui/icons";

// EGRESS + BUNDLE OPTIMIZATION (docs log 114): lazy-load chart components and
// the member-detail sheet so recharts (~400 KB gzipped) is split into a
// separate chunk and only loaded when the charts render or a member is opened,
// not on the initial dashboard JS bundle. The loading fallbacks keep the
// layout stable (no CLS) while the chunk streams in.
const DonationAnalytics = dynamic(() => import("./donation-analytics").then(m => m.DonationAnalytics), {
  loading: () => <ChartSkeleton />,
});
const ActivityAnalytics = dynamic(() => import("./activity-analytics").then(m => m.ActivityAnalytics), {
  loading: () => <ChartSkeleton />,
});
const WarPerformanceChart = dynamic(() => import("./war-performance-chart").then(m => m.WarPerformanceChart), {
  loading: () => <ChartSkeleton />,
});
const WarAttackDistributionChart = dynamic(() => import("./war-attack-distribution").then(m => m.WarAttackDistributionChart), {
  loading: () => <ChartSkeleton />,
});
const RosterSizeChart = dynamic(() => import("./roster-size-chart").then(m => m.RosterSizeChart), {
  loading: () => <ChartSkeleton />,
});
// MemberDetailSheet is only opened on click — lazy-load so its full UI
// (progression cards, achievements, DonationChart) doesn't bloat the initial
// dashboard bundle.
const MemberDetailSheet = dynamic(() => import("./member-detail-sheet").then(m => m.MemberDetailSheet), {
  ssr: false,
});

/** Placeholder that matches the chart card height to prevent layout shift. */
function ChartSkeleton() {
  return (
    <div className="glass flex flex-col rounded-2xl p-5" style={{ minHeight: 200 }}>
      <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white/5" />
      <div className="mt-6 flex flex-1 items-center justify-center">
        <div className="h-3 w-3 animate-pulse rounded-full bg-umbra-purple/30" />
      </div>
    </div>
  );
}

/**
 * Dashboard shell — the client-side composition root for the dashboard.
 * Manages the member-detail-sheet state and passes data to all panels.
 *
 * The 24h/7d/30d tab state is managed locally within DonationAnalytics and
 * ActivityTimelinePanel (each has its own Tabs). The data for all 3 windows
 * is fetched server-side and passed in, so tab switches are instant with no
 * API calls or page reloads.
 */
export function DashboardShell({
  data,
}: {
  data: DashboardData;
}) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
      {/* Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-lilac sm:text-4xl">
            The clan observatory
          </h1>
        </div>
      </header>

      {/* Row 1: Identity card — full width */}
      <ClanIdentityCard clan={data.clan} />

      {/* Row 2: War record | Current war | Capital overview — 3 even columns */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <WarRecordCard record={data.warRecord} />
        <CurrentWarCard warSummary={data.warSummary} clanBadgeUrls={data.clan.badgeUrls} clanName={data.clan.name} />
        <CapitalSummaryCard capital={data.capital} />
      </div>

      {/* Row 2b: War analytics — performance trend (2/3) + attack distribution donut (1/3) */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="glass flex flex-col rounded-2xl p-5 lg:col-span-2" aria-labelledby="war-trend-title">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            War performance · last 20
          </p>
          <h3 id="war-trend-title" className="mt-1 font-display text-lg text-umbra-lilac">
            Stars per war
          </h3>
          <div className="mt-3 h-56">
            <WarPerformanceChart trend={data.warPerformanceTrend} />
          </div>
        </section>
        <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="attack-dist-title">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Attack quality
          </p>
          <h3 id="attack-dist-title" className="mt-1 font-display text-lg text-umbra-lilac">
            Star distribution
          </h3>
          <div className="mt-3 h-48 sm:h-56 lg:h-auto lg:flex-1">
            <WarAttackDistributionChart distribution={data.warAttackDistribution} />
          </div>
        </section>
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
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Row 4: Unified Activity Analytics (Timeline + Score) */}
      <div className="mt-5">
        <ActivityAnalytics
          dataByWindow={{
            "24h": data.activityTimeline,
            "7d": data.activityTimeline7d,
            "30d": data.activityTimeline30d,
          }}
          leaderboardByWindow={{
            "24h": data.activityScore,
            "7d": data.activityScore7d,
            "30d": data.activityScore30d,
          }}
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Row 4b: Roster size trend — full width */}
      <div className="mt-5">
        <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="roster-trend-title">
          <div className="flex items-center justify-between">
            <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
              Roster size · 30 days
            </p>
            <Badge tone="brand">
              {data.rosterSizeTrend.points.length > 0
                ? `${data.rosterSizeTrend.points[data.rosterSizeTrend.points.length - 1]?.count ?? 0} current`
                : "—"}
            </Badge>
          </div>
          <h3 id="roster-trend-title" className="mt-1 font-display text-lg text-umbra-lilac">
            Roster growth
          </h3>
          <div className="mt-3 h-40">
            <RosterSizeChart trend={data.rosterSizeTrend} />
          </div>
        </section>
      </div>

      {/* Row 5: Needs Attention | Clan Log — 3 cols */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <AttentionPanel
          title="Attention Queue"
          subtitle="Inactive & No-shows"
          groups={[
            {
              label: "No attacks in current war",
              tone: "warning",
              icon: "swords",
              members: data.needsAttention.attacksRemaining,
            },
            {
              label: `Inactive (${data.needsAttention.inactivityThresholdDays}d+)`,
              tone: "danger",
              icon: "clock",
              members: data.needsAttention.inactive,
            },
            {
              label: "Rushed (>60%)",
              tone: "danger",
              icon: "shield",
              members: data.needsAttention.rushed,
            },
          ]}
          onMemberClick={setSelectedMember}
        />
        <AttentionPanel
          title="Opted Out"
          subtitle="War Preference"
          groups={[
            {
              label: "Opted out of wars",
              tone: "muted",
              icon: "shield",
              members: data.needsAttention.warPreferenceOut,
            }
          ]}
          onMemberClick={setSelectedMember}
        />
        <ClanLogPanel
          log={data.clanLog}
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Row 6: Hall of Fame — link to the dedicated page */}
      <div className="mt-5">
        <HallOfFameLink />
      </div>

      {/* Row 7: Navigation summary — full width strip */}
      <div className="mt-5">
        <NavSummaries
          warSummary={data.warSummary}
          capitalNav={data.capitalNav}
        />
      </div>

      {/* Member detail sheet — fetches full detail on click */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}

/**
 * Compact Hall of Fame link banner — replaces the full HoF card that used to
 * live on the dashboard. The full leaderboards now live at /hall-of-fame.
 */
function HallOfFameLink() {
  return (
    <Link
      href="/hall-of-fame"
      className="glass focus-ring flex items-center justify-between gap-4 rounded-2xl p-5 transition hover:border-umbra-purple/40"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-umbra-purple/15 text-umbra-purple">
          <IconTrophy className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            All-time clan records
          </p>
          <h3 className="font-display text-lg text-umbra-lilac">Hall of Fame</h3>
        </div>
      </div>
      <span className="flex items-center gap-1.5 font-mono text-label uppercase tracking-wider text-umbra-muted">
        View all
        <IconChevronRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  );
}

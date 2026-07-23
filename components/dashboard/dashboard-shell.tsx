"use client";

import { useState, useEffect } from "react";
import type { DashboardData } from "@/lib/view-models/dashboard";
import { ClanIdentityCard } from "./clan-identity-card";
import { WarRecordCard } from "./war-record-card";
import { CurrentWarCard } from "./current-war-card";
import { CapitalSummaryCard } from "./capital-summary-card";
import { DonationAnalytics } from "./donation-analytics";
import { ActivityAnalytics } from "./activity-analytics";
import { AttentionPanel } from "./needs-attention";
import { ClanLogPanel } from "./clan-log";
import { NavSummaries } from "./nav-summaries";
import { MemberDetailSheet } from "./member-detail-sheet";
import { HallOfFameCard } from "./hall-of-fame-card";
import { WarPerformanceChart } from "./war-performance-chart";
import { WarAttackDistributionChart } from "./war-attack-distribution";
import { RosterSizeChart } from "./roster-size-chart";

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
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
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
          <div className="mt-3 h-64 flex-1">
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
          <div className="mt-3 flex-1">
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
            <span className="text-2xs text-umbra-muted">
              {data.rosterSizeTrend.points.length > 0
                ? `${data.rosterSizeTrend.points[data.rosterSizeTrend.points.length - 1]?.count ?? 0} current`
                : "—"}
            </span>
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
          subtitle="Inactive & Issues"
          groups={[
            {
              label: "Attacks remaining",
              tone: "warning",
              icon: "swords",
              members: data.needsAttention.attacksRemaining,
            },
            {
              label: `Inactive (${data.needsAttention.inactivityThresholdDays}d+)`,
              tone: "danger",
              icon: "clock",
              members: data.needsAttention.inactive,
            }
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

      {/* Row 6: Hall of Fame — full width */}
      <div className="mt-5">
        <HallOfFameCard data={data.hallOfFame} onMemberClick={setSelectedMember} />
      </div>

      {/* Row 7: Navigation summary — full width strip */}
      <div className="mt-5">
        <NavSummaries
          warSummary={data.warSummary}
          capitalNav={data.capitalNav}
        />
      </div>

      {/* Compact data freshness footer with next-poll countdown */}
      <FreshnessFooter
        lastPoll={data.clan.lastPolledAt}
        lastBatch={data.clan.lastDailyBatchAt}
        trackingStart={data.trackingStart}
        warSynced={data.warSummary.lastSyncedAt}
      />

      {/* Footer */}
      <footer className="mt-6 border-t border-umbra-line pt-4 text-center">
        <p className="font-mono text-label uppercase tracking-wider text-umbra-muted">
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

/**
 * Freshness footer with live countdown to the next expected poll.
 * The poll interval is 15 minutes (third-party cron-job service, every-15-min
 * schedule — see concept/04). The countdown shows how long until the next
 * poll should fire.
 */
function FreshnessFooter({
  lastPoll,
  lastBatch,
  trackingStart,
  warSynced,
}: {
  lastPoll: Date | string | null;
  lastBatch: Date | string | null;
  trackingStart: Date | string | null;
  warSynced: Date | string | null;
}) {
  const POLL_INTERVAL_MINUTES = 15;
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  // Update every second for the countdown
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate next poll time: last poll + 15 min
  const lastPollDate = lastPoll ? new Date(lastPoll) : null;
  const nextPollDate = lastPollDate
    ? new Date(lastPollDate.getTime() + POLL_INTERVAL_MINUTES * 60 * 1000)
    : null;
  const msUntilNext = nextPollDate ? nextPollDate.getTime() - now : null;
  const isOverdue = msUntilNext !== null && msUntilNext < 0;

  // Format countdown
  const countdownText = (() => {
    if (msUntilNext === null) return "—";
    if (isOverdue) return "overdue";
    const totalSeconds = Math.floor(msUntilNext / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  })();

  const fmt = (d: Date | string | null) =>
    d && mounted
      ? new Date(d).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        })
      : "—";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-lg border border-umbra-line/30 bg-umbra-ink/30 px-4 py-3">
      <Chip label="Last update" value={fmt(lastPoll)} />
      <Chip label="Daily batch" value={fmt(lastBatch)} />
      <Chip label="Tracking" value={fmt(trackingStart)} />
      <Chip label="War synced" value={fmt(warSynced)} />
      {/* Next poll countdown */}
      <div className="flex items-center gap-1.5 border-l border-umbra-line/30 pl-5">
        <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
          Next update
        </span>
        <span
          className={`font-mono text-label font-bold ${
            isOverdue
              ? "text-amber-400"
              : msUntilNext !== null && msUntilNext < 60000
                ? "text-amber-400"
                : "text-emerald-400"
          }`}
          suppressHydrationWarning
        >
          {mounted ? countdownText : "—"}
        </span>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="font-mono text-label text-umbra-lilac" suppressHydrationWarning>
        {value}
      </span>
    </div>
  );
}

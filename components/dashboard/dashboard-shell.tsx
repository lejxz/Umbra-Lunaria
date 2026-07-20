"use client";

import { useState, useMemo } from "react";
import type { DashboardData } from "@/lib/view-models/dashboard";
import { ClanIdentityCard } from "./clan-identity-card";
import { WarRecordCard } from "./war-record-card";
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

  // Build a member lookup map for the MemberDetailSheet. We only have
  // activity-score data (which includes all retained members), so we use
  // that as the source. Members not in the leaderboard won't have detail
  // data here — the full member detail comes in Phase 1.3.
  const memberMap = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        role: string;
        townHallLevel: number | null;
        league?: { name: string; iconUrls?: { small?: string; tiny?: string } } | null;
        leagueTier?: { name: string; iconUrls?: { small?: string } } | null;
        warPreference?: string | null;
        score?: number;
        scoreComponents?: Array<{ name: string; available: boolean; points: number }>;
      }
    >();

    for (const entry of data.activityScore.entries) {
      map.set(entry.playerTag, {
        name: entry.name,
        role: entry.role,
        townHallLevel: entry.townHallLevel,
        league: entry.league,
        leagueTier: entry.leagueTier,
        score: entry.totalScore,
        scoreComponents: entry.components.map((c) => ({
          name: c.name,
          available: c.available,
          points: c.points,
        })),
      });
    }

    // Also add members from needs-attention and clan log that might not be
    // in the leaderboard (e.g. departed/purged members in the log).
    for (const m of data.needsAttention.inactive) {
      if (!map.has(m.playerTag)) {
        map.set(m.playerTag, {
          name: m.name,
          role: m.role,
          townHallLevel: m.townHallLevel,
        });
      }
    }
    for (const m of data.needsAttention.attacksRemaining) {
      if (!map.has(m.playerTag)) {
        map.set(m.playerTag, {
          name: m.name,
          role: m.role,
          townHallLevel: m.townHallLevel,
        });
      }
    }
    for (const m of data.needsAttention.warPreferenceOut) {
      if (!map.has(m.playerTag)) {
        map.set(m.playerTag, {
          name: m.name,
          role: m.role,
          townHallLevel: m.townHallLevel,
        });
      }
    }

    return map;
  }, [data]);

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

      {/* Identity card — full width */}
      <ClanIdentityCard clan={data.clan} />

      {/* Stats row — war record + capital summary */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <WarRecordCard record={data.warRecord} />
        </div>
        <div className="lg:col-span-2">
          <CapitalSummaryCard capital={data.capital} />
        </div>
      </div>

      {/* Primary grid — donation analytics (large) + activity score leaderboard */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(285px,0.9fr)]">
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
        <ActivityScoreLeaderboard
          leaderboard={data.activityScore}
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Secondary grid — activity timeline + needs attention */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(285px,0.9fr)]">
        <ActivityTimelinePanel
          dataByWindow={{
            "24h": data.activityTimeline,
            "7d": data.activityTimeline7d,
            "30d": data.activityTimeline30d,
          }}
        />
        <NeedsAttentionPanel
          attention={data.needsAttention}
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Secondary grid — capital overview already above, clan log */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(285px,0.9fr)]">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Tracking status
          </p>
          <h3 className="mt-1 font-display text-lg text-umbra-lilac">
            Data freshness
          </h3>
          <div className="mt-4 space-y-3">
            <FreshnessRow
              label="Last poll"
              date={data.clan.lastPolledAt}
            />
            <FreshnessRow
              label="Last daily batch"
              date={data.clan.lastDailyBatchAt}
            />
            <FreshnessRow
              label="Tracking started"
              date={data.trackingStart}
            />
            <FreshnessRow
              label="War last synced"
              date={data.warSummary.lastSyncedAt}
            />
          </div>
        </div>
        <ClanLogPanel
          log={data.clanLog}
          onMemberClick={setSelectedMember}
        />
      </div>

      {/* Navigation summaries */}
      <div className="mt-5">
        <NavSummaries
          warSummary={data.warSummary}
          capitalNav={data.capitalNav}
        />
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-umbra-line pt-5 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
          Umbra Lunaria · Clan Observatory · Single-clan deployment
        </p>
      </footer>

      {/* Member detail sheet */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
        members={memberMap}
      />
    </div>
  );
}

function FreshnessRow({
  label,
  date,
}: {
  label: string;
  date: Date | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-2">
      <span className="text-xs text-umbra-muted">{label}</span>
      <span className="font-mono text-xs text-umbra-lilac">
        {date
          ? new Date(date).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Manila",
            })
          : "—"}
      </span>
    </div>
  );
}

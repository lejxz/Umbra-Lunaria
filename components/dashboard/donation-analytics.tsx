"use client";

import { useState } from "react";
import type {
  DonationTotals,
  DonationTimeline,
  DonationLeaderboard,
  DonationWindow,
} from "@/lib/view-models/dashboard";
import { Tabs, UnavailableValue, EmptyState } from "@/components/ui";
import { DonationChart } from "./donation-chart";

/**
 * Donation analytics — the largest primary panel on the dashboard.
 * Layout: compact totals row at top, then a 2-column grid with the chart
 * on the left (fills remaining height) and top donors on the right.
 * See concept/05-dashboard.md §4.
 */
export function DonationAnalytics({
  dataByWindow,
}: {
  dataByWindow: Record<
    DonationWindow,
    {
      totals: DonationTotals;
      timeline: DonationTimeline;
      leaderboard: DonationLeaderboard;
    }
  >;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const current = dataByWindow[window];

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5 sm:p-6"
      aria-labelledby="donation-title"
      style={{ minHeight: "380px" }}
    >
      {/* Header + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Contribution pulse
          </p>
          <h3
            id="donation-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Clan donations
          </h3>
        </div>
        <Tabs
          items={["24h", "7d", "30d"]}
          active={window}
          onChange={(v) => setWindow(v as DonationWindow)}
          label="Donation window"
        />
      </div>

      {/* Compact totals — inline, not big cards */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <TotalChip
          label="Given"
          value={current.totals.given}
        />
        <TotalChip
          label="Received"
          value={current.totals.received}
        />
        <TotalChip
          label="Ratio"
          value={
            current.totals.ratio !== null
              ? current.totals.ratio.toFixed(2)
              : null
          }
        />
        {current.totals.hasPartialData && (
          <span className="text-[11px] text-amber-400">
            ⚠ Partial data
          </span>
        )}
      </div>

      {/* Chart + Top donors — chart fills remaining height */}
      <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1fr_220px]">
        {/* Chart — fills remaining height of the card */}
        <div className="min-h-[180px]">
          {current.timeline.buckets.length > 0 ? (
            <DonationChart buckets={current.timeline.buckets} />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center">
              <EmptyState
                title="No donation activity yet"
                description="Donations will appear once members start donating between polls."
              />
            </div>
          )}
        </div>

        {/* Top donors — right side */}
        <div className="lg:border-l lg:border-umbra-line lg:pl-4">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            Top donors · {window}
          </p>
          {current.leaderboard.topDonors.length > 0 ? (
            <div className="space-y-1">
              {current.leaderboard.topDonors.slice(0, 8).map((donor) => (
                <div
                  key={donor.playerTag}
                  className="flex items-center justify-between rounded-md bg-white/[.035] px-2.5 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-umbra-purple">
                      #{donor.rank}
                    </span>
                    <span className="truncate text-xs text-umbra-lilac">
                      {donor.name}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-emerald-400">
                    {donor.total}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-umbra-muted">No donations tracked yet</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Compact inline total — label + value on one line, small */
function TotalChip({
  label,
  value,
}: {
  label: string;
  value: number | string | null;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="font-display text-lg font-bold text-white">
        {value ?? <UnavailableValue />}
      </span>
    </div>
  );
}

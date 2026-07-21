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
      {/* Header + Stats + Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Compact totals card */}
          <div className="hidden md:flex items-center gap-4 rounded-lg bg-white/[.03] border border-white/5 px-4 py-1.5 backdrop-blur-sm">
            <TotalChip label="Given" value={current.totals.given} />
            <div className="h-4 w-px bg-white/10" />
            <TotalChip label="Received" value={current.totals.received} />
            <div className="h-4 w-px bg-white/10" />
            <TotalChip
              label="Ratio"
              value={
                current.totals.ratio !== null
                  ? current.totals.ratio.toFixed(2)
                  : null
              }
            />
            {current.totals.hasPartialData && (
              <span className="ml-2 text-[10px] text-amber-400">⚠ Partial</span>
            )}
          </div>
          
          <Tabs
            items={["24h", "7d", "30d"]}
            active={window}
            onChange={(v) => setWindow(v as DonationWindow)}
            label="Donation window"
          />
        </div>
      </div>

      {/* Chart + Top donors — chart fills remaining height */}
      <div className="mt-4 grid flex-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chart — fills remaining height of the card */}
        <div className="min-h-[180px]">
          {current.timeline.buckets.length > 0 ? (
            <DonationChart buckets={current.timeline.buckets} />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center">
              <EmptyState
                icon={<DonationEmptyIcon />}
                title="No donation activity yet"
                description="Donations will appear once members start donating between polls."
              />
            </div>
          )}
        </div>

        {/* Top donors — right side */}
        <div className="flex flex-col lg:border-l lg:border-white/5 lg:pl-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
            Top 5 Donors · {window}
          </p>
          {current.leaderboard.topDonors.length > 0 ? (
            <div className="flex flex-col gap-2">
              {current.leaderboard.topDonors.slice(0, 5).map((donor) => {
                // Determine rank styling
                let rankColor = "text-umbra-purple";
                let badgeStyle = "bg-white/[.02] border border-white/5";
                
                if (donor.rank === 1) {
                  rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
                  badgeStyle = "bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20";
                } else if (donor.rank === 2) {
                  rankColor = "text-slate-300";
                  badgeStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border border-slate-400/20";
                } else if (donor.rank === 3) {
                  rankColor = "text-orange-400";
                  badgeStyle = "bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20";
                }

                return (
                  <div
                    key={donor.playerTag}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.07] ${badgeStyle}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`font-mono text-[13px] font-bold ${rankColor}`}>
                        #{donor.rank}
                      </span>
                      <span className="truncate text-[13px] font-medium text-umbra-lilac">
                        {donor.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[13px] font-semibold text-emerald-400">
                      {donor.total}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-umbra-muted">No donations tracked yet</p>
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

function DonationEmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 10V20M24 20L18 14M24 20L30 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 24H38M14 24L18 36H30L34 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 4"
      />
    </svg>
  );
}

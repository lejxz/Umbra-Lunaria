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
 * Shows 24h/7d/30d tabs with totals, ratio, a chart, and a mini leaderboard.
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
    <section className="glass rounded-2xl p-5 sm:p-6" aria-labelledby="donation-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Contribution pulse
          </p>
          <h3 id="donation-title" className="mt-1 font-display text-lg text-umbra-lilac">
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

      {/* Totals */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DonationNumber
          label="Given"
          value={current.totals.given}
          note="tracked total"
        />
        <DonationNumber
          label="Received"
          value={current.totals.received}
          note="tracked total"
        />
        <DonationNumber
          label="Ratio"
          value={
            current.totals.ratio !== null
              ? current.totals.ratio.toFixed(2)
              : null
          }
          note="given / received"
        />
      </div>

      {/* Partial data warning */}
      {current.totals.hasPartialData && (
        <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-400">
          ⚠ Partial data — tracking started partway through this window.
        </p>
      )}

      {/* Chart */}
      <div className="mt-5">
        {current.timeline.buckets.length > 0 ? (
          <DonationChart
            buckets={current.timeline.buckets}
            window={window}
          />
        ) : (
          <div className="flex h-[124px] items-center justify-center">
            <EmptyState
              title="No donation activity yet"
              description="Donations will appear here once members start donating between polls."
            />
          </div>
        )}
      </div>

      {/* Mini leaderboard */}
      {current.leaderboard.topDonors.length > 0 && (
        <div className="mt-5 border-t border-umbra-line pt-4">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            Top donors · {window}
          </p>
          <div className="space-y-1.5">
            {current.leaderboard.topDonors.slice(0, 3).map((donor) => (
              <div
                key={donor.playerTag}
                className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-umbra-purple">
                    #{donor.rank}
                  </span>
                  <span className="truncate text-sm text-umbra-lilac">
                    {donor.name}
                  </span>
                </div>
                <span className="font-mono text-sm text-emerald-400">
                  {donor.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DonationNumber({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string | null;
  note: string;
}) {
  return (
    <div className="rounded-xl bg-white/[.035] p-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-white">
        {value ?? <UnavailableValue />}
      </p>
      <p className="mt-0.5 text-xs text-emerald-400">{note}</p>
    </div>
  );
}

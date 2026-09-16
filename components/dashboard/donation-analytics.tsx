"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import type {
  DonationTotals,
  DonationTimeline,
  DonationLeaderboard,
  DonationWindow,
  CustomAnalyticsView,
} from "@/lib/view-models/dashboard";
import {
  WindowPicker,
  formatRange,
  UnavailableValue,
  EmptyState,
} from "@/components/ui";
import { IconDonationEmpty } from "@/components/ui/icons";
import { DonationChart } from "./donation-chart";

/**
 * Donation analytics — the largest primary panel on the dashboard.
 * Layout: compact totals row at top, then a 2-column grid with the chart
 * on the left (fills remaining height) and top donors on the right.
 * See docs/concept/05-dashboard.md §4.
 *
 * Phase 3.2 (F11): a custom date range fetches GET /api/analytics?from=&to=
 * and renders the panel over that window instead of a preset. The dashboard
 * page itself stays static (ISR) — the range query is client-side, exactly
 * like the member detail sheet's /api/members/[tag] fetch. Since this pass
 * the preset tabs and the custom-range trigger are one WindowPicker in the
 * card header — no separate filter row.
 */

type CustomState =
  | { status: "idle" }
  | { status: "loading"; from: string; to: string }
  | { status: "ready"; data: CustomAnalyticsView }
  | { status: "error"; message: string };

export function DonationAnalytics({
  dataByWindow,
  onMemberClick,
}: {
  dataByWindow: Record<
    DonationWindow,
    {
      totals: DonationTotals;
      timeline: DonationTimeline;
      leaderboard: DonationLeaderboard;
    }
  >;
  onMemberClick?: (playerTag: string) => void;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const [custom, setCustom] = useState<CustomState>({ status: "idle" });

  const preset = dataByWindow[window];

  const applyRange = useCallback(
    async (from: string, to: string) => {
      if (!from || !to) return;
      setCustom({ status: "loading", from, to });
      try {
        const res = await fetch(
          `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );
        const body = (await res.json()) as CustomAnalyticsView | { error: string };
        if (!res.ok || "error" in body) {
          setCustom({
            status: "error",
            message: "error" in body ? body.error : `Request failed (${res.status})`,
          });
          return;
        }
        setCustom({ status: "ready", data: body });
      } catch {
        setCustom({ status: "error", message: "Network error — try again." });
      }
    },
    [],
  );

  const clearCustom = useCallback(() => {
    setCustom({ status: "idle" });
  }, []);

  const isCustomActive =
    custom.status === "ready" || custom.status === "loading";

  // The panel renders either the custom range (when ready) or a preset — an
  // in-flight or failed range leaves the previous/preset data on screen
  // (the error message renders inside the picker's popover).
  const totals = custom.status === "ready" ? custom.data.totals : preset.totals;
  const timeline =
    custom.status === "ready" ? custom.data.timeline : preset.timeline;
  const leaderboard =
    custom.status === "ready" ? custom.data.leaderboard : preset.leaderboard;
  const windowLabel =
    custom.status === "ready"
      ? formatRange(custom.data.from, custom.data.to)
      : window;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="donation-title"
      style={{ minHeight: "380px" }}
    >
      {/* Header + Stats + Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
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
          <div className="hidden md:flex items-center rounded-lg bg-white/5 p-1">
            <TotalChip label="Given" value={totals.given} />
            <div className="h-4 w-px bg-white/10 mx-1" />
            <TotalChip label="Received" value={totals.received} />
            <div className="h-4 w-px bg-white/10 mx-1" />
            <TotalChip
              label="Ratio"
              value={totals.ratio !== null ? totals.ratio.toFixed(2) : null}
            />
            {totals.hasPartialData && (
              <span className="ml-2 pr-3 text-label text-amber-400">⚠ Partial</span>
            )}
          </div>

          <WindowPicker
            presets={[
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
            ]}
            activePreset={isCustomActive ? null : window}
            onPresetChange={(v) => {
              setWindow(v as DonationWindow);
              clearCustom();
            }}
            custom={{
              status: custom.status,
              from:
                custom.status === "ready"
                  ? custom.data.from
                  : custom.status === "loading"
                    ? custom.from
                    : undefined,
              to:
                custom.status === "ready"
                  ? custom.data.to
                  : custom.status === "loading"
                    ? custom.to
                    : undefined,
              error: custom.status === "error" ? custom.message : null,
            }}
            onApplyCustom={applyRange}
            onClearCustom={clearCustom}
            label="Donation window"
          />
        </div>
      </div>

      {/* Chart + Top donors — chart fills remaining height */}
      <div className="mt-4 grid flex-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chart — fills remaining height of the card */}
        <div className="min-h-[180px]">
          {timeline.buckets.length > 0 ? (
            <DonationChart buckets={timeline.buckets} />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center">
              <EmptyState
                icon={<IconDonationEmpty />}
                title="No donation activity yet"
              />
            </div>
          )}
        </div>

        {/* Top donors — right side */}
        <div className="flex flex-col lg:border-l lg:border-white/5 lg:pl-6">
          <p className="mb-3 font-mono text-label uppercase tracking-wider text-umbra-muted">
            Top 5 Donors · {windowLabel}
          </p>
          {leaderboard.topDonors.length > 0 ? (
            <div className="flex flex-col gap-2">
              {leaderboard.topDonors.slice(0, 5).map((donor) => {
                // Determine rank styling
                let rankColor = "text-umbra-purple";
                let badgeStyle = "bg-white/[.03] border border-white/5";

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
                  <button
                    key={donor.playerTag}
                    onClick={() => onMemberClick?.(donor.playerTag)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.04] focus-ring ${badgeStyle}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`font-mono text-xs font-bold ${rankColor}`}>
                        #{donor.rank}
                      </span>
                      {donor.leagueTier?.iconUrls?.small && (
                        <Image
                          src={donor.leagueTier.iconUrls.small}
                          alt=""
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] shrink-0"
                        />
                      )}
                      <span className="truncate text-xs font-medium text-umbra-lilac">
                        {donor.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-emerald-400">
                      {donor.total}
                    </span>
                  </button>
                );
              })}
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
    <div className="flex items-center gap-1.5 px-3 py-2">
      <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="font-display text-xs font-bold text-white">
        {value ?? <UnavailableValue />}
      </span>
    </div>
  );
}

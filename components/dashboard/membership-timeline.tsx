"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type {
  MembershipWindow,
  MembershipTimeline,
  MembershipTimelinePoint,
  CustomAnalyticsView,
} from "@/lib/view-models/dashboard";
import { Tabs, Badge, EmptyState } from "@/components/ui";
import { CHART_COLORS, axisTickStyle, tooltipProps } from "@/lib/chart-theme";
import { RangeControl, dayKeyInTz } from "./range-control";

/**
 * Clan history timeline (Phase 4 — F10, docs/2026-09-11-implementation-plan.md
 * §"Phase 4 — Clan history timeline").
 *
 * A stacked bar per clan-TZ calendar day (join / rejoin / leave / TH upgrade /
 * rename, straight from the immutable membership_events log) with the clan's
 * capital-contribution density overlaid — distinct contributors per day, the
 * daily batch's capitalContribution delta events. Sits under the clan log
 * so the feed answers "what happened" and this answers "how often, over
 * time".
 *
 * Windows: 30d / 90d / all precomputed server-side (tab switches cost zero
 * fetches) plus a custom day range via GET /api/analytics — the same shared
 * RangeControl and endpoint the donation panel uses (Phase 3.2 machinery).
 */

type CustomState =
  | { status: "idle" }
  | { status: "loading"; from: string; to: string }
  | { status: "ready"; data: CustomAnalyticsView }
  | { status: "error"; message: string };

/** Stacked bar series — one per membership event type. Colors mirror the
 *  clan-log row icons (emerald join, amber rejoin, red leave) + chart theme
 *  (purple TH, muted rename) so both surfaces read the same way. */
const BAR_SERIES = [
  { key: "join", label: "Joined", color: "#34d399" }, // emerald-400
  { key: "rejoin", label: "Rejoined", color: "#fbbf24" }, // amber-400
  { key: "leave", label: "Left", color: "#f87171" }, // red-400
  { key: "thUpgrade", label: "TH up", color: CHART_COLORS.purple },
  { key: "rename", label: "Renamed", color: CHART_COLORS.muted },
] as const;

/** Area overlay — distinct capital contributors per day. */
const CAPITAL = {
  key: "capitalContributors",
  label: "Capital contributors",
  color: "#38bdf8", // sky-400
} as const;

export function MembershipTimelinePanel({
  dataByWindow,
}: {
  dataByWindow: Record<MembershipWindow, MembershipTimeline>;
}) {
  const [window, setWindow] = useState<MembershipWindow>("30d");
  const [custom, setCustom] = useState<CustomState>({ status: "idle" });
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const todayKey = useMemo(() => dayKeyInTz(new Date()), []);
  const preset = dataByWindow[window];
  const isCustomActive =
    custom.status === "ready" || custom.status === "loading";

  // Same pattern as the donation panel: a custom range swaps the dataset; an
  // in-flight or failed range leaves the previous/preset chart on screen.
  const timeline =
    custom.status === "ready" ? custom.data.membershipTimeline : preset;

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
    setFromInput("");
    setToInput("");
  }, []);

  const { totals } = timeline;
  const hasAnyEvents =
    totals.join + totals.rejoin + totals.leave + totals.thUpgrade +
      totals.rename >
    0;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="membership-timeline-title"
    >
      {/* Header + window tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Clan history
          </p>
          <h3
            id="membership-timeline-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Membership timeline
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Headline net change over the active window */}
          <Badge tone={totals.netRosterChange >= 0 ? "success" : "danger"}>
            {totals.netRosterChange >= 0 ? "+" : ""}
            {totals.netRosterChange} net · {totals.join + totals.rejoin} in ·{" "}
            {totals.leave} out
          </Badge>

          <Tabs
            items={["30d", "90d", "all"]}
            active={isCustomActive ? null : window}
            onChange={(v) => {
              setWindow(v as MembershipWindow);
              clearCustom();
            }}
            label="Membership timeline window"
          />
        </div>
      </div>

      {/* ── Custom date-range control (shared with the donation panel) ── */}
      <RangeControl
        fromInput={fromInput}
        toInput={toInput}
        todayKey={todayKey}
        onFromChange={setFromInput}
        onToChange={setToInput}
        onApply={(from, to) => applyRange(from ?? fromInput, to ?? toInput)}
        onClear={clearCustom}
        status={custom.status}
        applied={
          custom.status === "ready"
            ? {
                from: custom.data.from,
                to: custom.data.to,
                dayCount: custom.data.dayCount,
              }
            : null
        }
        error={custom.status === "error" ? custom.message : null}
      />

      {/* Chart */}
      <div className="mt-4 h-64">
        {timeline.points.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="No membership events yet"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timeline.points}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="capitalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CAPITAL.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CAPITAL.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(190,151,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={axisTickStyle}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={30}
                angle={-35}
                textAnchor="end"
                height={36}
              />
              {/* One shared count axis: every series is "members that day",
                  so a secondary axis would imply a unit that doesn't exist. */}
              <YAxis
                tick={axisTickStyle}
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip {...tooltipProps} content={<TimelineTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", fontFamily: "JetBrains Mono" }}
                iconSize={9}
              />
              {/* Density overlay first so the bars render above it. */}
              <Area
                type="monotone"
                dataKey={CAPITAL.key}
                name={CAPITAL.label}
                stroke={CAPITAL.color}
                strokeWidth={1.5}
                fill="url(#capitalGrad)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              {BAR_SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stackId="membership"
                  fill={series.color}
                  fillOpacity={0.85}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={14}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footnote — what feeds this chart */}
      <p className="mt-3 text-2xs text-umbra-muted">
        {hasAnyEvents
          ? "Stacked: membership events per clan day. Overlay: members whose capital contributions rose that day."
          : "No membership events in this window — bars appear when someone joins, leaves, rejoin, upgrades their TH, or is renamed."}
        {timeline.points.length > 0 && (
          <>
            {" "}
            Range: {timeline.points[0]!.day} →{" "}
            {timeline.points[timeline.points.length - 1]!.day}.
          </>
        )}
      </p>
    </section>
  );
}

/** Custom tooltip: counts + (for capital days) the summed contribution. */
function TimelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: MembershipTimelinePoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]!.payload;
  const capitalAmount =
    point.capitalAmount > 0
      ? ` · ${point.capitalAmount.toLocaleString("en-US")} gold`
      : "";
  return (
    <div className="rounded-lg border border-umbra-line bg-umbra-surface px-3 py-2 text-[11px] text-umbra-lilac shadow-lg">
      <p className="font-mono text-umbra-muted">{label ?? point.day}</p>
      {BAR_SERIES.map((series) => {
        const value = point[series.key];
        if (!value) return null;
        return (
          <p key={series.key} className="mt-0.5 flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: series.color }}
            />
            {series.label}: {value}
          </p>
        );
      })}
      {point.capitalContributors > 0 && (
        <p className="mt-0.5 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: CAPITAL.color }}
          />
          Capital contributors: {point.capitalContributors}
          {capitalAmount}
        </p>
      )}
    </div>
  );
}

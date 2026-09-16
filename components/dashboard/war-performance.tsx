"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type {
  WarPerformancePoint,
  CustomAnalyticsView,
} from "@/lib/view-models/dashboard";
import { WindowPicker, Badge, EmptyState } from "@/components/ui";
import { IconWarEmpty } from "@/components/ui/icons";
import { CHART_COLORS, axisTickStyle, tooltipContentStyle } from "@/lib/chart-theme";
import {
  starEfficiency,
  maxStars,
  rollingAverage,
  summarizeWarPerformance,
} from "@/lib/war/star-efficiency";

/**
 * War performance panel — own vs opponent STAR EFFICIENCY (share of the
 * war's maximum stars) per war, oldest left → newest right.
 *
 * Why efficiency, not raw stars: the clan's wars mix 5v5–40v40 lineups, and
 * raw stars are incomparable across sizes — a perfect 5v5 (15★) sat at the
 * bottom of the axis while a mediocre 40v40 (84★) towered at the top, so
 * the old chart tracked lineup size, not performance. Efficiency puts every
 * war on the same 0–100 scale.
 *
 * Win/loss/tie is encoded on the Us line's dots (emerald/red/muted — the
 * same palette as the war record card and attack donut), with a 3-war
 * rolling average for the "are we getting better?" read.
 *
 * Windows: last 10 / 20 / all sliced client-side from the precomputed trend
 * (tab switches cost zero fetches), plus a custom date range via GET
 * /api/analytics — the same shared WindowPicker and endpoint the donation
 * and membership panels use.
 */

type WarWindow = "10" | "20" | "all";

type CustomState =
  | { status: "idle" }
  | { status: "loading"; from: string; to: string }
  | { status: "ready"; data: CustomAnalyticsView }
  | { status: "error"; message: string };

/** Result palette — matches WarRecordCard stats + attack-distribution donut. */
const RESULT_COLORS = {
  win: "#34d399", // emerald-400
  loss: "#f87171", // red-400
  tie: "#B0A4CC", // chart muted
} as const;

function resultColor(result: "win" | "loss" | "tie" | null): string {
  return result ? RESULT_COLORS[result] : CHART_COLORS.purple;
}

interface ChartDatum {
  label: string;
  opponent: string;
  warType: string;
  teamSize: number | null;
  /** Own star efficiency, 0–100 — null when teamSize is unknown. */
  own: number | null;
  /** Opponent star efficiency, 0–100. */
  opp: number | null;
  /** 3-war rolling average of own efficiency. */
  avg3: number | null;
  ownStars: number;
  opponentStars: number;
  ownDestruction: number;
  opponentDestruction: number;
  result: "win" | "loss" | "tie" | null;
  max: number | null;
}

export function WarPerformancePanel({ points }: { points: WarPerformancePoint[] }) {
  const [window, setWindow] = useState<WarWindow>("20");
  const [custom, setCustom] = useState<CustomState>({ status: "idle" });

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

  // Preset slice — points arrive oldest-first, so the last N are the most
  // recent N. Custom range swaps the dataset (JSON Dates → real Dates).
  const presetPoints = useMemo(
    () => (window === "all" ? points : points.slice(-Number(window))),
    [points, window],
  );
  const customPoints = useMemo(() => {
    if (custom.status !== "ready") return null;
    return custom.data.warPerformanceTrend.points.map((p) => ({
      ...p,
      endTime: new Date(p.endTime),
    }));
  }, [custom]);
  const activePoints = customPoints ?? presetPoints;

  const summary = useMemo(() => summarizeWarPerformance(activePoints), [activePoints]);

  const data = useMemo<ChartDatum[]>(() => {
    const ownEff = activePoints.map((p) => starEfficiency(p.ownStars, p.teamSize));
    const avg3 = rollingAverage(ownEff, 3);
    return activePoints.map((p, i) => ({
      label: shortDate(p.endTime),
      opponent: p.opponentName,
      warType: p.warType,
      teamSize: p.teamSize,
      own: ownEff[i] ?? null,
      opp: starEfficiency(p.opponentStars, p.teamSize),
      avg3: avg3[i] ?? null,
      ownStars: p.ownStars,
      opponentStars: p.opponentStars,
      ownDestruction: p.ownDestruction,
      opponentDestruction: p.opponentDestruction,
      result: p.result,
      max: maxStars(p.teamSize),
    }));
  }, [activePoints]);

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="war-trend-title"
    >
      {/* Header + record badge + window picker */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            War performance
          </p>
          <h3 id="war-trend-title" className="mt-1 font-display text-lg text-umbra-lilac">
            Star efficiency
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {summary.wars > 0 && (
            <Badge tone={summary.wins >= summary.losses ? "success" : "danger"}>
              {summary.wins}W · {summary.ties}T · {summary.losses}L
              {summary.avgOwnEfficiency != null
                ? ` · ${Math.round(summary.avgOwnEfficiency)}% ★`
                : ""}
            </Badge>
          )}

          <WindowPicker
            presets={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "all", label: "all" },
            ]}
            activePreset={isCustomActive ? null : window}
            onPresetChange={(v) => {
              setWindow(v as WarWindow);
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
            label="War performance window"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 h-56">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title={custom.status === "ready" ? "No wars in this range" : "No war history yet"}
              icon={<IconWarEmpty className="h-8 w-8" />}
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,151,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTickStyle}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={25}
                angle={-35}
                textAnchor="end"
                height={36}
              />
              <YAxis
                tick={axisTickStyle}
                tickLine={false}
                axisLine={false}
                width={34}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: CHART_COLORS.purple, fillOpacity: 0.08 }}
                content={({ active, payload }) => (
                  <WarTooltip
                    active={active}
                    datum={payload?.[0]?.payload as ChartDatum | undefined}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="opp"
                stroke="rgba(239,68,68,0.5)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                name="Them"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avg3"
                stroke="rgba(182,120,255,0.45)"
                strokeWidth={1.5}
                strokeDasharray="1 4"
                dot={false}
                connectNulls
                name="3-war avg"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="own"
                stroke={CHART_COLORS.purple}
                strokeWidth={2}
                dot={renderResultDot}
                activeDot={renderActiveDot}
                name="Us"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend — series + result encoding */}
      {data.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.6rem] uppercase tracking-wider text-umbra-muted">
          <LegendDot color={RESULT_COLORS.win} label="win" />
          <LegendDot color={RESULT_COLORS.loss} label="loss" />
          <LegendDot color={RESULT_COLORS.tie} label="tie" />
          <LegendLine color={CHART_COLORS.purple} label="us" />
          <LegendLine color="rgba(239,68,68,0.5)" label="them" dashed />
          <LegendLine color="rgba(182,120,255,0.45)" label="3-war avg" dotted />
        </div>
      )}
    </section>
  );
}

// ── Recharts render helpers ────────────────────────────────────────────────

/** Dot on the Us line, colored by that war's result. */
function renderResultDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: ChartDatum;
}) {
  const { cx, cy, index, payload } = props;
  if (cx == null || cy == null || payload == null || payload.own == null) {
    return <g key={`dot-skip-${index ?? "?"}`} />;
  }
  return (
    <circle
      key={`dot-${index ?? payload.label}`}
      cx={cx}
      cy={cy}
      r={3}
      fill={resultColor(payload.result)}
      stroke={CHART_COLORS.surface}
      strokeWidth={1}
    />
  );
}

/** Enlarged hover dot with a result-colored ring. */
function renderActiveDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: ChartDatum;
}) {
  const { cx, cy, index, payload } = props;
  if (cx == null || cy == null || payload == null || payload.own == null) {
    return <g key={`active-skip-${index ?? "?"}`} />;
  }
  const color = resultColor(payload.result);
  return (
    <g key={`active-${index ?? payload.label}`}>
      <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.2} />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke={CHART_COLORS.lilac}
        strokeWidth={1.5}
      />
    </g>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function WarTooltip({
  active,
  datum,
}: {
  active?: boolean;
  datum?: ChartDatum;
}) {
  if (!active || !datum) return null;

  const margin = datum.ownStars - datum.opponentStars;
  const sizeLabel = datum.teamSize != null ? `${datum.teamSize}v${datum.teamSize}` : null;
  const resultLabel =
    datum.result === "win" ? "WIN" : datum.result === "loss" ? "LOSS" : datum.result === "tie" ? "TIE" : null;
  const resultClass =
    datum.result === "win"
      ? "text-emerald-400"
      : datum.result === "loss"
        ? "text-red-400"
        : "text-umbra-muted";

  return (
    <div style={tooltipContentStyle}>
      <p style={{ color: CHART_COLORS.muted }}>
        {datum.label}
        {datum.opponent ? ` · vs ${datum.opponent}` : ""}
      </p>
      {(resultLabel || sizeLabel) && (
        <p className={`mt-1 font-semibold tracking-wider ${resultClass}`}>
          {[resultLabel, sizeLabel].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="mt-1.5 space-y-0.5">
        <TooltipRow
          color={CHART_COLORS.purple}
          label="Us"
          value={
            datum.max != null
              ? `${datum.ownStars}/${datum.max} ★ · ${fmtPct(datum.own)}`
              : `${datum.ownStars} ★`
          }
        />
        <TooltipRow
          color="rgba(239,68,68,0.7)"
          label="Them"
          value={
            datum.max != null
              ? `${datum.opponentStars}/${datum.max} ★ · ${fmtPct(datum.opp)}`
              : `${datum.opponentStars} ★`
          }
        />
      </div>
      <p style={{ color: CHART_COLORS.muted }} className="mt-1.5">
        Margin {margin > 0 ? "+" : ""}
        {margin} ★ · Dest {datum.ownDestruction}%–{datum.opponentDestruction}%
      </p>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5" style={{ color: CHART_COLORS.lilac }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span style={{ color: CHART_COLORS.lilac }}>{value}</span>
    </div>
  );
}

function fmtPct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v)}%`;
}

// ── Legend bits ────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function LegendLine({
  color,
  label,
  dashed,
  dotted,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  dotted?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-px w-3.5"
        style={{
          background: dashed || dotted ? "transparent" : color,
          borderTop: `2px ${dashed ? "dashed" : dotted ? "dotted" : "solid"} ${color}`,
        }}
      />
      {label}
    </span>
  );
}

function shortDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

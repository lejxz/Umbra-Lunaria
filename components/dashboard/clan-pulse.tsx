"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  ClanPulse,
  DonationWindow,
  ActivityScoreLeaderboard,
} from "@/lib/view-models/dashboard";
import { Tabs, EmptyState } from "@/components/ui";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { IconActivityEmpty } from "@/components/ui/icons";
import { CHART_COLORS, axisTickStyle, tooltipProps } from "@/lib/chart-theme";

/**
 * Clan Pulse — the combined Activity × Roster panel (2026-09-14, user
 * request: "combine Activity Analytics and Roster growth and improve it").
 *
 * One chart answers what previously took two separate panels:
 *   - bars ....... active members per bucket (activity evidence)
 *   - solid line . roster size per clan-TZ day (growth)
 *   - dashed line . engagement rate = active ÷ roster (the normalization
 *                   that separates "big" from "engaged")
 * plus a verdict pill (growth × engagement 2×2: Thriving / Growing but
 * diluting / Tightening core / Fading / Steady) computed by the pure
 * engine in lib/scoring/clan-pulse.ts. The Top-5 Activity Score
 * leaderboard from the old Activity panel is kept on the right.
 */
export function ClanPulsePanel({
  pulseByWindow,
  leaderboardByWindow,
  onMemberClick,
}: {
  pulseByWindow: Record<DonationWindow, ClanPulse>;
  leaderboardByWindow: Record<DonationWindow, ActivityScoreLeaderboard>;
  onMemberClick?: (playerTag: string) => void;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const pulse = pulseByWindow[window];
  const leaderboard = leaderboardByWindow[window];
  const { entries } = leaderboard;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="pulse-title"
      style={{ minHeight: "380px" }}
    >
      {/* Header: title + verdict pill | tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Roster signal &amp; support
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 id="pulse-title" className="font-display text-lg text-umbra-lilac">
              Clan Pulse — Activity &amp; Roster
            </h3>
            <VerdictPill verdict={pulse.verdict} />
          </div>
        </div>

        <Tabs
          items={["24h", "7d", "30d"]}
          active={window}
          onChange={(v) => setWindow(v as DonationWindow)}
          label="Pulse window"
        />
      </div>

      {/* Stat strip — the combined story in three chips */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatChip
          label={`Active · ${window}`}
          value={`${pulse.totalActiveMembers}/${pulse.totalMembers}`}
          detail={
            pulse.totalMembers > 0
              ? `${((pulse.totalActiveMembers / pulse.totalMembers) * 100).toFixed(0)}%`
              : undefined
          }
        />
        <Divider />
        <StatChip
          label="Roster"
          value={pulse.rosterNow !== null ? `${pulse.rosterNow}` : "—"}
          detail={formatDelta(pulse.rosterDelta)}
          detailTone={deltaTone(pulse.rosterDelta)}
        />
        <Divider />
        <StatChip
          label="Engagement"
          value={pulse.avgRate !== null ? `${pulse.avgRate.toFixed(0)}% avg` : "—"}
          detail={formatTrend(pulse.rateTrendPp)}
          detailTone={trendTone(pulse.rateTrendPp)}
        />
        {pulse.hasPartialData && (
          <span className="text-label text-amber-400">⚠ Partial</span>
        )}
      </div>

      {/* Chart + Leaderboard */}
      <div className="mt-4 grid flex-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-h-[200px]">
          {pulse.points.length > 0 ? (
            <PulseChart pulse={pulse} />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <EmptyState
                icon={<IconActivityEmpty />}
                title="No activity yet"
                description="Observed activity will appear once members change donations or trophies between updates."
              />
            </div>
          )}
        </div>

        {/* Leaderboard — podium styling matching DonationAnalytics top donors */}
        <div className="flex flex-col lg:border-l lg:border-white/5 lg:pl-6">
          <p className="mb-3 font-mono text-label uppercase tracking-wider text-umbra-muted">
            Top 5 Activity · {window}
          </p>
          {entries.length > 0 ? (
            <div className="flex flex-col gap-2">
              {entries.slice(0, 5).map((entry) => {
                let rankColor = "text-umbra-purple";
                let badgeStyle = "bg-white/[.03] border border-white/5";

                if (entry.rank === 1) {
                  rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
                  badgeStyle = "bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20";
                } else if (entry.rank === 2) {
                  rankColor = "text-slate-300";
                  badgeStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border border-slate-400/20";
                } else if (entry.rank === 3) {
                  rankColor = "text-orange-400";
                  badgeStyle = "bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20";
                }

                return (
                  <button
                    key={entry.playerTag}
                    onClick={() => onMemberClick?.(entry.playerTag)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.04] ${badgeStyle}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`font-mono text-xs font-bold ${rankColor}`}>
                        #{entry.rank}
                      </span>
                      {entry.leagueTier?.iconUrls?.small && (
                        <Image
                          src={entry.leagueTier.iconUrls.small}
                          alt=""
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] shrink-0"
                        />
                      )}
                      <span className="truncate text-xs font-medium text-umbra-lilac">
                        {entry.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-emerald-400">
                      {entry.totalScore.toFixed(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-umbra-muted">No scores yet</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Chart ────────────────────────────────────────────────────────────────

const RATE_COLOR = "#34D399"; // emerald — the derived "engagement" signal

function PulseChart({ pulse }: { pulse: ClanPulse }) {
  const data = pulse.points;

  return (
    <div className="flex h-full flex-col">
      {/* Compact legend — Recharts <Legend> fights the layout; hand-roll it */}
      <div className="mb-1 flex flex-wrap items-center gap-4 px-1">
        <LegendSwatch shape="bar" color="#7552DF" label="Active members" />
        <LegendSwatch shape="line" color={CHART_COLORS.lilac} label="Roster size" />
        <LegendSwatch shape="dashed" color={RATE_COLOR} label="Engagement rate" />
      </div>
      <div className="min-h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,151,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={30}
              angle={-30}
              textAnchor="end"
              height={40}
            />
            {/* Left axis: members (bars + roster line share it — same unit) */}
            <YAxis
              yAxisId="members"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
            />
            {/* Right axis: engagement % */}
            <YAxis
              yAxisId="rate"
              orientation="right"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              width={34}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              {...tooltipProps}
              formatter={(value, name) => {
                if (value === null || value === undefined) return ["—", name];
                switch (name) {
                  case "Active":
                    return [`${value} active`, "Active members"];
                  case "Roster":
                    return [`${value} members`, "Roster size"];
                  default:
                    return [`${Number(value).toFixed(0)}% engaged`, "Engagement rate"];
                }
              }}
            />
            <Bar
              yAxisId="members"
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
              dataKey="active"
              radius={[3, 3, 0, 0]}
              name="Active"
            >
              {data.map((_, i) => (
                <Cell key={i} fill="#7552DF" />
              ))}
            </Bar>
            <Line
              yAxisId="members"
              type="stepAfter"
              dataKey="roster"
              stroke={CHART_COLORS.lilac}
              strokeWidth={2}
              dot={false}
              connectNulls
              name="Roster"
              isAnimationActive={false}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="rate"
              stroke={RATE_COLOR}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              name="Rate"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendSwatch({
  shape,
  color,
  label,
}: {
  shape: "bar" | "line" | "dashed";
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {shape === "bar" ? (
        <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
      ) : (
        <span
          className="inline-block h-0 w-4 border-t-2"
          style={{
            borderColor: color,
            borderTopStyle: shape === "dashed" ? "dashed" : "solid",
          }}
          aria-hidden
        />
      )}
      <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">{label}</span>
    </span>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────

const TONE_CLASSES: Record<string, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  muted: "border-white/10 bg-white/[.04] text-umbra-muted",
};

const TONE_DOTS: Record<string, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  muted: "bg-umbra-muted",
};

function VerdictPill({ verdict }: { verdict: ClanPulse["verdict"] }) {
  return (
    <span
      title={verdict.description}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-micro uppercase tracking-wider ${TONE_CLASSES[verdict.tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOTS[verdict.tone]}`} aria-hidden />
      {verdict.label}
    </span>
  );
}

function StatChip({
  label,
  value,
  detail,
  detailTone = "muted",
}: {
  label: string;
  value: string;
  detail?: string;
  detailTone?: "up" | "down" | "muted";
}) {
  const detailColor =
    detailTone === "up" ? "text-emerald-400" : detailTone === "down" ? "text-red-400" : "text-umbra-muted";
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">{label}</span>
      <span className="font-display text-xs font-bold text-white">{value}</span>
      {detail && <span className={`font-mono text-micro ${detailColor}`}>{detail}</span>}
    </div>
  );
}

function Divider() {
  return <div className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />;
}

/** "+3" / "−2" / "±0" for roster momentum. */
function formatDelta(delta: number | null): string | undefined {
  if (delta === null) return undefined;
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

function deltaTone(delta: number | null): "up" | "down" | "muted" {
  if (delta === null || delta === 0) return "muted";
  return delta > 0 ? "up" : "down";
}

/** "+6pp" / "−4pp" for the engagement trend. */
function formatTrend(trendPp: number | null): string | undefined {
  if (trendPp === null) return undefined;
  const rounded = Math.round(trendPp);
  if (rounded === 0) return "±0pp";
  return rounded > 0 ? `+${rounded}pp` : `−${Math.abs(rounded)}pp`;
}

function trendTone(trendPp: number | null): "up" | "down" | "muted" {
  if (trendPp === null || Math.abs(trendPp) < 1) return "muted";
  return trendPp > 0 ? "up" : "down";
}

"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  ActivityTimeline,
  ActivityBucket,
  DonationWindow,
  ActivityScoreLeaderboard,
} from "@/lib/view-models/dashboard";
import { Tabs, EmptyState } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/**
 * Activity Analytics — Unified panel for activity timeline and member activity score.
 * Layout: Compact stats/tabs row at top, then a 2-column grid with the timeline chart
 * on the left (fills remaining height) and the scrollable activity score leaderboard on the right.
 * See concept/05-dashboard.md
 */
export function ActivityAnalytics({
  dataByWindow,
  leaderboard,
  onMemberClick,
}: {
  dataByWindow: Record<DonationWindow, ActivityTimeline>;
  leaderboard: ActivityScoreLeaderboard;
  onMemberClick?: (playerTag: string) => void;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const current = dataByWindow[window];
  const { entries } = leaderboard;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5 sm:p-6"
      aria-labelledby="activity-title"
      style={{ height: "560px" }}
    >
      {/* Header + Stats + Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Roster signal & support
          </p>
          <h3
            id="activity-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Activity Analytics
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Compact stats card */}
          <div className="hidden md:flex items-center rounded-xl bg-white/5 p-1">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                Active · {window}
              </span>
              <span className="font-display text-xs font-bold text-white">
                {current.totalActiveMembers}
                <span className="ml-1 text-[11px] text-umbra-muted">
                  / {current.totalMembers}
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                Rate
              </span>
              <span className="font-display text-xs font-bold text-white">
                {current.totalMembers > 0
                  ? `${((current.totalActiveMembers / current.totalMembers) * 100).toFixed(0)}%`
                  : "—"}
              </span>
            </div>
            {current.hasPartialData && (
              <span className="ml-2 pr-3 text-[10px] text-amber-400">⚠ Partial</span>
            )}
          </div>
          
          <Tabs
            items={["24h", "7d", "30d"]}
            active={window}
            onChange={(v) => setWindow(v as DonationWindow)}
            label="Activity window"
          />
        </div>
      </div>

      {/* Chart + Leaderboard — chart fills remaining height */}
      <div className="mt-4 grid flex-1 overflow-hidden gap-6 lg:grid-cols-[1fr_320px]">
        {/* Chart — flex-1 to fill the remaining height */}
        <div className="min-h-[180px] h-full">
          {current.buckets.length > 0 ? (
            <ActivityChart buckets={current.buckets} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={<ActivityEmptyIcon />}
                title="No activity yet"
                description="Observed activity will appear once members change donations or trophies between polls."
              />
            </div>
          )}
        </div>

        {/* Member Activity Score Leaderboard — right side */}
        <div className="flex flex-col lg:border-l lg:border-white/5 lg:pl-6 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
              Member Activity Score
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple bg-umbra-purple/10 px-1.5 py-0.5 rounded">
              {leaderboard.window}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                title="No scores yet"
                description="Scores will appear once the tracker has enough data."
              />
            </div>
          ) : (
            <div className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
              {entries.map((entry) => (
                <button
                  key={entry.playerTag}
                  onClick={() => onMemberClick?.(entry.playerTag)}
                  className="flex w-full items-center justify-between gap-2.5 rounded-lg bg-white/[.035] px-3 py-2 text-left transition hover:bg-white/[.06] focus-ring"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="font-mono text-xs text-umbra-purple">
                      {entry.rank.toString().padStart(2, "0")}
                    </span>
                    {entry.leagueTier?.iconUrls?.small && (
                      <Image
                        src={entry.leagueTier.iconUrls.small}
                        alt=""
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] shrink-0"
                        unoptimized
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-umbra-lilac">
                        {entry.name}
                      </p>
                      <p className="truncate text-[11px] text-umbra-muted">
                        {entry.townHallLevel ? `TH${entry.townHallLevel}` : ""}
                        {entry.leagueTier?.name && ` · ${entry.leagueTier.name}`}
                        {entry.limitedData && " · limited"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-bold text-emerald-400">
                      {entry.totalScore.toFixed(1)}
                    </p>
                    <div className="mt-0.5 flex justify-end gap-0.5">
                      {entry.components.map((c) => (
                        <div
                          key={c.name}
                          title={`${c.name}: ${c.available ? c.points.toFixed(1) : "unavailable"}`}
                          className={`h-1 w-3 rounded-full ${
                            c.available ? "bg-umbra-purple" : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivityChart({ buckets }: { buckets: ActivityBucket[] }) {
  const data = buckets.map((b) => ({
    label: b.label,
    active: b.activeMembers,
    percent: Math.round(b.percent),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barCategoryGap="20%"
      >
        <XAxis
          dataKey="label"
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={30}
          angle={-45}
          textAnchor="end"
          height={40}
        />
        <YAxis
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(182, 120, 255, 0.08)" }}
          contentStyle={{
            background: "#12101C",
            border: "1px solid rgba(190, 151, 255, 0.15)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#EEE5FF",
          }}
          labelStyle={{ color: "#9287AD" }}
          itemStyle={{ color: "#EEE5FF" }}
          formatter={(value) => [`${value} active`, "Members"]}
        />
        <Bar dataKey="active" radius={[3, 3, 0, 0]} name="Active">
          {data.map((_, i) => (
            <Cell key={i} fill="#7552DF" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActivityEmptyIcon() {
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
        d="M8 24H16L20 12L28 36L32 24H40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 4"
      />
    </svg>
  );
}

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
 * Activity Analytics — unified panel for activity timeline + member score.
 * The 24h/7d/30d tabs switch BOTH the timeline chart and the score leaderboard.
 * Styled to match DonationAnalytics exactly.
 */
export function ActivityAnalytics({
  dataByWindow,
  leaderboardByWindow,
  onMemberClick,
}: {
  dataByWindow: Record<DonationWindow, ActivityTimeline>;
  leaderboardByWindow: Record<DonationWindow, ActivityScoreLeaderboard>;
  onMemberClick?: (playerTag: string) => void;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const current = dataByWindow[window];
  const leaderboard = leaderboardByWindow[window];
  const { entries } = leaderboard;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5 sm:p-6"
      aria-labelledby="activity-title"
      style={{ minHeight: "380px" }}
    >
      {/* Header + Stats + Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Roster signal & support
          </p>
          <h3 id="activity-title" className="mt-1 font-display text-lg text-umbra-lilac">
            Activity Analytics
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="hidden md:flex items-center rounded-xl bg-white/5 p-1">
            <StatChip
              label={`Active · ${window}`}
              value={`${current.totalActiveMembers}/${current.totalMembers}`}
            />
            <div className="h-4 w-px bg-white/10 mx-1" />
            <StatChip
              label="Rate"
              value={
                current.totalMembers > 0
                  ? `${((current.totalActiveMembers / current.totalMembers) * 100).toFixed(0)}%`
                  : "—"
              }
            />
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

      {/* Chart + Leaderboard */}
      <div className="mt-4 grid flex-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chart */}
        <div className="h-[220px]">
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

        {/* Leaderboard — podium styling matching DonationAnalytics top donors */}
        <div className="flex flex-col lg:border-l lg:border-white/5 lg:pl-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
            Activity Score · {window}
          </p>
          {entries.length > 0 ? (
            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "220px" }}>
              {entries.slice(0, 8).map((entry) => {
                // Podium styling — same as DonationAnalytics top donors
                let rankColor = "text-umbra-purple";
                let badgeStyle = "bg-white/[.02] border border-white/5";

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
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.07] ${badgeStyle}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`font-mono text-[13px] font-bold ${rankColor}`}>
                        #{entry.rank}
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
                      <span className="truncate text-[13px] font-medium text-umbra-lilac">
                        {entry.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[13px] font-semibold text-emerald-400">
                      {entry.totalScore.toFixed(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-umbra-muted">No scores yet</p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <span className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{label}</span>
      <span className="font-display text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function ActivityChart({ buckets }: { buckets: ActivityBucket[] }) {
  const data = buckets.map((b) => ({ label: b.label, active: b.activeMembers }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
        <XAxis
          dataKey="label"
          tick={{ fill: "#A89CC4", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={30}
          angle={-30}
          textAnchor="end"
          height={40}
        />
        <YAxis
          tick={{ fill: "#A89CC4", fontSize: 9, fontFamily: "JetBrains Mono" }}
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
          labelStyle={{ color: "#A89CC4" }}
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
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
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

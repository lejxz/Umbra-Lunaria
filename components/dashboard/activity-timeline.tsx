"use client";

import { useState } from "react";
import type {
  ActivityTimeline,
  ActivityBucket,
  DonationWindow,
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
 * Activity timeline panel. Shows active-member count and percent of the
 * retained roster for 24-hour, 7-day, and 30-day windows. Labeled as
 * observed activity, never "online now." See concept/05-dashboard.md §6.
 *
 * Styled consistently with the donation analytics card: compact inline
 * stats, chart fills remaining height, same axis treatment.
 */
export function ActivityTimelinePanel({
  dataByWindow,
}: {
  dataByWindow: Record<DonationWindow, ActivityTimeline>;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const current = dataByWindow[window];

  return (
    <section
      className="glass rounded-2xl p-5 sm:p-6"
      aria-labelledby="activity-title"
    >
      {/* Header + Stats + Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Roster signal
          </p>
          <h3
            id="activity-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Activity timeline
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Compact stats card */}
          <div className="hidden md:flex items-center gap-4 rounded-lg bg-white/[.03] border border-white/5 px-4 py-1.5 backdrop-blur-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
                Active · {window}
              </span>
              <span className="font-display text-lg font-bold text-white">
                {current.totalActiveMembers}
                <span className="ml-1 text-sm text-umbra-muted">
                  / {current.totalMembers}
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
                Rate
              </span>
              <span className="font-display text-lg font-bold text-white">
                {current.totalMembers > 0
                  ? `${((current.totalActiveMembers / current.totalMembers) * 100).toFixed(0)}%`
                  : "—"}
              </span>
            </div>
            {current.hasPartialData && (
              <span className="ml-2 text-[10px] text-amber-400">⚠ Partial</span>
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

      {/* Chart — explicit height so ResponsiveContainer can render */}
      <div className="mt-4 h-[220px]">
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

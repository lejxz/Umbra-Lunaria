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
 */
export function ActivityTimelinePanel({
  dataByWindow,
}: {
  dataByWindow: Record<DonationWindow, ActivityTimeline>;
}) {
  const [window, setWindow] = useState<DonationWindow>("24h");
  const current = dataByWindow[window];

  return (
    <section className="glass rounded-2xl p-5" aria-labelledby="activity-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Roster signal
          </p>
          <h3 id="activity-title" className="mt-1 font-display text-lg text-umbra-lilac">
            Activity timeline
          </h3>
        </div>
        <Tabs
          items={["24h", "7d", "30d"]}
          active={window}
          onChange={(v) => setWindow(v as DonationWindow)}
          label="Activity window"
        />
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[.035] p-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            Active members · {window}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-white">
            {current.totalActiveMembers}
            <span className="ml-1 text-sm text-umbra-muted">
              / {current.totalMembers}
            </span>
          </p>
        </div>
        <div className="rounded-xl bg-white/[.035] p-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            Participation rate
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-white">
            {current.totalMembers > 0
              ? `${((current.totalActiveMembers / current.totalMembers) * 100).toFixed(0)}%`
              : "—"}
          </p>
        </div>
      </div>

      {current.hasPartialData && (
        <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-400">
          ⚠ Partial data — tracking started partway through this window.
        </p>
      )}

      {/* Chart */}
      <div className="mt-4">
        {current.buckets.length > 0 ? (
          <ActivityChart buckets={current.buckets} />
        ) : (
          <div className="flex h-[122px] items-center justify-center">
            <EmptyState
              title="No activity yet"
              description="Observed activity will appear once members change donations or trophies between polls."
            />
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-umbra-muted">
        Estimated from observed changes — not online presence.
      </p>
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
    <div className="h-[122px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            width={30}
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
          <Bar dataKey="active" radius={[4, 4, 0, 0]} name="Active">
            {data.map((_, i) => (
              <Cell key={i} fill="#7552DF" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

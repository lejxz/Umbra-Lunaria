"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { RosterSizeTrend } from "@/lib/view-models/dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { IconUserCheck } from "@/components/ui/icons";

/**
 * Roster size trend — an area chart showing distinct retained members per day.
 * Answers: "Is the clan growing or shrinking?"
 *
 * Sparse during cold start (only a few days of data); fills as tracking
 * accumulates. The area fill makes growth/decline visually obvious.
 */
export function RosterSizeChart({ trend }: { trend: RosterSizeTrend }) {
  if (trend.points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="No roster data yet"
          description="Roster size trends appear once tracking begins."
          icon={<IconUserCheck className="h-8 w-8" />}
        />
      </div>
    );
  }

  const data = trend.points.map((p) => ({
    label: shortDate(p.timestamp),
    count: p.count,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="rosterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B678FF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#B678FF" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,151,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={30}
          angle={-35}
          textAnchor="end"
          height={36}
        />
        <YAxis
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "#12101C",
            border: "1px solid rgba(190, 151, 255, 0.15)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#EEE5FF",
          }}
          labelStyle={{ color: "#9287AD" }}
          itemStyle={{ color: "#EEE5FF" }}
          formatter={(value) => [`${value ?? 0} members`, "Roster"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#B678FF"
          strokeWidth={2}
          fill="url(#rosterGrad)"
          name="count"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function shortDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

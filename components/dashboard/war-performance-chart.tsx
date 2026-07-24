"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { WarPerformanceTrend } from "@/lib/view-models/dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { IconWarEmpty } from "@/components/ui/icons";

/**
 * War performance trend — a line chart showing own stars vs opponent stars
 * per war over time (oldest left, newest right). Win/loss/tie is encoded via
 * the dot color on the own-stars line.
 *
 * Answers: "Are we getting better?" — the trend of our star performance
 * across recent wars.
 */
export function WarPerformanceChart({ trend }: { trend: WarPerformanceTrend }) {
  if (trend.points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="No war history yet"
          description="Performance trends appear once completed wars are tracked."
          icon={<IconWarEmpty className="h-8 w-8" />}
        />
      </div>
    );
  }

  const data = trend.points.map((p) => ({
    label: shortDate(p.endTime),
    opponent: p.opponentName,
    own: p.ownStars,
    opp: p.opponentStars,
    result: p.result,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,151,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={25}
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
          formatter={(value, name) => [
            `${value ?? 0} ★`,
            name === "own" ? "Us" : "Opponent",
          ]}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as { opponent?: string } | undefined;
            return p?.opponent ? `vs ${p.opponent}` : "";
          }}
        />
        <ReferenceLine y={0} stroke="rgba(190,151,255,0.1)" />
        <Line
          type="monotone"
          dataKey="own"
          stroke="#B678FF"
          strokeWidth={2}
          dot={{ r: 3, fill: "#B678FF" }}
          activeDot={{ r: 5 }}
          name="own"
        />
        <Line
          type="monotone"
          dataKey="opp"
          stroke="rgba(239,68,68,0.5)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          name="opp"
        />
      </LineChart>
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

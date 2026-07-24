"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { WarAttackDistribution } from "@/lib/view-models/dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSwords } from "@/components/ui/icons";

/**
 * War attack distribution — a donut chart showing the breakdown of attack
 * results across all live-tracked wars: 3★ / 2★ / 1★ / 0★.
 *
 * Answers: "How clean are our attacks?" — a high 3★ rate means the clan
 * executes well; a high 1★/0★ rate signals practice or lineup issues.
 *
 * Sparse until more wars are live-tracked (backfilled wars have no attack
 * detail). Renders an empty state when total = 0.
 */
export function WarAttackDistributionChart({
  distribution,
}: {
  distribution: WarAttackDistribution;
}) {
  if (distribution.total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <EmptyState
          title="No attack data yet"
          description="Attack distribution appears once live-tracked wars have attacks."
          icon={<IconSwords className="h-8 w-8" />}
        />
      </div>
    );
  }

  const data = [
    { name: "3★", value: distribution.threeStar, color: "#34D399" },
    { name: "2★", value: distribution.twoStar, color: "#FBBF24" },
    { name: "1★", value: distribution.oneStar, color: "#F87171" },
    { name: "0★", value: distribution.zeroStar, color: "#6B6480" },
  ].filter((d) => d.value > 0);

  const threeStarRate =
    distribution.total > 0
      ? Math.round((distribution.threeStar / distribution.total) * 100)
      : 0;

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
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
              `${value ?? 0} attacks (${Math.round((Number(value ?? 0) / distribution.total) * 100)}%)`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label — 3★ rate */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-emerald-400">
          {threeStarRate}%
        </span>
        <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
          3★ rate
        </span>
      </div>
    </div>
  );
}

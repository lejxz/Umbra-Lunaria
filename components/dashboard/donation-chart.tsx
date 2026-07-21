"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DonationBucket, DonationWindow } from "@/lib/view-models/dashboard";

/**
 * Donation bar chart. Uses Recharts with the dark observatory theme.
 * Shows given + received per bucket (hourly for 24h, daily for 7d/30d).
 */
export function DonationChart({
  buckets,
}: {
  buckets: DonationBucket[];
  window: DonationWindow;
}) {
  const data = buckets.map((b) => ({
    label: b.label,
    given: b.given,
    received: b.received,
  }));

  return (
    <div className="h-[200px] w-full">
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
          />
          <Bar dataKey="given" fill="#B678FF" radius={[4, 4, 0, 0]} name="Given" />
          <Bar
            dataKey="received"
            fill="#7552DF"
            radius={[4, 4, 0, 0]}
            name="Received"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DonationBucket } from "@/lib/view-models/dashboard";

/**
 * Donation chart — bars for given + received, with a ratio line overlay
 * (given / received). The ratio line surfaces imbalances that the two-bar
 * view alone doesn't make obvious: a ratio above 1 means the clan gives more
 * than it receives; below 1 means it's a net receiver.
 *
 * Uses Recharts ComposedChart (Bar + Line) with the dark observatory theme.
 */
export function DonationChart({ buckets }: { buckets: DonationBucket[] }) {
  const data = buckets.map((b) => {
    const ratio = b.received > 0 ? b.given / b.received : null;
    return {
      label: b.label,
      given: b.given,
      received: b.received,
      ratio: ratio !== null ? Math.round(ratio * 100) / 100 : null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,151,255,0.06)" vertical={false} />
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
          yAxisId="bars"
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="ratio"
          orientation="right"
          tick={{ fill: "#9287AD", fontSize: 9, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={true}
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
          formatter={(value, name) => {
            if (name === "ratio") {
              return [value != null ? `${value}×` : "—", "Ratio"];
            }
            return [String(value ?? 0), name === "given" ? "Given" : "Received"];
          }}
        />
        <Bar yAxisId="bars" dataKey="given" fill="#B678FF" radius={[3, 3, 0, 0]} name="given" />
        <Bar yAxisId="bars" dataKey="received" fill="#7552DF" radius={[3, 3, 0, 0]} name="received" />
        <Line
          yAxisId="ratio"
          type="monotone"
          dataKey="ratio"
          stroke="#34D399"
          strokeWidth={1.5}
          dot={false}
          name="ratio"
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

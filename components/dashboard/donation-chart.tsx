"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DonationBucket } from "@/lib/view-models/dashboard";

/**
 * Donation bar chart. Uses Recharts with the dark observatory theme.
 * Shows given + received per bucket (hourly for 24h, daily for 7d/30d).
 *
 * Note: in CoC, every donation is simultaneously a "give" (donor) and a
 * "receive" (recipient), so the clan-wide given total always equals received.
 * The two bars are still useful per-member and per-bucket (they show WHO is
 * donating vs WHO is receiving), but a ratio line would always be ~1.0 and
 * adds no signal — it was removed.
 *
 * The chart fills its parent container height — the parent controls the size.
 */
export function DonationChart({ buckets }: { buckets: DonationBucket[] }) {
  const data = buckets.map((b) => ({
    label: b.label,
    given: b.given,
    received: b.received,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
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
          formatter={(value, name) => [
            String(value ?? 0),
            name === "given" ? "Given" : "Received",
          ]}
        />
        <Bar dataKey="given" fill="#B678FF" radius={[3, 3, 0, 0]} name="given" />
        <Bar dataKey="received" fill="#7552DF" radius={[3, 3, 0, 0]} name="received" />
      </BarChart>
    </ResponsiveContainer>
  );
}

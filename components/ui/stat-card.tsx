import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendTone = "success",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: string;
  trendTone?: "success" | "muted" | "warning";
}) {
  const trendColor =
    trendTone === "muted"
      ? "text-umbra-muted"
      : trendTone === "warning"
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-umbra-muted">
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      {trend && <p className={`mt-2 text-xs ${trendColor}`}>{trend}</p>}
    </div>
  );
}

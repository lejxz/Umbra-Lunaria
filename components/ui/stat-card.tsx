import type { ReactNode } from "react";

/**
 * StatCard — a lunar-tile stat block.
 *
 * L2 tile surface with a glowing icon, big mono value, and an optional trend
 * line. Hovers brighten the border + add a soft violet wash.
 */
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
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <div className="lunar-tile group">
      <div className="flex items-center justify-between">
        <span className="font-mono text-label font-medium uppercase tracking-[0.14em] text-umbra-faint">
          {label}
        </span>
        {icon && (
          <span className="text-umbra-purple transition-transform duration-200 group-hover:scale-110">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold text-umbra-moonlight">
        {value}
      </div>
      {trend && <p className={`mt-1.5 font-mono text-label ${trendColor}`}>{trend}</p>}
    </div>
  );
}

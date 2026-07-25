/**
 * StatTile — the Level 2 inner stat tile.
 *
 * A small box inside a Panel that shows a label + value. Standardized
 * padding, radius, and typography. Replaces the 15+ inline
 * `bg-white/[.035]` stat boxes across dashboard cards.
 *
 * See docs/ui-redesign-implementation-plan.md §3.4 for the spec.
 */

import { type ReactNode } from "react";

export function StatTile({
  label,
  value,
  format = "raw",
  icon,
  className,
}: {
  label: string;
  value: number | string | null | ReactNode;
  format?: "raw" | "locale";
  icon?: ReactNode;
  className?: string;
}) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
        ? format === "locale"
          ? value.toLocaleString()
          : String(value)
        : value;

  return (
    <div className={["tile", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-1.5 text-umbra-muted">
        {icon && <span className="text-umbra-purple">{icon}</span>}
        <span className="font-mono text-[0.6rem] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-lg text-umbra-lilac tabular-nums">
        {display}
      </p>
    </div>
  );
}

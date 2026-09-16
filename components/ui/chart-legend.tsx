import type { ReactNode } from "react";

/**
 * ChartLegend — the one legend pattern for every chart card.
 *
 * Before this component existed, each chart rolled its own: Recharts'
 * built-in <Legend> (membership timeline), a LegendSwatch row ABOVE the
 * chart (clan pulse), and LegendDot/LegendLine bits below it (war
 * performance) — three shapes, three type sizes, two placements. This
 * unifies them into a single presentational component in the UI kit:
 *
 *   - swatch shapes that match the series they stand for
 *     (bar / dot / line / dashed / dotted / area)
 *   - one typography: font-mono text-label uppercase tracking-wider muted
 *   - one placement: BELOW the chart, mt-2.5, wrapping on narrow screens
 *
 * Items may carry a live `value` (+ optional toned `detail`) so a panel can
 * fold its stat strip into the legend instead of printing the same series
 * twice — the legend is then both the key and the readout (clan pulse).
 *
 * Purely presentational: no hooks, no state — whatever renders it owns the
 * data.
 */

/** Swatch shape — pick the one that mirrors the series' mark in the chart. */
export type LegendShape = "bar" | "dot" | "line" | "dashed" | "dotted" | "area";

export interface LegendItem {
  label: string;
  color: string;
  /** Defaults to "dot". */
  shape?: LegendShape;
  /** Live value rendered after the label (the stat-legend hybrid). */
  value?: ReactNode;
  /** Muted delta/detail after the value ("±0", "+6pp"). */
  detail?: ReactNode;
  /** Color tone for the detail. */
  detailTone?: "up" | "down" | "muted";
}

export function ChartLegend({
  items,
  label,
  className = "",
}: {
  items: LegendItem[];
  /** Accessible name for the legend list ("War performance series"). */
  label: string;
  className?: string;
}) {
  return (
    <ul
      role="list"
      aria-label={label}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-label uppercase tracking-wider text-umbra-muted ${className}`}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <LegendSwatch shape={item.shape ?? "dot"} color={item.color} />
          <span>{item.label}</span>
          {item.value != null && (
            <span className="font-display text-xs font-bold normal-case tracking-normal text-white">
              {item.value}
            </span>
          )}
          {item.detail != null && (
            <span
              className={`font-mono text-micro normal-case tracking-normal ${
                item.detailTone === "up"
                  ? "text-emerald-400"
                  : item.detailTone === "down"
                    ? "text-red-400"
                    : "text-umbra-muted"
              }`}
            >
              {item.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function LegendSwatch({ shape, color }: { shape: LegendShape; color: string }) {
  switch (shape) {
    case "bar":
      return (
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
          style={{ background: color }}
          aria-hidden
        />
      );
    case "area":
      return (
        <span
          className="inline-block h-2.5 w-4 shrink-0 rounded-[3px]"
          style={{ background: color, opacity: 0.4, boxShadow: `inset 0 1.5px 0 ${color}` }}
          aria-hidden
        />
      );
    case "line":
    case "dashed":
    case "dotted":
      return (
        <span
          className="inline-block h-0 w-3.5 shrink-0"
          style={{
            borderTop: `2px ${
              shape === "dashed" ? "dashed" : shape === "dotted" ? "dotted" : "solid"
            } ${color}`,
          }}
          aria-hidden
        />
      );
    default:
      return (
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      );
  }
}

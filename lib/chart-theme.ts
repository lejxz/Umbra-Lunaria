/**
 * Chart theme — the single source of truth for Recharts colors + styles.
 *
 * Recharts SVG props don't accept Tailwind classes, so chart components
 * hardcode hex values. This file centralizes them so they stay in sync
 * with the umbra design tokens defined in tailwind.config.ts.
 *
 * If you change a color in tailwind.config.ts, update it here too.
 * The values are kept as plain strings (not CSS variables) because
 * Recharts renders to SVG, not to the Tailwind cascade.
 *
 * Used by: donation-chart, war-performance-chart, war-attack-distribution,
 * roster-size-chart, activity-analytics.
 */

// ── Color constants (mirror tailwind.config.ts umbra.* tokens) ──────────

export const CHART_COLORS = {
  /** Primary accent — bars, lines, dots, active series. */
  purple: "#B678FF",
  /** Primary text — tooltip body, item labels. */
  lilac: "#EEE5FF",
  /** Muted text — axis ticks, tooltip labels. Mirrors umbra.muted. */
  muted: "#B0A4CC",
  /** Surface — tooltip background. Mirrors umbra.surface. */
  surface: "#12101C",
  /** Border — tooltip border. Mirrors umbra.line at full opacity. */
  border: "rgba(190, 151, 255, 0.15)",
} as const;

// ── Shared Recharts style objects ────────────────────────────────────────

/** Shared axis tick style — used on every XAxis/YAxis in every chart. */
export const axisTickStyle = {
  fill: CHART_COLORS.muted,
  fontSize: 9,
  fontFamily: "JetBrains Mono",
} as const;

/** Shared tooltip content style — copy-pasted in 5 files before this existed. */
export const tooltipContentStyle = {
  background: CHART_COLORS.surface,
  border: `1px solid ${CHART_COLORS.border}`,
  borderRadius: "8px",
  fontSize: "11px",
  color: CHART_COLORS.lilac,
  padding: "8px 12px",
} as const;

/** Shared tooltip label style — the header text above the items. */
export const tooltipLabelStyle = {
  color: CHART_COLORS.muted,
} as const;

/** Shared tooltip item style — each data point's text. */
export const tooltipItemStyle = {
  color: CHART_COLORS.lilac,
} as const;

/** Combined tooltip props — spread onto <Tooltip> in one go. */
export const tooltipProps = {
  contentStyle: tooltipContentStyle,
  labelStyle: tooltipLabelStyle,
  itemStyle: tooltipItemStyle,
  cursor: { fill: CHART_COLORS.purple, fillOpacity: 0.08 },
} as const;

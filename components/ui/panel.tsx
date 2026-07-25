/**
 * Panel — the Level 1 card surface (replaces .glass for new components).
 *
 * Adds an optional stained-glass accent: a thin colored top-edge that
 * color-codes sections (purple=general, amber=war, yellow=capital,
 * emerald=donations, sky=members, rose=danger).
 *
 * See docs/ui-redesign-implementation-plan.md §3.3 for the spec.
 */

import { type ReactNode } from "react";

type Accent = "purple" | "amber" | "yellow" | "emerald" | "sky" | "rose";

const ACCENT_BORDER: Record<Accent, string> = {
  purple: "border-t-2 border-t-umbra-purple/30",
  amber: "border-t-2 border-t-amber-400/30",
  yellow: "border-t-2 border-t-yellow-400/30",
  emerald: "border-t-2 border-t-emerald-400/30",
  sky: "border-t-2 border-t-sky-400/30",
  rose: "border-t-2 border-t-rose-400/30",
};

export function Panel({
  children,
  accent,
  className,
}: {
  children: ReactNode;
  accent?: Accent;
  className?: string;
}) {
  const classes = [
    "panel",
    accent ? ACCENT_BORDER[accent] : "",
    "transition hover:border-umbra-line/40",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <section className={classes}>{children}</section>;
}

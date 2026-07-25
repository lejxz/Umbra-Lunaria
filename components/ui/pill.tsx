/**
 * Pill — the unified status/badge pill component.
 *
 * Replaces various inline badge/pill styles. Five tones covering all
 * use cases: purple (primary), amber (warning), emerald (success),
 * rose (danger), muted (neutral).
 *
 * See docs/ui-redesign-implementation-plan.md §3.5 for the spec.
 */

import { type ReactNode } from "react";

type Tone = "purple" | "amber" | "emerald" | "rose" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  purple: "border-umbra-purple/40 bg-umbra-purple/10 text-umbra-purple",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  rose: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  muted: "border-umbra-line bg-umbra-surface/40 text-umbra-muted",
};

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider",
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

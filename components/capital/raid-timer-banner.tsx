"use client";

/**
 * RaidTimerBanner — a live countdown banner shown on the Capital page.
 *
 * Two states:
 *   - inProgress: "Raid weekend — In progress — Ends in [countdown]"
 *   - next: "Next raid — Starts in [countdown]"
 *
 * The capital page's `getRaidTimer()` live-fetches the latest raid season
 * from the CoC API (ISR-cached at 5 min). When a raid is in progress, the
 * banner counts down to `endTime`. When no raid is active, it counts down
 * to the estimated next start (last season's start + 7 days).
 *
 * The countdown uses the shared `LiveCountdown` component (clock-drift
 * corrected via `serverNow`).
 */

import { LiveCountdown } from "@/components/ui/live-countdown";
import { IconCapital, IconClock } from "@/components/ui/icons";
import type { RaidTimer } from "@/lib/view-models/capital";

export function RaidTimerBanner({
  timer,
  serverNow,
}: {
  timer: RaidTimer;
  /** Server's current time in ms — for clock-drift-tolerant countdown. */
  serverNow?: number;
}) {
  const isInProgress = timer.state === "inProgress";

  // The target we're counting down to: endTime if in progress, startTime if next.
  const target = isInProgress ? timer.endTime : timer.startTime;

  // Label for what we're counting down to.
  const label = isInProgress ? "Ends in" : "Starts in";

  // Format the target time for the "ends/starts at" label.
  const atLabel = target.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Accent: amber for "in progress", purple for "next raid".
  const iconBg = isInProgress
    ? "bg-umbra-purple/[.06] text-umbra-purple shadow-glow-sm"
    : "bg-amber-400/10 text-amber-300";
  const titleColor = isInProgress ? "text-umbra-moonlight" : "text-amber-300";
  const eyebrow = isInProgress ? "Raid weekend" : "Next raid";
  const title = isInProgress ? "In progress" : "Coming up";
  // The pulsing status dot: green (good) when a raid is live, amber (warn) otherwise.
  const statusDot = isInProgress ? "bg-emerald-400" : "bg-amber-400";

  return (
    <section
      className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4 sm:p-5"
      aria-label={isInProgress ? "Raid weekend in progress" : "Next raid weekend"}
    >
      <span className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full border border-umbra-line ${iconBg}`}>
          <IconCapital className="h-5 w-5" />
        </span>
        <span>
          <span className="flex items-center gap-2 font-mono text-label font-semibold uppercase tracking-[.16em] text-umbra-purple">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot} animate-pulse-soft`}
              aria-hidden
            />
            {eyebrow}
          </span>
          <span className={`block font-display text-lg ${titleColor}`}>
            {title}
          </span>
        </span>
      </span>

      <div className="ml-auto flex items-center gap-4">
        <div className="lunar-tile flex items-center gap-2 px-4 py-2">
          <IconClock className="h-4 w-4 text-umbra-purple" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-wider text-umbra-faint">
            {label}
          </span>
          <span className="font-mono text-lg text-umbra-moonlight">
            <LiveCountdown targetDate={target} serverNow={serverNow} />
          </span>
        </div>
        <span className="hidden font-mono text-2xs uppercase tracking-wider text-umbra-faint sm:block">
          {isInProgress ? "ends" : "starts"} {atLabel}
        </span>
      </div>
    </section>
  );
}

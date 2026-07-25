"use client";

/**
 * RaidTimerBanner — a live countdown banner shown when a Capital raid weekend
 * is in progress.
 *
 * The capital page's `getRaidTimer()` live-fetches the latest raid season from
 * the CoC API (ISR-cached at 5 min). When `state === "inProgress"`, this banner
 * shows a countdown to `endTime`. The countdown ticks live via the shared
 * `LiveCountdown` component (same one the war hero uses).
 *
 * Graceful absence: when no raid is in progress, the capital page simply
 * doesn't render this banner — no empty state needed.
 */

import { LiveCountdown } from "@/components/ui/live-countdown";
import { IconCapital, IconClock } from "@/components/ui/icons";

export function RaidTimerBanner({
  endTime,
  serverNow,
}: {
  endTime: Date;
  /** Server's current time in ms — for clock-drift-tolerant countdown. */
  serverNow?: number;
}) {
  // Format the end time for the "ends at" label.
  const endsAt = endTime.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <section
      className="glass flex flex-wrap items-center gap-4 rounded-2xl border-umbra-purple/30 p-4 sm:p-5"
      aria-label="Raid weekend in progress"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-umbra-purple/15 text-umbra-purple">
          <IconCapital className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Raid weekend
          </span>
          <span className="block font-display text-lg text-umbra-lilac">
            In progress
          </span>
        </span>
      </span>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-umbra-line bg-umbra-ink/50 px-4 py-2">
          <IconClock className="h-4 w-4 text-umbra-purple" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-wider text-umbra-muted">
            Ends in
          </span>
          <span className="font-display text-lg text-umbra-lilac">
            <LiveCountdown targetDate={endTime} serverNow={serverNow} />
          </span>
        </div>
        <span className="hidden font-mono text-xs text-umbra-muted sm:block">
          ends {endsAt}
        </span>
      </div>
    </section>
  );
}

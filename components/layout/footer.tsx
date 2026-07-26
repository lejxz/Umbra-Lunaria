"use client";

/**
 * Footer — the global freshness footer shown on every page.
 *
 * Previously this lived as a bordered "FreshnessFooter" card at the bottom of
 * the dashboard only. It is now a real page footer (top-border strip) rendered
 * in app/layout.tsx so every route shares the same poll-status line.
 *
 * Shows: last poll, daily batch, tracking start, war synced, and a live
 * countdown to the next expected 5-minute poll. Clock-drift tolerant via
 * useServerClock. Auto-refreshes the page once when a poll becomes overdue.
 */

import { useEffect, useState } from "react";
import { useServerClock } from "@/lib/time/use-server-clock";

const POLL_INTERVAL_MINUTES = 5;

export type FooterPollStatuses = {
  lastPoll: Date | string | null;
  lastBatch: Date | string | null;
  trackingStart: Date | string | null;
  warSynced: Date | string | null;
};

export function Footer({
  statuses,
  serverNow,
}: {
  statuses: FooterPollStatuses;
  /** Server's current time in ms (from the server component at render time). */
  serverNow: number;
}) {
  const { lastPoll, lastBatch, trackingStart, warSynced } = statuses;
  const { serverNow: getServerNow, mounted } = useServerClock(serverNow);
  const [tick, setTick] = useState(0);

  // Re-render every second for the countdown.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  void tick;

  const now = mounted ? getServerNow() : serverNow;

  const lastPollDate = lastPoll ? new Date(lastPoll) : null;
  const nextPollDate = lastPollDate
    ? new Date(lastPollDate.getTime() + POLL_INTERVAL_MINUTES * 60 * 1000)
    : null;
  const msUntilNext = nextPollDate ? nextPollDate.getTime() - now : null;
  const isOverdue = msUntilNext !== null && msUntilNext < 0;

  // Auto-refresh once when >5s overdue (guards against loops via sessionStorage).
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (msUntilNext !== null && msUntilNext < -5000 && !reloading) {
      const attemptKey = `reloaded_${lastPoll}`;
      if (sessionStorage.getItem(attemptKey)) return;
      setReloading(true);
      sessionStorage.setItem(attemptKey, "true");
      window.location.reload();
    }
  }, [msUntilNext, reloading, lastPoll]);

  const countdownText = (() => {
    if (reloading) return "refreshing...";
    if (msUntilNext === null) return "—";
    if (isOverdue) return "overdue";
    const totalSeconds = Math.floor(msUntilNext / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  })();

  const fmt = (d: Date | string | null) =>
    d && mounted
      ? new Date(d).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        })
      : "—";

  return (
    <footer className="mt-auto border-t border-umbra-line bg-umbra-ink/60 px-5 py-3 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        <Chip label="Last update" value={fmt(lastPoll)} />
        <Chip label="Daily batch" value={fmt(lastBatch)} />
        <Chip label="Tracking" value={fmt(trackingStart)} />
        <Chip label="War synced" value={fmt(warSynced)} />
        {/* Next poll countdown */}
        <div className="flex items-center gap-1.5 border-l border-umbra-line/50 pl-5">
          <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
            Next update
          </span>
          <span
            className={`font-mono text-label font-bold ${
              isOverdue
                ? "text-amber-400"
                : msUntilNext !== null && msUntilNext < 60000
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
            suppressHydrationWarning
          >
            {mounted ? countdownText : "—"}
          </span>
        </div>
      </div>
    </footer>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span
        className="font-mono text-label text-umbra-lilac"
        suppressHydrationWarning
      >
        {value}
      </span>
    </div>
  );
}

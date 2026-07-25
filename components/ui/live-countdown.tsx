"use client";

import { useEffect, useState } from "react";
import { useServerClock } from "@/lib/time/use-server-clock";

/**
 * A live countdown timer that accurately updates every second.
 * Given a target UTC Date string, it computes the remaining hours, minutes,
 * and seconds.
 *
 * Clock-drift tolerant: when `serverNow` is passed, the countdown uses the
 * server's current time (adjusted for the client's clock offset) instead of
 * `Date.now()`. This prevents a wrong client clock (e.g. a school lab PC set
 * to the wrong date) from producing a wrong countdown. See
 * lib/time/use-server-clock.ts.
 */
export function LiveCountdown({
  targetDate,
  serverNow,
}: {
  targetDate: string | Date;
  /** Optional server timestamp (ms) for clock-drift tolerance. When omitted,
   * falls back to the client's Date.now() (the legacy behavior). */
  serverNow?: number;
}) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { serverNow: getServerNow, mounted } = useServerClock(serverNow ?? Date.now());

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      // Use server-adjusted time when available; fall back to Date.now()
      // before mount (SSR / first paint) to avoid hydration mismatch.
      const now = mounted && serverNow !== undefined ? getServerNow() : Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("00h 00m 00s");
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s
          .toString()
          .padStart(2, "0")}s`,
      );
    };

    // Initial run
    updateTimer();

    // Setup interval
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, mounted]);

  if (!timeLeft) {
    return <span className="font-mono tabular-nums opacity-0">00h 00m 00s</span>; // Prevents layout shift
  }

  return <span className="font-mono tabular-nums">{timeLeft}</span>;
}

"use client";

import { useEffect, useState } from "react";

/**
 * A live countdown timer that accurately updates every second.
 * Given a target UTC Date string, it computes the remaining hours, minutes, and seconds.
 */
export function LiveCountdown({ targetDate }: { targetDate: string | Date }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = Date.now();
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
  }, [targetDate]);

  if (!timeLeft) {
    return <span className="font-mono tabular-nums opacity-0">00h 00m 00s</span>; // Prevents layout shift
  }

  return <span className="font-mono tabular-nums">{timeLeft}</span>;
}

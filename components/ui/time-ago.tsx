"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a relative time like "3m ago" and refreshes every 30s while mounted.
 * Falls back to an exact timestamp string. See concept/05-dashboard.md.
 */
export function TimeAgo({ date }: { date: Date | string }) {
  const iso = new Date(date).toISOString();
  const [text, setText] = useState(formatRelative(date));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Re-render every 30s so "3m ago" becomes "4m ago" without a page refresh.
    timerRef.current = setInterval(() => {
      setText(formatRelative(date));
    }, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [date]);

  return (
    <time 
      dateTime={iso} 
      title={mounted ? new Date(date).toLocaleString() : ""}
      suppressHydrationWarning
    >
      {mounted ? text : formatRelative(date)}
    </time>
  );
}

function formatRelative(date: Date | string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

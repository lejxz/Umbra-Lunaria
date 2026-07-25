"use client";

import { useEffect, useState } from "react";

/**
 * useServerClock — a clock-drift-tolerant time hook.
 *
 * Problem: if the user's PC clock is wrong (e.g. a school lab PC set to the
 * wrong date), `Date.now()` on the client is wrong, and every countdown /
 * "overdue" calculation breaks. The freshness footer would show "overdue" even
 * when the last poll was seconds ago, or show a fresh countdown when the poll
 * is actually hours stale.
 *
 * Fix: the server passes its current timestamp (`serverNowMs`) to the client.
 * On mount, the hook computes the offset between server time and client time:
 *
 *   drift = serverNowMs - clientNowMs
 *
 * Then `serverNow()` returns `Date.now() + drift` — the server's best estimate
 * of the real current time, updated live. All time-based calculations should
 * use `serverNow()` instead of `Date.now()`.
 *
 * The drift is computed once on mount and never re-computed (the server time
 * is a snapshot from page render). This is correct because the offset between
 * two clocks is approximately constant over a page session — the only thing
 * that changes is elapsed wall time, which `Date.now()` still tracks correctly
 * (clock *drift rate* is negligible over minutes; only the absolute offset is
 * wrong).
 *
 * @param serverNowMs — the server's current time in ms (passed as a prop from
 *   the server component). Pass `Date.now()` from the server at render time.
 */
export function useServerClock(serverNowMs: number) {
  // The drift between server and client clocks, computed once on mount.
  // Before mount (SSR / first paint), drift is 0 — the countdown shows the
  // server time directly, which is correct at render time.
  const [drift, setDrift] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clientNow = Date.now();
    setDrift(serverNowMs - clientNow);
  }, [serverNowMs]);

  return {
    /** The server's best estimate of the real current time, in ms. */
    serverNow: () => Date.now() + drift,
    mounted,
    /** The drift in ms (positive = client clock is behind server; negative = ahead). */
    drift,
  };
}

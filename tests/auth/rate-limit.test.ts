import { describe, it, expect } from "vitest";
import { checkRateLimit, LOGIN_RATE_LIMIT } from "@/lib/auth/rate-limit";

/**
 * Tests for the login rate limiter.
 *
 * The limiter is a pure function — `nowMs` is injected so tests control time
 * without `setTimeout`. Covers the "rate-limit behavior" checkbox in
 * concept/12 Step 2.0.
 */
describe("checkRateLimit", () => {
  it("allows attempts up to the limit", () => {
    const buckets = new Map();
    const opts = { windowMs: 1000, maxAttempts: 3 };

    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit({ buckets, identifier: "ip1", nowMs: i * 100, options: opts });
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks the attempt that exceeds the limit", () => {
    const buckets = new Map();
    const opts = { windowMs: 1000, maxAttempts: 3 };

    for (let i = 0; i < 3; i++) {
      checkRateLimit({ buckets, identifier: "ip1", nowMs: i * 100, options: opts });
    }
    const r = checkRateLimit({ buckets, identifier: "ip1", nowMs: 300, options: opts });
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("reports retry-after based on the oldest in-window attempt", () => {
    const buckets = new Map();
    const opts = { windowMs: 1000, maxAttempts: 2 };

    checkRateLimit({ buckets, identifier: "ip1", nowMs: 0, options: opts });
    checkRateLimit({ buckets, identifier: "ip1", nowMs: 100, options: opts });
    const r = checkRateLimit({ buckets, identifier: "ip1", nowMs: 200, options: opts });

    expect(r.allowed).toBe(false);
    // Oldest attempt at t=0, window=1000 → expires at t=1000, now=200.
    expect(r.retryAfterMs).toBe(800);
  });

  it("resets after the window expires", () => {
    const buckets = new Map();
    const opts = { windowMs: 1000, maxAttempts: 2 };

    checkRateLimit({ buckets, identifier: "ip1", nowMs: 0, options: opts });
    checkRateLimit({ buckets, identifier: "ip1", nowMs: 100, options: opts });
    // Beyond the window — the t=0 attempt has expired.
    const r = checkRateLimit({ buckets, identifier: "ip1", nowMs: 1100, options: opts });
    expect(r.allowed).toBe(true);
  });

  it("tracks identifiers independently", () => {
    const buckets = new Map();
    const opts = { windowMs: 1000, maxAttempts: 2 };

    checkRateLimit({ buckets, identifier: "ip1", nowMs: 0, options: opts });
    checkRateLimit({ buckets, identifier: "ip1", nowMs: 0, options: opts });

    const blocked = checkRateLimit({ buckets, identifier: "ip1", nowMs: 0, options: opts });
    const other = checkRateLimit({ buckets, identifier: "ip2", nowMs: 0, options: opts });

    expect(blocked.allowed).toBe(false);
    expect(other.allowed).toBe(true);
  });

  it("exposes sane defaults for the login route", () => {
    expect(LOGIN_RATE_LIMIT.windowMs).toBe(10 * 60 * 1000);
    expect(LOGIN_RATE_LIMIT.maxAttempts).toBe(10);
  });
});

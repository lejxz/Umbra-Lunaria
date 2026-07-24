/**
 * In-memory login rate limiter.
 *
 * Phase 2 (concept/12 Step 2.0) requires "rate-limit behavior" on the admin
 * login route. This is a deliberately simple per-identifier limiter using a
 * sliding window. It is NOT distributed — Vercel serverless functions are
 * stateless across invocations, so this only throttles bursts within a single
 * warm instance. That is sufficient to slow down credential-stuffing within
 * a hot instance; a determined distributed attacker would need additional
 * infrastructure (e.g. Upstash Redis) which is out of Phase 2 scope.
 *
 * The logic is extracted as a pure function so it can be unit-tested without
 * a running server (see tests/auth/rate-limit.test.ts).
 */

/** A single failed-attempt window for one identifier. */
interface Bucket {
  /** Timestamps (ms) of attempts within the window. */
  attempts: number[];
}

export interface RateLimiterOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max attempts allowed within the window before throttling kicks in. */
  maxAttempts: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed through. */
  allowed: boolean;
  /** Attempts remaining within the current window (0 when blocked). */
  remaining: number;
  /** Milliseconds until the oldest attempt expires (retry-after hint). */
  retryAfterMs: number;
}

/**
 * A pure, time-injectable rate limiter. `nowMs` is passed in so tests can
 * control time without `setTimeout`.
 *
 * Usage: the caller maintains a `Map<string, Bucket>` and passes it in. The
 * function mutates the map (prunes expired windows and records the new
 * attempt when allowed) and returns the decision.
 */
export function checkRateLimit(args: {
  buckets: Map<string, Bucket>;
  identifier: string;
  nowMs: number;
  options: RateLimiterOptions;
}): RateLimitResult {
  const { buckets, identifier, nowMs, options } = args;
  const windowStart = nowMs - options.windowMs;

  const existing = buckets.get(identifier);
  // Keep only attempts within the active window.
  const inWindow = existing
    ? existing.attempts.filter((t) => t > windowStart)
    : [];

  if (inWindow.length >= options.maxAttempts) {
    // Blocked. The retry-after is until the oldest in-window attempt expires.
    const oldest = Math.min(...inWindow);
    const retryAfterMs = oldest + options.windowMs - nowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Allowed — record this attempt.
  inWindow.push(nowMs);
  buckets.set(identifier, { attempts: inWindow });
  return {
    allowed: true,
    remaining: Math.max(0, options.maxAttempts - inWindow.length),
    retryAfterMs: 0,
  };
}

/**
 * Default options for the admin login route. 10 attempts per 10 minutes per
 * identifier — generous enough for a forgetful single admin, tight enough to
 * blunt brute force within a warm instance.
 */
export const LOGIN_RATE_LIMIT: RateLimiterOptions = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 10,
};

// A module-level store for the login route. State is lost when the serverless
// instance cold-starts, which is acceptable (see file doc comment).
const loginBuckets = new Map<string, Bucket>();

/**
 * Convenience wrapper used by the login route. Uses the module-level bucket
 * store and the default login options. Returns the decision for the given
 * identifier (typically the client IP).
 */
export function checkLoginRateLimit(
  identifier: string,
  now: Date = new Date(),
): RateLimitResult {
  return checkRateLimit({
    buckets: loginBuckets,
    identifier,
    nowMs: now.getTime(),
    options: LOGIN_RATE_LIMIT,
  });
}

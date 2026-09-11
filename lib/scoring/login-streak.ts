/**
 * Login-streak computation — pure functions shared by the Hall of Fame
 * "dedicated" award (lib/db/records-updater.ts) and unit tests.
 *
 * Extracted from records-updater.ts per docs/2026-09-10 assessment §8:
 * the streak algorithm lived inside a DB-coupled function with no test
 * coverage, which is exactly where the B-1 timezone bug hid for weeks —
 * continuity was measured in raw UTC milliseconds with a 1.5-day tolerance
 * instead of clan-timezone calendar days.
 *
 * Day identity is defined by the CLAN TIMEZONE (see lib/time/windows.ts),
 * matching the checkpoint login-day dedup (fix B-7).
 */

import {
  diffCalendarDaysInClanTz,
  isSameDayInClanTz,
} from "@/lib/time/windows";

/**
 * Reduce an unordered list of login timestamps to one representative instant
 * per distinct clan-timezone calendar day (the earliest seen per day —
 * order-independent so callers don't need to pre-sort).
 */
export function dedupeClanTzDays(timestamps: readonly Date[]): Date[] {
  const uniqueDays: Date[] = [];
  for (const ts of timestamps) {
    if (!uniqueDays.some((d) => isSameDayInClanTz(d, ts))) {
      uniqueDays.push(ts);
    }
  }
  return uniqueDays.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Longest run of CONSECUTIVE clan-timezone calendar days with a login.
 *
 * Continuity is exactly "adjacent calendar days in the clan timezone" —
 * a Mon 23:55 Manila login followed by Wed 00:05 Manila is a broken streak
 * (Tuesday was missed), and two logins either side of Manila midnight are
 * two distinct days even when less than 24h apart in UTC.
 *
 * Returns 0 for an empty list.
 */
export function longestClanTzDayStreak(timestamps: readonly Date[]): number {
  if (timestamps.length === 0) return 0;

  const uniqueDays = dedupeClanTzDays(timestamps);
  if (uniqueDays.length === 0) return 0;

  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = uniqueDays[i - 1];
    const curr = uniqueDays[i];
    if (!prev || !curr) continue; // satisfies noUncheckedIndexedAccess
    const diffDays = diffCalendarDaysInClanTz(prev, curr);
    if (diffDays === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      // 0 is impossible after the same-day dedup above (defensive);
      // anything ≥ 2 breaks the streak.
      streak = 1;
    }
  }
  return maxStreak;
}

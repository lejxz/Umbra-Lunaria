import { describe, it, expect } from "vitest";
import {
  computeWindow,
  generateBuckets,
  formatInTimezone,
  startOfDayInClanTz,
  isSameDayInClanTz,
  clanTzDayKey,
  diffCalendarDaysInClanTz,
} from "@/lib/time/windows";

/**
 * Tests for the timezone-aware window functions in lib/time/windows.ts
 * (docs/concept/04-activity-tracking-and-polling.md):
 *
 *   - computeWindow: exact, clan-tz-anchored windows (fix B-6 — the 24h window
 *     is exactly 24h ending at the top of the current hour; 7d/30d windows
 *     start at clan-timezone midnight).
 *   - generateBuckets: 24 hourly buckets for "24h", N daily buckets for "7d"/"30d".
 *   - formatInTimezone: Intl-based formatting in the clan timezone.
 *   - startOfDayInClanTz / isSameDayInClanTz / clanTzDayKey /
 *     diffCalendarDaysInClanTz: clan-calendar-day primitives.
 *
 * Manila ("Asia/Manila") is UTC+8 year-round (no DST), which makes the
 * expected values deterministic.
 */

const MANILA_TZ = "Asia/Manila";
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// ---------------------------------------------------------------------------
// computeWindow — "24h"
// ---------------------------------------------------------------------------

describe("computeWindow — 24h (fix B-6)", () => {
  it("spans EXACTLY 24 hours, even for an off-the-hour `now`", () => {
    // 12:34:56 UTC — the old bug stretched this window to 24h34m56s.
    const win = computeWindow("24h", new Date("2026-01-15T12:34:56Z"));
    expect(win.to.getTime() - win.from.getTime()).toBe(MS_PER_DAY);
  });

  it("boundaries land on the top of the hour (clean axis labels)", () => {
    const now = new Date("2026-01-15T12:34:56Z");
    const win = computeWindow("24h", now);
    for (const bound of [win.from, win.to]) {
      expect(bound.getUTCMinutes()).toBe(0);
      expect(bound.getUTCSeconds()).toBe(0);
      expect(bound.getUTCMilliseconds()).toBe(0);
    }
  });

  it("`to` is the next hour boundary — the current partial hour is the in-progress bucket", () => {
    const now = new Date("2026-01-15T12:34:56Z");
    const win = computeWindow("24h", now);
    expect(win.to.toISOString()).toBe("2026-01-15T13:00:00.000Z");
    expect(win.from.toISOString()).toBe("2026-01-14T13:00:00.000Z");
  });

  it("an on-the-hour `now` keeps to === now", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const win = computeWindow("24h", now);
    expect(win.to).toEqual(now);
    expect(win.from.toISOString()).toBe("2026-01-14T12:00:00.000Z");
  });

  it("no hourly bucket stretches beyond 1h (was up to ~2h pre-fix)", () => {
    const now = new Date("2026-01-15T12:59:59Z");
    const win = computeWindow("24h", now);
    const buckets = generateBuckets(win, MANILA_TZ);
    expect(buckets).toHaveLength(24);
    // First 23 buckets are exactly 1h apart; the last bucket ends at win.to
    // (the next hour boundary), so it covers at most 1 in-progress hour.
    for (let i = 1; i < buckets.length; i++) {
      expect(
        buckets[i]!.timestamp.getTime() - buckets[i - 1]!.timestamp.getTime(),
      ).toBe(MS_PER_HOUR);
    }
    expect(win.to.getTime() - buckets[23]!.timestamp.getTime()).toBe(MS_PER_HOUR);
  });
});

// ---------------------------------------------------------------------------
// computeWindow — "7d" / "30d" (clan-midnight anchoring, fix B-6)
// ---------------------------------------------------------------------------

describe("computeWindow — 7d/30d (clan-midnight anchor, fix B-6)", () => {
  it("7d window starts at clan-timezone midnight, 6 days back", () => {
    // 12:00 UTC Jan 15 = 20:00 Manila Jan 15. Today's Manila midnight =
    // Jan 14 16:00 UTC. Six days further back = Jan 8 16:00 UTC.
    const now = new Date("2026-01-15T12:00:00Z");
    const win = computeWindow("7d", now);
    expect(win.from.toISOString()).toBe("2026-01-08T16:00:00.000Z");
    expect(win.to).toEqual(now);
    // `from` is exactly a Manila midnight.
    expect(win.from.getTime()).toBe(startOfDayInClanTz(win.from).getTime());
  });

  it("7d window span is between 6 and 7 days (6 full days + today so far)", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const span = computeWindow("7d", now).to.getTime() - computeWindow("7d", now).from.getTime();
    expect(span).toBeGreaterThanOrEqual(6 * MS_PER_DAY);
    expect(span).toBeLessThanOrEqual(7 * MS_PER_DAY);
  });

  it("donations after Manila midnight land in TODAY's bucket, not yesterday's", () => {
    // The pre-fix window anchored at "now - 7d" (12:00 UTC), so a donation at
    // 01:00 Manila (17:00 UTC the previous day) fell into the previous day's
    // bucket even though it happened "today" in clan time.
    const now = new Date("2026-01-15T12:00:00Z");
    const win = computeWindow("7d", now);
    const buckets = generateBuckets(win, MANILA_TZ);
    expect(buckets).toHaveLength(7);
    // Every bucket starts exactly at a Manila midnight…
    for (const b of buckets) {
      expect(b.timestamp.getTime()).toBe(startOfDayInClanTz(b.timestamp).getTime());
    }
    // …and the last bucket IS today's Manila midnight.
    expect(buckets[6]!.timestamp.getTime()).toBe(startOfDayInClanTz(now).getTime());
  });

  it("30d window starts at clan midnight, 29 days back, with 30 midnight buckets", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const win = computeWindow("30d", now);
    expect(win.from.toISOString()).toBe("2025-12-16T16:00:00.000Z");
    const buckets = generateBuckets(win, MANILA_TZ);
    expect(buckets).toHaveLength(30);
    for (const b of buckets) {
      expect(b.timestamp.getTime()).toBe(startOfDayInClanTz(b.timestamp).getTime());
    }
  });

  it("does not mutate the caller's `now` Date", () => {
    const nowCopy = new Date("2026-01-15T12:00:00Z");
    computeWindow("24h", nowCopy);
    computeWindow("7d", nowCopy);
    computeWindow("30d", nowCopy);
    expect(nowCopy.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// generateBuckets — labels
// ---------------------------------------------------------------------------

describe("generateBuckets — labels", () => {
  it("24h window yields exactly 24 buckets with HH:mm labels", () => {
    const win = computeWindow("24h", new Date("2026-01-15T12:34:56Z"));
    const buckets = generateBuckets(win, MANILA_TZ);

    expect(buckets).toHaveLength(24);
    for (const b of buckets) {
      // HH:mm = two digits, colon, two digits (e.g. "08:30", "14:05").
      expect(b.label).toMatch(/^\d{2}:\d{2}$/);
      expect(b.timestamp).toBeInstanceOf(Date);
    }
  });

  it("7d window yields exactly 7 buckets with weekday-short labels (Mon/Tue/...)", () => {
    const win = computeWindow("7d", new Date("2026-01-15T12:00:00Z"));
    const buckets = generateBuckets(win, MANILA_TZ);

    expect(buckets).toHaveLength(7);
    const validWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const b of buckets) {
      expect(validWeekdays).toContain(b.label);
    }
  });

  it("30d window yields exactly 30 buckets with MMM d labels", () => {
    const win = computeWindow("30d", new Date("2026-01-15T12:00:00Z"));
    const buckets = generateBuckets(win, MANILA_TZ);

    expect(buckets).toHaveLength(30);
    for (const b of buckets) {
      expect(b.label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// formatInTimezone
// ---------------------------------------------------------------------------

describe("formatInTimezone", () => {
  // 2026-01-15T00:00:00Z = 2026-01-15T08:00:00 Manila.
  // 2026-01-15 is a Thursday.
  const utcInstant = new Date("2026-01-15T00:00:00Z");

  it("formats HH:mm in the given timezone", () => {
    expect(formatInTimezone(utcInstant, MANILA_TZ, "HH:mm")).toBe("08:00");
  });

  it("formats EEE (weekday short) in the given timezone", () => {
    expect(formatInTimezone(utcInstant, MANILA_TZ, "EEE")).toBe("Thu");
  });

  it("formats MMM d in the given timezone", () => {
    expect(formatInTimezone(utcInstant, MANILA_TZ, "MMM d")).toBe("Jan 15");
  });

  it("respects the timezone offset (UTC+8 for Manila)", () => {
    // 23:00 UTC on Jan 15 = 07:00 Manila on Jan 16.
    const lateUtc = new Date("2026-01-15T23:00:00Z");
    expect(formatInTimezone(lateUtc, MANILA_TZ, "HH:mm")).toBe("07:00");
    expect(formatInTimezone(lateUtc, MANILA_TZ, "MMM d")).toBe("Jan 16");
    // Friday, not Thursday.
    expect(formatInTimezone(lateUtc, MANILA_TZ, "EEE")).toBe("Fri");
  });
});

// ---------------------------------------------------------------------------
// startOfDayInClanTz
// ---------------------------------------------------------------------------

describe("startOfDayInClanTz", () => {
  it("returns the UTC instant of midnight in Manila for an in-day timestamp", () => {
    // 2026-01-15T10:30:00Z = 2026-01-15T18:30:00 Manila.
    // Midnight Manila on 2026-01-15 = 2026-01-14T16:00:00Z.
    const input = new Date("2026-01-15T10:30:00Z");
    const result = startOfDayInClanTz(input);
    expect(result).toEqual(new Date("2026-01-14T16:00:00Z"));
  });

  it("handles timestamps near Manila midnight (rolls forward to next Manila day)", () => {
    // 2026-01-15T16:30:00Z = 2026-01-16T00:30:00 Manila.
    // Midnight Manila on 2026-01-16 = 2026-01-15T16:00:00Z.
    const input = new Date("2026-01-15T16:30:00Z");
    const result = startOfDayInClanTz(input);
    expect(result).toEqual(new Date("2026-01-15T16:00:00Z"));
  });

  it("returns midnight Manila even when the input is exactly at Manila midnight", () => {
    // 2026-01-15T16:00:00Z IS 2026-01-16T00:00:00 Manila.
    // Midnight Manila for that Manila day = 2026-01-15T16:00:00Z.
    const input = new Date("2026-01-15T16:00:00Z");
    const result = startOfDayInClanTz(input);
    expect(result).toEqual(new Date("2026-01-15T16:00:00Z"));
  });
});

// ---------------------------------------------------------------------------
// isSameDayInClanTz / clanTzDayKey (fix B-7)
// ---------------------------------------------------------------------------

describe("isSameDayInClanTz", () => {
  it("returns true for two timestamps on the same Manila day", () => {
    // 2026-01-15T00:00:00Z = 08:00 Manila Jan 15.
    // 2026-01-15T15:00:00Z = 23:00 Manila Jan 15.
    const a = new Date("2026-01-15T00:00:00Z");
    const b = new Date("2026-01-15T15:00:00Z");
    expect(isSameDayInClanTz(a, b)).toBe(true);
  });

  it("returns false for timestamps that straddle Manila midnight", () => {
    // a = 23:00 Manila on Jan 15 (15:00 UTC).
    // b = 01:00 Manila on Jan 16 (17:00 UTC).
    const a = new Date("2026-01-15T15:00:00Z");
    const b = new Date("2026-01-15T17:00:00Z");
    expect(isSameDayInClanTz(a, b)).toBe(false);
  });

  it("returns true for identical timestamps", () => {
    const a = new Date("2026-06-15T12:34:56Z");
    expect(isSameDayInClanTz(a, a)).toBe(true);
  });
});

describe("clanTzDayKey (fix B-7)", () => {
  it("keys by the Manila calendar day, not the UTC date slice", () => {
    // 2026-01-15T17:00:00Z = Jan 16, 01:00 Manila → key must be Jan 16.
    expect(clanTzDayKey(new Date("2026-01-15T17:00:00Z"))).toBe("2026-01-16");
    // 2026-01-15T15:59:00Z = Jan 15, 23:59 Manila → key must be Jan 15.
    expect(clanTzDayKey(new Date("2026-01-15T15:59:00Z"))).toBe("2026-01-15");
  });

  it("agrees with isSameDayInClanTz and the UTC slice only when the day matches", () => {
    // Same Manila day, different UTC dates: 15:00 UTC Jan 15 (23:00 Manila)
    // and 17:00 UTC Jan 15 (01:00 Manila Jan 16) differ in clan day.
    const a = new Date("2026-01-15T15:00:00Z");
    const b = new Date("2026-01-15T17:00:00Z");
    expect(clanTzDayKey(a) === clanTzDayKey(b)).toBe(isSameDayInClanTz(a, b));
    expect(clanTzDayKey(a) === clanTzDayKey(b)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// diffCalendarDaysInClanTz
// ---------------------------------------------------------------------------

describe("diffCalendarDaysInClanTz", () => {
  it("returns 1 for adjacent Manila calendar days (the streak continuity test)", () => {
    // Mon 23:55 Manila → Tue 00:05 Manila (10 min apart in UTC).
    const a = new Date("2026-01-12T15:55:00Z"); // Mon 23:55 Manila
    const b = new Date("2026-01-12T16:05:00Z"); // Tue 00:05 Manila
    expect(diffCalendarDaysInClanTz(a, b)).toBe(1);
  });

  it("returns 2 when a full Manila day is missed", () => {
    const a = new Date("2026-01-12T15:55:00Z"); // Mon 23:55 Manila
    const b = new Date("2026-01-13T16:05:00Z"); // Wed 00:05 Manila
    expect(diffCalendarDaysInClanTz(a, b)).toBe(2);
  });

  it("returns 0 for the same Manila day", () => {
    const a = new Date("2026-01-15T00:00:00Z");
    const b = new Date("2026-01-15T15:00:00Z");
    expect(diffCalendarDaysInClanTz(a, b)).toBe(0);
  });
});

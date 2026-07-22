import { describe, it, expect } from "vitest";
import {
  computeWindow,
  generateBuckets,
  formatInTimezone,
  startOfDayInClanTz,
  isSameDayInClanTz,
} from "@/lib/time/windows";

/**
 * Tests for the timezone-aware window functions in lib/time/windows.ts
 * (concept/04-activity-tracking-and-polling.md):
 *
 *   - computeWindow: subtracts 24h / 7d / 30d from `now` to build a TimeWindow.
 *   - generateBuckets: 24 hourly buckets for "24h", N daily buckets for "7d"/"30d".
 *   - formatInTimezone: Intl-based formatting in the clan timezone.
 *   - startOfDayInClanTz: returns the UTC instant of midnight in the clan TZ.
 *   - isSameDayInClanTz: compares two instants by clan-TZ calendar day.
 *
 * Manila ("Asia/Manila") is UTC+8 year-round (no DST), which makes the
 * expected values deterministic.
 */

const MANILA_TZ = "Asia/Manila";
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Tolerance for "approximately N ms". The implementation uses
// setUTCHours/setUTCDate which is exact, but the brief asks for a "few
// seconds" tolerance so the tests survive minor future rewrites.
const FEW_SECONDS_MS = 5_000;

// ---------------------------------------------------------------------------
// computeWindow
// ---------------------------------------------------------------------------

describe("computeWindow", () => {
  const now = new Date("2026-01-15T12:00:00Z");

  it("24h window spans ~24 hours (within a few seconds of 86_400_000ms)", () => {
    const win = computeWindow("24h", now);
    const diff = win.to.getTime() - win.from.getTime();

    expect(diff).toBeGreaterThanOrEqual(MS_PER_DAY - FEW_SECONDS_MS);
    expect(diff).toBeLessThanOrEqual(MS_PER_DAY + FEW_SECONDS_MS);
    expect(win.kind).toBe("24h");
    expect(win.to).toEqual(now);
  });

  it("7d window spans ~7 days", () => {
    const win = computeWindow("7d", now);
    const diff = win.to.getTime() - win.from.getTime();
    const expected = 7 * MS_PER_DAY;

    expect(diff).toBeGreaterThanOrEqual(expected - FEW_SECONDS_MS);
    expect(diff).toBeLessThanOrEqual(expected + FEW_SECONDS_MS);
    expect(win.kind).toBe("7d");
  });

  it("30d window spans ~30 days", () => {
    const win = computeWindow("30d", now);
    const diff = win.to.getTime() - win.from.getTime();
    const expected = 30 * MS_PER_DAY;

    expect(diff).toBeGreaterThanOrEqual(expected - FEW_SECONDS_MS);
    expect(diff).toBeLessThanOrEqual(expected + FEW_SECONDS_MS);
    expect(win.kind).toBe("30d");
  });

  it("does not mutate the caller's `now` Date", () => {
    const nowCopy = new Date("2026-01-15T12:00:00Z");
    computeWindow("24h", nowCopy);
    // The original instant should be unchanged.
    expect(nowCopy.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// generateBuckets
// ---------------------------------------------------------------------------

describe("generateBuckets", () => {
  it("24h window yields exactly 24 buckets with HH:mm labels", () => {
    const win = computeWindow("24h", new Date("2026-01-15T12:00:00Z"));
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

  it("30d window yields exactly 30 buckets", () => {
    const win = computeWindow("30d", new Date("2026-01-15T12:00:00Z"));
    const buckets = generateBuckets(win, MANILA_TZ);

    expect(buckets).toHaveLength(30);
    // 30d labels are dates like "Jan 1", "Jan 2" — not weekday names, so
    // the chart axis doesn't look like it's only showing 7 days.
    for (const b of buckets) {
      // Should match "MMM d" format: 3-letter month + space + day number
      expect(b.label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    }
    // First bucket should be around Jan 16 (16 days before Jan 15 is Dec 30,
    // but 30 days before Jan 15 is Dec 16 — the label should contain a
    // valid month abbreviation).
    expect(buckets[0]?.label).toMatch(/^[A-Z][a-z]{2}/);
  });

  it("24h bucket timestamps are 1 hour apart and span the window", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    const win = computeWindow("24h", now);
    const buckets = generateBuckets(win, MANILA_TZ);

    // First bucket aligns with the window `from`.
    expect(buckets[0]?.timestamp.getTime()).toBe(win.from.getTime());
    // Each subsequent bucket is exactly 1 hour later.
    for (let i = 1; i < buckets.length; i++) {
      const prev = buckets[i - 1]?.timestamp.getTime();
      const curr = buckets[i]?.timestamp.getTime();
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect((curr as number) - (prev as number)).toBe(MS_PER_HOUR);
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
// isSameDayInClanTz
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

  it("returns false when the two instants are on different Manila months", () => {
    // a = Jan 31 23:00 Manila (Jan 31 15:00 UTC).
    // b = Feb 01 01:00 Manila (Jan 31 17:00 UTC).
    const a = new Date("2026-01-31T15:00:00Z");
    const b = new Date("2026-01-31T17:00:00Z");
    expect(isSameDayInClanTz(a, b)).toBe(false);
  });
});

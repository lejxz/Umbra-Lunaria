import { describe, it, expect } from "vitest";
import {
  longestClanTzDayStreak,
  dedupeClanTzDays,
} from "@/lib/scoring/login-streak";

/**
 * Tests for the extracted HoF "dedicated" streak algorithm
 * (docs/2026-09-10 assessment §8.1 / finding B-1).
 *
 * The algorithm lived untested inside lib/db/records-updater.ts, where the
 * original timezone bug hid: continuity was measured in raw UTC milliseconds
 * with a 1.5-day tolerance. These cases pin the Manila-boundary behavior the
 * old code got wrong.
 *
 * Manila ("Asia/Manila") is UTC+8 year-round — expected values deterministic.
 */

describe("longestClanTzDayStreak", () => {
  it("returns 0 for an empty list", () => {
    expect(longestClanTzDayStreak([])).toBe(0);
  });

  it("returns 1 for a single login", () => {
    expect(longestClanTzDayStreak([new Date("2026-01-15T12:00:00Z")])).toBe(1);
  });

  it("counts consecutive Manila calendar days", () => {
    const logins = [
      new Date("2026-01-13T04:00:00Z"), // Mon 12:00 Manila
      new Date("2026-01-14T04:00:00Z"), // Tue 12:00 Manila
      new Date("2026-01-15T04:00:00Z"), // Wed 12:00 Manila
    ];
    expect(longestClanTzDayStreak(logins)).toBe(3);
  });

  it("B-1 regression: Mon 23:55 Manila → Wed 00:05 Manila breaks the streak", () => {
    // ~24h10m UTC apart — the old 1.5-day UTC tolerance called this
    // "consecutive" despite Tuesday being missed.
    const logins = [
      new Date("2026-01-12T15:55:00Z"), // Mon 23:55 Manila
      new Date("2026-01-13T16:05:00Z"), // Wed 00:05 Manila (Tuesday missed)
    ];
    expect(longestClanTzDayStreak(logins)).toBe(1);
  });

  it("B-1 regression: logins either side of Manila midnight are two consecutive days", () => {
    // Only 10 minutes apart in UTC — the old UTC-ms logic collapsed them
    // into one day (or required the 1.5-day tolerance to bridge them).
    const logins = [
      new Date("2026-01-12T15:55:00Z"), // Mon 23:55 Manila
      new Date("2026-01-12T16:05:00Z"), // Tue 00:05 Manila
    ];
    expect(longestClanTzDayStreak(logins)).toBe(2);
  });

  it("collapses multiple logins on the same Manila day into one", () => {
    const logins = [
      new Date("2026-01-13T00:00:00Z"), // Mon 08:00 Manila
      new Date("2026-01-13T12:00:00Z"), // Mon 20:00 Manila
      new Date("2026-01-13T15:30:00Z"), // Mon 23:30 Manila
      new Date("2026-01-14T01:00:00Z"), // Tue 09:00 Manila
    ];
    expect(longestClanTzDayStreak(logins)).toBe(2);
  });

  it("a UTC-date-slice dedup would miscount boundary logins (B-7 consistency)", () => {
    // 15:55 UTC Jan 12 and 16:05 UTC Jan 12 are the SAME UTC date but
    // DIFFERENT Manila days — the checkpoint dedup (fix B-7) and this
    // streak now agree on that.
    const logins = [
      new Date("2026-01-12T15:55:00Z"),
      new Date("2026-01-12T16:05:00Z"),
      new Date("2026-01-13T16:05:00Z"), // Wed 00:05 Manila
    ];
    // Manila days: Mon, Tue, Wed → streak 3. (A UTC slice would see
    // "Jan 12, Jan 12, Jan 13" and compute 2.)
    expect(longestClanTzDayStreak(logins)).toBe(3);
  });

  it("finds the longest streak after a gap, not the last streak", () => {
    const logins = [
      new Date("2026-01-01T04:00:00Z"),
      new Date("2026-01-02T04:00:00Z"),
      new Date("2026-01-03T04:00:00Z"),
      new Date("2026-01-04T04:00:00Z"),
      new Date("2026-01-05T04:00:00Z"), // 5-day streak
      new Date("2026-01-10T04:00:00Z"), // gap
      new Date("2026-01-11T04:00:00Z"), // 2-day streak
    ];
    expect(longestClanTzDayStreak(logins)).toBe(5);
  });

  it("order-independent: accepts unsorted input", () => {
    const logins = [
      new Date("2026-01-15T04:00:00Z"),
      new Date("2026-01-13T04:00:00Z"),
      new Date("2026-01-14T04:00:00Z"),
    ];
    expect(longestClanTzDayStreak(logins)).toBe(3);
  });
});

describe("dedupeClanTzDays", () => {
  it("returns one representative instant per distinct Manila day, sorted", () => {
    const ts = [
      new Date("2026-01-14T04:00:00Z"), // Wed 12:00 Manila
      new Date("2026-01-12T15:55:00Z"), // Mon 23:55 Manila
      new Date("2026-01-12T00:00:00Z"), // Mon 08:00 Manila
      new Date("2026-01-12T16:05:00Z"), // Tue 00:05 Manila
    ];
    const days = dedupeClanTzDays(ts);
    expect(days).toHaveLength(3);
    // Each day is represented by its FIRST-SEEN instant (not earliest):
    // Monday by Mon 23:55, Tuesday by Tue 00:05, Wednesday by Wed 12:00.
    expect(days[0]!.getTime()).toBe(new Date("2026-01-12T15:55:00Z").getTime());
    expect(days[1]!.getTime()).toBe(new Date("2026-01-12T16:05:00Z").getTime());
    expect(days[2]!.getTime()).toBe(new Date("2026-01-14T04:00:00Z").getTime());
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeClanTzDays([])).toEqual([]);
  });
});

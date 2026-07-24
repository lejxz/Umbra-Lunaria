/**
 * Timezone-aware window calculations for dashboard analytics.
 *
 * See concept/04-activity-tracking-and-polling.md:
 *   "Time-window boundaries are calculated in the clan timezone, then queried
 *    as UTC timestamps."
 *
 * The clan timezone comes from clanConfig.timezone (e.g. "Asia/Manila"). Day
 * boundaries, week boundaries, and hour buckets are computed in that timezone,
 * then converted to absolute UTC instants for DB queries.
 */

import { clanConfig } from "@/config/clan.config";

export type WindowKind = "24h" | "7d" | "30d" | "all";

export interface TimeWindow {
  from: Date;
  to: Date;
  kind: WindowKind;
}

/**
 * Compute a time window ending at `now` (defaults to the current instant).
 * The boundary is wall-clock in the clan timezone — e.g. "last 24 hours" for
 * a 09:30 Manila call is 09:30 yesterday → 09:30 today in Manila, not the
 * raw UTC 24h offset.
 */
export function computeWindow(kind: WindowKind, now: Date = new Date()): TimeWindow {
  const to = now;
  const from = new Date(to);

  switch (kind) {
    case "24h":
      from.setUTCHours(from.getUTCHours() - 23);
      from.setUTCMinutes(0, 0, 0); // Snap to the top of the hour for clean axis labels
      break;
    case "7d":
      from.setUTCDate(from.getUTCDate() - 7);
      break;
    case "30d":
      from.setUTCDate(from.getUTCDate() - 30);
      break;
    case "all":
      from.setTime(0); // Epoch start
      break;
  }

  return { from, to, kind };
}

/**
 * Generate bucket timestamps for a time window.
 * - 24h → 24 hourly buckets
 * - 7d  → 7 daily buckets
 * - 30d → 30 daily buckets
 *
 * Bucket labels are formatted in the clan timezone so the chart axis shows
 * times the clan actually operates in.
 */
export function generateBuckets(
  window: TimeWindow,
  timezone: string = clanConfig.timezone,
): Array<{ label: string; timestamp: Date }> {
  const { kind, from } = window;
  const buckets: Array<{ label: string; timestamp: Date }> = [];

  if (kind === "24h") {
    // Hourly buckets — labels like "14:00"
    for (let i = 0; i < 24; i++) {
      const ts = new Date(from);
      ts.setUTCHours(from.getUTCHours() + i);
      buckets.push({
        label: formatInTimezone(ts, timezone, "HH:mm"),
        timestamp: ts,
      });
    }
  } else if (kind === "7d") {
    // 7-day buckets — labels like "Mon", "Tue" (weekday is readable for 7 bars)
    for (let i = 0; i < 7; i++) {
      const ts = new Date(from);
      ts.setUTCDate(from.getUTCDate() + i);
      buckets.push({
        label: formatInTimezone(ts, timezone, "EEE"),
        timestamp: ts,
      });
    }
  } else {
    // 30-day buckets — labels like "Jul 1", "Jul 2" (dates, not weekdays,
    // so the axis doesn't look like it's only showing 7 days)
    for (let i = 0; i < 30; i++) {
      const ts = new Date(from);
      ts.setUTCDate(from.getUTCDate() + i);
      buckets.push({
        label: formatInTimezone(ts, timezone, "MMM d"),
        timestamp: ts,
      });
    }
  }

  return buckets;
}

/**
 * Format a Date in a specific IANA timezone using Intl.DateTimeFormat.
 * Node supports full IANA timezone names via the ICU library.
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  pattern: "HH:mm" | "EEE" | "MMM d" | "full",
): string {
  const options: Intl.DateTimeFormatOptions =
    pattern === "HH:mm"
      ? { hour: "2-digit", minute: "2-digit", timeZone: timezone, hour12: false }
      : pattern === "EEE"
        ? { weekday: "short", timeZone: timezone }
        : pattern === "MMM d"
          ? { month: "short", day: "numeric", timeZone: timezone }
          : {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: timezone,
              hour12: false,
            };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Get the start of the current calendar day in the clan timezone, as a UTC Date.
 * Used for "estimated login days" — a login is attributed to the clan-local
 * calendar day on which donations increased.
 */
export function startOfDayInClanTz(date: Date = new Date()): Date {
  // Format the date in clan TZ to get Y-M-D, then construct a UTC date at
  // 00:00 on that Y-M-D, then adjust for the timezone offset.
  const tz = clanConfig.timezone;
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "01");

  // Construct the UTC instant that represents 00:00 in the clan timezone.
  // We use a round-trip: build an ISO string, parse it, then the Date
  // constructor interprets it as UTC. But we need 00:00 *local*, so we
  // compute the offset and subtract.
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  // The offset between clan TZ and UTC at this instant:
  const offsetMs = getTzOffsetMs(utcMidnight, tz);
  return new Date(utcMidnight.getTime() - offsetMs);
}

/**
 * Get the timezone offset in milliseconds for a given instant.
 * Positive = behind UTC (e.g. UTC-8), negative = ahead of UTC (e.g. UTC+8).
 */
function getTzOffsetMs(date: Date, timezone: string): number {
  // Use Intl to get the wall-clock components in the target TZ, then compare
  // to the UTC components.
  const tzParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    Number(tzParts.find((p) => p.type === type)?.value ?? "0");

  const tzAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  return tzAsUtc - date.getTime();
}

/**
 * Check if two dates fall on the same calendar day in the clan timezone.
 */
export function isSameDayInClanTz(a: Date, b: Date): boolean {
  const aParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: clanConfig.timezone,
  }).formatToParts(a);
  const bParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: clanConfig.timezone,
  }).formatToParts(b);

  const aKey = `${aParts.find((p) => p.type === "year")?.value}-${aParts.find((p) => p.type === "month")?.value}-${aParts.find((p) => p.type === "day")?.value}`;
  const bKey = `${bParts.find((p) => p.type === "year")?.value}-${bParts.find((p) => p.type === "month")?.value}-${bParts.find((p) => p.type === "day")?.value}`;
  return aKey === bKey;
}

/**
 * Timezone-aware window calculations for dashboard analytics.
 *
 * See docs/concept/04-activity-tracking-and-polling.md:
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
 * Compute a time window for analytics.
 *
 * fix B-6 (docs/2026-09-10 assessment §3): window boundaries are now exact
 * and anchored to the spec in docs/concept/04 ("Time-window boundaries are
 * calculated in the clan timezone, then queried as UTC timestamps"):
 *
 *   - "24h" — exactly 24 complete hourly buckets ending at the top of the
 *     current hour. `to` is the NEXT hour boundary, so the current partial
 *     hour appears as the in-progress bucket. Previously `from` snapped to
 *     the hour while `to` kept its minutes/seconds — windows ran up to
 *     24h59m59s and the last hourly bucket stretched to ~2h.
 *   - "7d"/"30d" — the last N calendar days in the CLAN TIMEZONE (6/29 full
 *     days + today so far). Previously buckets were anchored at "now minus
 * N days", so donations between Manila midnight and the anchor hour landed
 *     in the previous day's bucket and bucket labels drifted from their
 *     contents.
 */
export function computeWindow(kind: WindowKind, now: Date = new Date()): TimeWindow {
  switch (kind) {
    case "24h": {
      const to = snapUpToHour(now);
      return { from: new Date(to.getTime() - 24 * 3_600_000), to, kind };
    }
    case "7d": {
      const todayStart = startOfDayInClanTz(now);
      return { from: new Date(todayStart.getTime() - 6 * 86_400_000), to: now, kind };
    }
    case "30d": {
      const todayStart = startOfDayInClanTz(now);
      return { from: new Date(todayStart.getTime() - 29 * 86_400_000), to: now, kind };
    }
    case "all":
      return { from: new Date(0), to: now, kind };
  }
}

/** Round an instant UP to the top of the current hour (UTC hours are exact
 *  hour boundaries in UTC+8 Manila too, so this also yields clean local labels). */
function snapUpToHour(date: Date): Date {
  const ms = date.getTime();
  return new Date(Math.ceil(ms / 3_600_000) * 3_600_000);
}

/**
 * Compute a window covering the last `days` calendar days in the clan
 * timezone ((days−1) full days + today so far) — the general form of the
 * "7d"/"30d" cases above, extracted for Phase 2.2: the donation-ratio
 * needs-attention category has a runtime-configurable windowDays (default
 * 30), so it can't hard-code one of the four preset WindowKinds.
 *
 * `kind` carries the closest preset purely so generateBuckets() remains
 * usable on the result; the donation-ratio category itself never buckets.
 * Identical to computeWindow("30d") for days=30 and computeWindow("7d")
 * for days=7 (tested in tests/lib/windows.test.ts).
 */
export function computeDayWindow(
  days: number,
  now: Date = new Date(),
): TimeWindow {
  const clamped = Math.max(1, Math.floor(days));
  const todayStart = startOfDayInClanTz(now);
  const kind: WindowKind =
    clamped === 7 ? "7d" : clamped === 30 ? "30d" : clamped === 1 ? "24h" : "all";
  return {
    from: new Date(todayStart.getTime() - (clamped - 1) * 86_400_000),
    to: now,
    kind,
  };
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
  return clanTzDayKey(a) === clanTzDayKey(b);
}

/**
 * Signed difference in CLAN-TIMEZONE calendar days between two instants
 * (b − a). 0 = same day, 1 = adjacent day, negative = b before a. Extracted
 * from records-updater.ts (fix B-1) so the streak algorithm
 * (lib/scoring/login-streak.ts) and its tests can share the definition.
 */
export function diffCalendarDaysInClanTz(a: Date, b: Date): number {
  const aStart = startOfDayInClanTz(a);
  const bStart = startOfDayInClanTz(b);
  // Manila has no DST, so local midnights are exact 24h multiples; Math.round
  // guards against any timezone with historical offset shifts.
  return Math.round((bStart.getTime() - aStart.getTime()) / 86_400_000);
}

/**
 * Stable day key ("YYYY-MM-DD") for an instant in the clan timezone.
 *
 * fix B-7: the checkpoint computation used to dedupe login days by the UTC
 * date slice (self-acknowledged "approximate"), while the HoF streak uses
 * clan-timezone calendar days — boundary logins (±8h around Manila midnight)
 * over- or under-counted `cumulativeLoginDays` by a day versus the streak's
 * own definition. A shared stable key makes both count identically.
 */
export function clanTzDayKey(
  date: Date,
  timezone: string = clanConfig.timezone,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0000";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

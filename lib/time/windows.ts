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

/** The four preset windows. `computeWindow` accepts these (and every
 *  historical caller passes a subset — DonationWindow, ScoreWindow). */
export type PresetWindowKind = "24h" | "7d" | "30d" | "all";

/** Any window kind, including the Phase 3.2 user-chosen custom range.
 *  `TimeWindow.kind` carries it; `computeCustomWindow` produces the custom
 *  variant (with validated, clan-TZ-aligned boundaries). */
export type WindowKind = PresetWindowKind | "custom";

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
export function computeWindow(
  kind: PresetWindowKind,
  now: Date = new Date(),
): TimeWindow {
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

// ---------------------------------------------------------------------------
// Custom date-range windows (Phase 3.2 — F11 "custom date-range analytics")
// ---------------------------------------------------------------------------

/** Max span a custom range may cover (days) — caps chart width and the
 *  day-pair cache-key space. A full year covers every CWL/season use case. */
export const CUSTOM_RANGE_MAX_DAYS = 366;

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a "YYYY-MM-DD" string into its clan-TZ midnight (UTC instant).
 *  Returns null for malformed input or a date that doesn't exist on the
 *  calendar (2026-02-30) — round-tripped through Date so the calendar
 *  itself is the authority. */
function parseIsoDayInClanTz(day: string): Date | null {
  if (!ISO_DAY_RE.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Reject rollovers (e.g. 2026-02-30 → March 2).
  if (
    !Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) ||
    new Date(Date.UTC(y, m - 1, d)).getUTCDate() !== d
  ) {
    return null;
  }
  // Noon UTC falls on the same calendar date in every real timezone, so
  // startOfDayInClanTz(noon) is exactly the requested day's clan-TZ midnight
  // — reusing the same tested conversion the presets rely on.
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return startOfDayInClanTz(noonUtc);
}

export interface CustomRangeInput {
  from: string; // "YYYY-MM-DD" (inclusive)
  to: string; // "YYYY-MM-DD" (inclusive)
}

export type CustomWindowResult =
  | {
      ok: true;
      window: TimeWindow;
      /** Normalized day keys actually used (echoed for cache keys / UI). */
      fromDay: string;
      toDay: string;
      /** Number of calendar days covered, inclusive. */
      dayCount: number;
    }
  | { ok: false; error: string };

/**
 * Validate and resolve a user-supplied custom day range into a TimeWindow
 * aligned to clan-timezone midnights (the same boundary discipline as the
 * presets — docs/concept/04 "Time-window boundaries are calculated in the
 * clan timezone, then queried as UTC timestamps").
 *
 * Rules (implementation-plan §3.2): strict ISO days only; `from` ≤ `to`;
 * `to` must not be in the future (clan-TZ); span ≤ 366 days. The resulting
 * window is [from-midnight, to-next-midnight) — the FULL last day, matching
 * the 7d/30d presets' "today so far" semantics as closely as a closed range
 * allows.
 */
export function computeCustomWindow(
  input: CustomRangeInput,
  now: Date = new Date(),
): CustomWindowResult {
  const { from, to } = input;

  const fromDay = parseIsoDayInClanTz(from);
  if (!fromDay) {
    return { ok: false, error: "`from` must be a valid ISO day (YYYY-MM-DD)" };
  }
  const toDay = parseIsoDayInClanTz(to);
  if (!toDay) {
    return { ok: false, error: "`to` must be a valid ISO day (YYYY-MM-DD)" };
  }

  // `to` must not be in the future: the day AFTER `to` (the exclusive bound)
  // must not be past the clan-TZ start of tomorrow.
  const tomorrowStart = startOfDayInClanTz(now).getTime() + 86_400_000;
  if (toDay.getTime() + 86_400_000 > tomorrowStart) {
    return { ok: false, error: "`to` must not be in the future" };
  }

  const dayCount = Math.round((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1;
  if (dayCount < 1) {
    return { ok: false, error: "`from` must be on or before `to`" };
  }
  if (dayCount > CUSTOM_RANGE_MAX_DAYS) {
    return {
      ok: false,
      error: `Range too wide — ${dayCount} days, max ${CUSTOM_RANGE_MAX_DAYS}`,
    };
  }

  return {
    ok: true,
    window: {
      from: fromDay,
      to: new Date(toDay.getTime() + 86_400_000), // exclusive end = full last day
      kind: "custom",
    },
    fromDay: from,
    toDay: to,
    dayCount,
  };
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
  const { kind, from, to } = window;
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
  } else if (kind === "30d") {
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
  } else {
    // Custom windows (Phase 3.2): one bucket per calendar day in the range,
    // labels like "Jul 1". The chart thins x-labels itself
    // (interval="preserveStartEnd", minTickGap), so a 366-day range stays
    // readable. The final (partial) day uses the window's `to` as its end.
    const start = from.getTime();
    const end = to.getTime();
    for (let ts = start; ts < end; ts += 86_400_000) {
      buckets.push({
        label: formatInTimezone(new Date(ts), timezone, "MMM d"),
        timestamp: new Date(ts),
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

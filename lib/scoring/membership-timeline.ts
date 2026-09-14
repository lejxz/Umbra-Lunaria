/**
 * Membership timeline — pure logic for Phase 4 / F10
 * (docs/2026-09-11-implementation-plan.md §"Phase 4 — Clan history timeline").
 *
 * The dashboard's "Clan history" panel answers "how has the clan's shape and
 * engagement changed over time?" from the immutable `membership_events` log:
 * one stacked bar per clan-TZ day (join/rejoin/leave/thUpgrade/rename) with
 * capital-contribution density overlaid (distinct contributors per day, from
 * the daily batch's `capitalContribution` delta events).
 *
 * This module owns the aggregation math so it can be tested without a DB:
 *   1. `buildMembershipTimeline` — merge SQL day×eventType rows into one
 *      point per clan-TZ calendar day, zero-filled across the whole range
 *      (empty days render as gaps in the stacked bars, not dropped x-ticks),
 *      plus window totals for the header badge.
 *   2. day-key helpers — `nextDayKey` / `dayKeyRange` iterate "YYYY-MM-DD"
 *      strings as pure calendar arithmetic (no Date parsing anywhere, so
 *      timezones cannot shift a boundary).
 *
 * Pure: no DB, no React, no I/O. Tested in tests/lib/membership-timeline.test.ts.
 */

// ---------------------------------------------------------------------------
// Shapes — decoupled from the Drizzle row so tests pass plain fixtures.
// ---------------------------------------------------------------------------

/** One grouped SQL row: a day × event_type aggregate. */
export interface MembershipEventRow {
  /** Clan-TZ calendar day, "YYYY-MM-DD". */
  dayKey: string;
  /** "join" | "rejoin" | "leave" | "thUpgrade" | "rename" | "capitalContribution". */
  eventType: string;
  /** Events of this type on this day. */
  count: number;
  /** Distinct player tags with this event type on this day. */
  contributors: number;
  /** Summed metadata.amount (capitalContribution deltas only; else null). */
  amount: number | null;
}

/** Inclusive clan-TZ day range the timeline must cover. */
export interface MembershipDayRange {
  fromDay: string; // "YYYY-MM-DD"
  toDay: string; // "YYYY-MM-DD"
}

/** The five membership event types rendered as stacked bar segments.
 *  `capitalContribution` is tracked separately (area overlay, not a bar). */
export const MEMBERSHIP_EVENT_TYPES = [
  "join",
  "rejoin",
  "leave",
  "thUpgrade",
  "rename",
] as const;

export type MembershipEventType = (typeof MEMBERSHIP_EVENT_TYPES)[number];

/** One chart point = one clan-TZ day. */
export interface MembershipTimelinePoint {
  /** Axis label, "Jul 22" — derived from the day key, timezone-safe. */
  label: string;
  /** Clan-TZ day key "2026-07-22" (stable identity for tooltips/tests). */
  day: string;
  join: number;
  rejoin: number;
  leave: number;
  thUpgrade: number;
  rename: number;
  /** Distinct members whose capital contribution rose that day. */
  capitalContributors: number;
  /** Total capital resources contributed that day (tooltip only — the
   *  amount scale is unrelated to event counts, so it is never charted). */
  capitalAmount: number;
}

/** Window totals for the panel header (net change, event mix). */
export interface MembershipTimelineTotals {
  join: number;
  rejoin: number;
  leave: number;
  thUpgrade: number;
  rename: number;
  capitalContributors: number;
  /** join + rejoin − leave — the headline "is the clan growing" number. */
  netRosterChange: number;
}

// ---------------------------------------------------------------------------
// Day-key arithmetic — pure string calendar math.
// ---------------------------------------------------------------------------

/** Days in a month on the proleptic Gregorian calendar. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The day key after `day` ("2026-07-31" → "2026-08-01"). */
export function nextDayKey(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  if (d < daysInMonth(y, m)) return fmt(y, m, d + 1);
  if (m < 12) return fmt(y, m + 1, 1);
  return fmt(y + 1, 1, 1);
}

function fmt(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** All day keys from `fromDay` to `toDay` inclusive (clamped when inverted). */
export function dayKeyRange(fromDay: string, toDay: string): string[] {
  const days: string[] = [];
  for (let day = fromDay; day <= toDay; day = nextDayKey(day)) {
    days.push(day);
  }
  return days;
}

/** "Jul 22" from a day key — noon-UTC anchor keeps every real TZ on that
 *  date; rendered in UTC so the label IS the day key, always. */
export function labelForDayKey(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Build the chart-ready timeline from grouped SQL rows.
 *
 * - Every day in [fromDay, toDay] yields exactly one point, zero-filled —
 *   the x-axis is honest calendar spacing, not event-only spacing.
 * - Unknown event types are counted into totals under their own name but do
 *   not render (forward-compatible: a new event_type lights up totals before
 *   the chart learns a series for it).
 * - `capitalContribution` rows feed the density overlay (contributors +
 *   amount) and the totals, never the stacked bars.
 * - An inverted or empty range yields zero points (caller renders the empty
 *   state).
 */
export function buildMembershipTimeline(
  rows: MembershipEventRow[],
  range: MembershipDayRange,
): { points: MembershipTimelinePoint[]; totals: MembershipTimelineTotals } {
  const totals: MembershipTimelineTotals = {
    join: 0,
    rejoin: 0,
    leave: 0,
    thUpgrade: 0,
    rename: 0,
    capitalContributors: 0,
    netRosterChange: 0,
  };

  // dayKey → per-type counts + capital aggregates.
  const byDay = new Map<
    string,
    {
      counts: Record<MembershipEventType, number>;
      capitalContributors: number;
      capitalAmount: number;
    }
  >();

  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dayKey)) continue; // malformed guard
    let day = byDay.get(row.dayKey);
    if (!day) {
      day = {
        counts: { join: 0, rejoin: 0, leave: 0, thUpgrade: 0, rename: 0 },
        capitalContributors: 0,
        capitalAmount: 0,
      };
      byDay.set(row.dayKey, day);
    }
    if (isMembershipEventType(row.eventType)) {
      day.counts[row.eventType] += row.count;
      totals[row.eventType] += row.count;
    } else if (row.eventType === "capitalContribution") {
      day.capitalContributors += row.contributors;
      day.capitalAmount += row.amount ?? 0;
      totals.capitalContributors += row.contributors;
    }
  }

  totals.netRosterChange = totals.join + totals.rejoin - totals.leave;

  const points: MembershipTimelinePoint[] = dayKeyRange(
    range.fromDay,
    range.toDay,
  ).map((day) => {
    const agg = byDay.get(day);
    const counts = agg?.counts ?? { join: 0, rejoin: 0, leave: 0, thUpgrade: 0, rename: 0 };
    return {
      label: labelForDayKey(day),
      day,
      ...counts,
      capitalContributors: agg?.capitalContributors ?? 0,
      capitalAmount: agg?.capitalAmount ?? 0,
    };
  });

  return { points, totals };
}

function isMembershipEventType(t: string): t is MembershipEventType {
  return (MEMBERSHIP_EVENT_TYPES as readonly string[]).includes(t);
}

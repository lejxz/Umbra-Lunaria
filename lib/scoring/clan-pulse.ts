/**
 * Clan Pulse — the combined Activity × Roster panel's pure engine
 * (user request: "combine Activity Analytics and Roster growth and
 * improve it").
 *
 * Both inputs already exist in the dashboard payload:
 *   - ActivityTimeline: per-bucket active-member counts (hourly for 24h,
 *     daily for 7d/30d) + window totals.
 *   - RosterSizeTrend: distinct members per clan-TZ calendar day (30d).
 *
 * This module aligns the two on a shared time axis and derives what
 * neither panel could say alone:
 *
 *   1. Per-bucket ROSTER SIZE (carry-forward step function — the roster
 *      value of the bucket's clan-TZ day, or the latest earlier day).
 *   2. Per-bucket ENGAGEMENT RATE = active ÷ roster × 100 — the
 *      normalization that makes growth and engagement comparable: a clan
 *      that grows 30 → 45 while "active" goes 12 → 15 is actually
 *      *disengaging* (40% → 33%), which raw bars hide.
 *   3. Window stats: roster momentum (Δ over the window), average
 *      engagement, engagement trend (2nd half vs 1st half, in points).
 *   4. A verdict on the growth × engagement 2×2: Thriving / Growing but
 *      diluting / Tightening core / Fading / Steady — with a plain-language
 *      one-liner for the pill tooltip.
 *
 * Pure: plain inputs → plain output, no db/fetch/React — unit-tested in
 * tests/lib/clan-pulse.test.ts. The SQL query layer (getRosterSizeTrend)
 * provides the `dayKey` via `to_char(..., 'YYYY-MM-DD')` so day alignment
 * never round-trips a naive pg timestamp through a timezone-converted Date
 * (the same sidestep the Phase 4 membership timeline uses).
 */

import type {
  ActivityTimeline,
  ClanPulse,
  ClanPulsePoint,
  ClanPulseVerdict,
  PulseDirection,
  RosterSizeTrend,
} from "@/lib/view-models/dashboard";
import { clanTzDayKey } from "@/lib/time/windows";

/** A roster point normalized to a clan-TZ day key. */
interface RosterDayPoint {
  dayKey: string;
  count: number;
}

/**
 * Build the combined panel view for one window.
 *
 * The roster series is NOT sliced to the window: earlier points are needed
 * as carry-forward context for buckets that precede the first in-window
 * roster day (e.g. the first hourly buckets of a 24h window that starts
 * yesterday), and the momentum baseline is "latest roster value at or
 * before the window's first bucket", not "first point inside the window".
 */
export function buildClanPulse(
  activity: ActivityTimeline,
  roster: RosterSizeTrend,
): ClanPulse {
  // Roster points, oldest-first, deduplicated per day key (last wins —
  // distinct-per-day counts are already unique, but stay defensive).
  const rosterDays = new Map<string, number>();
  for (const p of roster.points) {
    rosterDays.set(p.dayKey, p.count);
  }
  const sortedDays: RosterDayPoint[] = [...rosterDays.entries()]
    .map(([dayKey, count]) => ({ dayKey, count }))
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));

  // ── Per-bucket series ──
  const points: ClanPulsePoint[] = activity.buckets.map((b) => {
    const bucketDay = clanTzDayKey(b.timestamp);
    let roster: number | null = null;
    for (const d of sortedDays) {
      if (d.dayKey <= bucketDay) roster = d.count;
      else break;
    }
    const rate = roster !== null && roster > 0 ? (b.activeMembers / roster) * 100 : null;
    return { label: b.label, active: b.activeMembers, roster, rate };
  });

  // ── Window stats ──
  const rates = points
    .map((p) => p.rate)
    .filter((r): r is number => r !== null);

  const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : null;

  // Trend: second half vs first half mean (percentage points). Needs at
  // least 2 measurable buckets; with an odd count the middle bucket joins
  // the first half (arbitrary, deterministic, documented by test).
  let rateTrendPp: number | null = null;
  if (rates.length >= 2) {
    const half = Math.ceil(rates.length / 2);
    const first = rates.slice(0, half);
    const second = rates.slice(half);
    if (second.length > 0) {
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      rateTrendPp = mean(second) - mean(first);
    }
  }

  // Roster momentum over the window: value at the last bucket's day minus
  // the carry-forward value at the first bucket's day.
  let rosterNow: number | null = null;
  let rosterDelta: number | null = null;
  let baselineRoster: number | null = null;
  if (points.length > 0) {
    const lastBucketDay = clanTzDayKey(
      activity.buckets[activity.buckets.length - 1]!.timestamp,
    );
    const firstBucketDay = clanTzDayKey(activity.buckets[0]!.timestamp);
    for (const d of sortedDays) {
      if (d.dayKey <= firstBucketDay) baselineRoster = d.count;
      else break;
    }
    rosterNow = rosterDays.get(lastBucketDay) ?? null;
    if (baselineRoster !== null && rosterNow !== null) {
      rosterDelta = rosterNow - baselineRoster;
    }
  }

  const verdict = buildVerdict(rosterDelta, baselineRoster, rateTrendPp);

  return {
    window: activity.window,
    points,
    totalActiveMembers: activity.totalActiveMembers,
    totalMembers: activity.totalMembers,
    hasPartialData: activity.hasPartialData,
    rosterNow,
    rosterDelta,
    avgRate,
    rateTrendPp,
    verdict,
  };
}

/**
 * Classify the growth × engagement matrix.
 *
 * Thresholds (documented, relative — a ±1 swing matters in a 7-member clan
 * but is noise in a 50-member one):
 *   - growth is "flat" when |Δ| < max(1, 5% of the window-start roster)
 *   - engagement is "flat" when |trend| < 5 percentage points
 * Unknown dimensions (cold start: no roster days / no measurable rate)
 * yield a "Warming up" verdict rather than a false "Steady".
 */
export function buildVerdict(
  rosterDelta: number | null,
  baselineRoster: number | null,
  rateTrendPp: number | null,
): ClanPulseVerdict {
  const growth =
    rosterDelta === null || baselineRoster === null
      ? null
      : classifyGrowth(rosterDelta, baselineRoster);
  const engagement =
    rateTrendPp === null ? null : Math.abs(rateTrendPp) < 5 ? "flat" : rateTrendPp > 0 ? "up" : "down";

  if (growth === null || engagement === null) {
    return {
      growth,
      engagement,
      label: "Warming up",
      description:
        "Not enough roster or engagement history for a verdict yet — check back after a few days of tracking.",
      tone: "muted",
    };
  }

  const dir = (d: PulseDirection) => (d === "up" ? "rising" : d === "down" ? "declining" : "steady");
  const growthDesc = dir(growth);
  const engagementDesc = dir(engagement);

  if (growth === "flat" || engagement === "flat") {
    return {
      growth,
      engagement,
      label: growth === "flat" && engagement === "flat" ? "Steady" : `Steady ${growth === "flat" ? "roster" : "engagement"}`,
      description: `Roster ${growthDesc}, engagement ${engagementDesc}.`,
      tone: "muted",
    };
  }

  if (growth === "up" && engagement === "up") {
    return {
      growth,
      engagement,
      label: "Thriving",
      description: "Roster growing and engagement rising — new members are plugging in.",
      tone: "success",
    };
  }
  if (growth === "up" && engagement === "down") {
    return {
      growth,
      engagement,
      label: "Growing, diluting",
      description: "Roster is growing faster than engagement keeps up — new members are not plugging in yet.",
      tone: "warning",
    };
  }
  if (growth === "down" && engagement === "up") {
    return {
      growth,
      engagement,
      label: "Tightening core",
      description: "Roster shrinking but engagement rising — the members who stayed are active.",
      tone: "warning",
    };
  }
  return {
    growth,
    engagement,
    label: "Fading",
    description: "Roster and engagement both declining — worth leadership attention.",
    tone: "danger",
  };
}

function classifyGrowth(delta: number, baseline: number): PulseDirection {
  const threshold = Math.max(1, Math.round(baseline * 0.05));
  if (delta >= threshold) return "up";
  if (delta <= -threshold) return "down";
  return "flat";
}

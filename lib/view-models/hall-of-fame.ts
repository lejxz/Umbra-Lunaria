/**
 * Hall of Fame view models — the shapes the dedicated /hall-of-fame page
 * receives.
 *
 * The existing 5 all-time awards (philanthropist, vanguard, dedicated,
 * capitalist, unsleeping) are computed by the daily batch and cached in the
 * `hall_of_fame_records` table. These types extend that with live-computed
 * records from raw tables (war_attacks, capital_contributions, members,
 * membership_events) — no schema changes needed, the data already exists.
 *
 * See concept/05-dashboard.md §"Hall of Fame" + concept/12.
 *
 * The dashboard keeps its compact 5-award card (HallOfFameCard); this page
 * shows the full leaderboards + the additional record categories.
 */

// ---------------------------------------------------------------------------
// The 5 cached all-time awards (mirrors the dashboard's HallOfFame type)
// ---------------------------------------------------------------------------

export type HallOfFameAwardKey =
  | "philanthropist"
  | "vanguard"
  | "dedicated"
  | "capitalist"
  | "unsleeping";

export interface HallOfFameRankedEntry {
  rank: number;
  playerTag: string;
  name: string;
  value: number;
  valueLabel: string;
  metaLabel?: string;
}

export interface HallOfFameLeaderboard {
  awardKey: HallOfFameAwardKey;
  entries: HallOfFameRankedEntry[];
}

export interface HallOfFameRecord {
  awardKey: HallOfFameAwardKey;
  holderName: string;
  holderTag: string;
  recordValue: number;
  valueLabel: string;
  periodLabel: string | null;
  achievedAt: Date;
}

// ---------------------------------------------------------------------------
// Live-computed records (queried at page load, ISR-cached)
// ---------------------------------------------------------------------------

/** A single ranked entry in a live-computed record leaderboard. */
export interface LiveRecordEntry {
  playerTag: string;
  name: string;
  /** Raw value for sorting (donations, stars, days, gold, etc.). */
  value: number;
  /** Human-readable label, e.g. "1,250 gold", "15 three-stars". */
  valueLabel: string;
  /** Optional secondary stat (e.g. "80% rate", "in 12 wars"). */
  metaLabel?: string | null;
}

/** A live-computed record category (not cached in hall_of_fame_records). */
export interface LiveRecordCategory {
  /** Stable key for the category. */
  key: string;
  /** Human-readable title, e.g. "Most Raid Gold". */
  title: string;
  /** Short description of what the record measures. */
  description: string;
  /** Icon name (mapped to a Lucide icon in the UI). */
  icon: "coins" | "swords" | "flame" | "gift" | "crown" | "clock" | "trophy" | "zap" | "users";
  /** Ranked entries, highest first. */
  entries: LiveRecordEntry[];
}

// ---------------------------------------------------------------------------
// The full page data
// ---------------------------------------------------------------------------

export interface HallOfFamePageData {
  /** The 5 cached all-time awards (full leaderboards, not just top 5). */
  cachedAwards: HallOfFameLeaderboard[];
  /** Live-computed record categories. */
  liveRecords: LiveRecordCategory[];
  /** When the cached awards were last recomputed (the daily batch time). */
  lastComputedAt: Date | null;
}

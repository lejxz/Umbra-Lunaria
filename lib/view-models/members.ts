/**
 * Typed view models for the Members page and member detail sheet.
 *
 * These are the shapes that page components receive — never raw Drizzle rows.
 * See docs/concept/06-members.md for the full specification.
 */

import type { ClanBadgeUrls } from "./dashboard";

// ---------------------------------------------------------------------------
// Roster view model — one entry per retained member
// ---------------------------------------------------------------------------

export interface MemberRosterEntry {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  clanRank: number | null;
  trophies: number | null;
  league: { name: string; iconUrls?: ClanBadgeUrls } | null;
  leagueTier: { name: string; iconUrls?: ClanBadgeUrls } | null;
  builderBaseTrophies: number | null;
  expLevel: number | null;
  warPreference: "in" | "out" | null;
  currentDonations: number | null;
  currentDonationsReceived: number | null;
  // Activity
  lastActiveAt: Date | null;
  isActive: boolean;
  // War (tracked)
  warsTracked: number;
  warsMissed: number;
  attacksUsed: number;
  attacksAllowed: number;
  // Rushed (derived — null when cap data unavailable)
  rushedPercent: number | null;
  // Lifecycle
  joinedAt: Date;
  leftAt: Date | null;
  isDeparted: boolean;
}

export interface MemberRoster {
  entries: MemberRosterEntry[];
  totalMembers: number;
  trackingStart: Date | null;
}

// ---------------------------------------------------------------------------
// Sort and filter types
// ---------------------------------------------------------------------------

export type MemberSortField =
  | "name"
  | "role"
  | "townHallLevel"
  | "donations"
  | "trophies"
  | "clanRank"
  | "joinedAt"
  | "activity"
  | "warsMissed"
  | "rushedPercent";

export type SortDirection = "asc" | "desc";

export interface MemberSort {
  field: MemberSortField;
  direction: SortDirection;
}

export interface MemberFilters {
  role?: string; // leader | coLeader | admin | member
  townHallMin?: number;
  townHallMax?: number;
  warPreference?: "in" | "out";
  activeOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Member detail view model — full sheet
// ---------------------------------------------------------------------------

export interface MemberDetailView {
  // Profile — API fact
  profile: {
    playerTag: string;
    name: string;
    role: string;
    townHallLevel: number | null;
    townHallWeaponLevel: number | null;
    expLevel: number | null;
    trophies: number | null;
    bestTrophies: number | null;
    league: { name: string; iconUrls?: ClanBadgeUrls } | null;
    leagueTier: { name: string; iconUrls?: ClanBadgeUrls } | null;
    builderHallLevel: number | null;
    builderBaseTrophies: number | null;
    bestBuilderBaseTrophies: number | null;
    builderBaseLeague: { name: string } | null;
    clanRank: number | null;
    warPreference: "in" | "out" | null;
    warStars: number | null;
    attackWins: number | null;
    defenseWins: number | null;
    clanCapitalContributions: number | null;
    joinedAt: Date;
    leftAt: Date | null;
    isDeparted: boolean;
    isPurged: boolean;
    lastDetailCaptureAt: Date | null;
  };

  // Activity — tracked history
  activity: {
    lastActiveAt: Date | null;
    trackingStart: Date | null;
    hasPartialData: boolean;
    // 30-day activity buckets (daily)
    buckets: Array<{
      label: string;
      active: boolean;
      timestamp: Date;
    }>;
    // Estimated login days (dates where donations increased)
    loginDays: Date[];
  };

  // Donations — tracked history / derived
  donations: {
    given24h: number;
    received24h: number;
    given7d: number;
    received7d: number;
    given30d: number;
    received30d: number;
    ratio: number | null;
    // 30-day donation buckets
    buckets: Array<{
      label: string;
      given: number;
      received: number;
      timestamp: Date;
    }>;
    // Activity score
    activityScore: number | null;
    activityScoreRank: number | null;
    activityScoreComponents: Array<{
      name: string;
      available: boolean;
      points: number;
    }>;
  };

  // War participation — tracked history
  warParticipation: {
    warsTracked: number;
    warsMissed: number;
    attacksUsed: number;
    attacksAllowed: number;
    participationRate: number | null;
    starsEarned: number;
    averageStars: number | null;
    threeStarRate: number | null;
    recentWars: Array<{
      warId: number;
      opponentName: string | null;
      result: string | null;
      attacksUsed: number;
      attacksAllowed: number;
      starsEarned: number;
      missed: boolean;
      endTime: Date | null;
    }>;
    currentWarStatus: string | null;
  };

  // Career — API fact
  career: {
    warStars: number | null;
    attackWins: number | null;
    defenseWins: number | null;
    bestTrophies: number | null;
    bestBuilderBaseTrophies: number | null;
    clanCapitalContributions: number | null;
    achievements: Array<{
      name: string;
      value: number;
      target: number | null;
      stars: number | null;
      village: string | null;
    }>;
  };

  // Progress (window) — Phase 3.1 career deltas between member_career_snapshots.
  // All three windows are computed server-side (three indexed LIMIT-1 lookups)
  // so the sheet can switch windows with no extra fetches. Null deltas mean
  // the window predates tracking (no baseline snapshot) — the UI shows a
  // "progress tracking started <date>" note instead of fabricated zeros.
  progress: {
    trackingStartedAt: Date | null;
    windows: {
      "7d": CareerProgressWindow;
      "30d": CareerProgressWindow;
      all: CareerProgressWindow;
    };
  };

  // Progression — API fact
  progression: {
    troops: Array<{ name: string; level: number; maxLevel: number | null }>;
    heroes: Array<{ name: string; level: number; maxLevel: number | null }>;
    heroEquipment: Array<{ name: string; level: number; maxLevel: number | null }>;
    spells: Array<{ name: string; level: number; maxLevel: number | null }>;
    pets: Array<{ name: string; level: number; maxLevel: number | null }>;
    builderBaseTroops: Array<{ name: string; level: number; maxLevel: number | null }>;
    builderBaseHeroes: Array<{ name: string; level: number; maxLevel: number | null }>;
  };

  // Rushed analysis — derived (null when cap data unavailable)
  rushed: {
    overallPercent: number | null;
    categoryBreakdown: Array<{
      category: string;
      percent: number | null;
    }>;
  };

  // Hall of Fame rankings — all-time clan records per category
  hallOfFame: {
    philanthropist: { rank: number; valueLabel: string } | null;
    vanguard: { rank: number; valueLabel: string } | null;
    dedicated: { rank: number; valueLabel: string } | null;
    capitalist: { rank: number; valueLabel: string } | null;
    unsleeping: { rank: number; valueLabel: string } | null;
  };
}

/**
 * Career progress over one window (Phase 3.1) — the diff between the current
 * career state and the career snapshot at/before the window start.
 */
export interface CareerProgressWindow {
  // Scalar deltas; null = no baseline snapshot exists for this window
  // (window predates tracking — not the same as zero progress).
  warStars: number | null;
  attackWins: number | null;
  defenseWins: number | null;
  clanCapitalContributions: number | null;
  expLevels: number | null;
  // Achievements that rose over the window, sorted by delta descending.
  achievements: Array<{
    name: string;
    delta: number;
    from: number;
    to: number;
    target: number | null;
  }>;
  // True when every delta is zero and no achievement moved.
  noChange: boolean;
  // When the baseline snapshot was captured (ISO-safe Date; null before the
  // first daily batch writes a snapshot).
  baselineAt: Date | null;
  // True when the window start predates tracking and the earliest available
  // snapshot was used as the baseline — the window's true totals are larger.
  partial: boolean;
}

/**
 * Human label for a CoC role value ("admin" is displayed as "Elder" — the
 * in-game name for that role).
 *
 * fix (docs/2026-09-10 assessment §6.4): was duplicated in members-roster.tsx
 * and member-detail-sheet.tsx; now a single shared definition in the
 * view-model layer both already import from.
 */
export function formatRole(role: string): string {
  switch (role) {
    case "leader":
      return "Leader";
    case "coLeader":
      return "Co-Leader";
    case "admin":
      return "Elder";
    default:
      return "Member";
  }
}

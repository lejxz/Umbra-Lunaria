/**
 * Typed view models for the dashboard.
 *
 * These are the shapes that page components receive — never raw Drizzle rows.
 * Every value is explicitly typed so the UI can render loading, empty, and
 * unavailable states without guessing. See concept/05-dashboard.md and
 * concept/12 Step 1.1.A.
 *
 * Core principle (concept/00-overview.md "Product contract"):
 *   - API fact       → returned directly by Supercell
 *   - Tracked history → observed and stored by Umbra Lunaria
 *   - Derived metric  → calculated by the app
 *   - Unavailable     → null, with a reason, never a fabricated zero
 */

// ---------------------------------------------------------------------------
// Clan identity + war record + Capital summary (API facts + freshness)
// ---------------------------------------------------------------------------

export interface ClanBadgeUrls {
  tiny?: string;
  small?: string;
  medium?: string;
  large?: string;
}

export interface DashboardClan {
  tag: string;
  name: string;
  description: string | null;
  type: string | null;
  isFamilyFriendly: boolean | null;
  badgeUrls: ClanBadgeUrls | null;
  clanLevel: number | null;
  memberCount: number | null;
  clanPoints: number | null;
  clanCapitalPoints: number | null;
  location: { name: string } | null;
  chatLanguage: { name: string; languageCode: string } | null;
  labels: Array<{ name: string; iconUrls?: ClanBadgeUrls }> | null;
  warFrequency: string | null;
  warLeague: { name: string } | null;
  capitalLeague: { name: string } | null;
  requiredTrophies: number | null;
  requiredTownhallLevel: number | null;
  // War record
  warWins: number | null;
  warTies: number | null;
  warLosses: number | null;
  warWinStreak: number | null;
  isWarLogPublic: boolean | null;
  // Capital
  capitalHallLevel: number | null;
  // Freshness
  lastPolledAt: Date | null;
  lastDailyBatchAt: Date | null;
}

export interface WarRecordView {
  wins: number | null;
  ties: number | null;
  losses: number | null;
  winStreak: number | null;
  winRate: number | null; // null when any of wins/ties/losses is null or denom is 0
}

export interface CapitalSummaryView {
  capitalHallLevel: number | null;
  capitalPoints: number | null;
  capitalLeague: { name: string } | null;
  districtCount: number | null;
  districts: Array<{ name: string; districtHallLevel: number }> | null;
  lastCaptureAt: Date | null;
}

// ---------------------------------------------------------------------------
// Donation analytics (tracked history)
// ---------------------------------------------------------------------------

export type DonationWindow = "24h" | "7d" | "30d";
export type ScoreWindow = DonationWindow | "all";

export interface DonationTotals {
  window: DonationWindow;
  given: number;
  received: number;
  ratio: number | null; // given / received, null when received is 0
  trackingStart: Date | null; // earliest snapshot in the window
  hasPartialData: boolean; // true when the window extends before tracking began
}

export interface DonationLeaderboardEntry {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  leagueTier: { name: string; iconUrls?: ClanBadgeUrls } | null;
  total: number;
  rank: number;
}

export interface DonationLeaderboard {
  window: DonationWindow;
  topDonors: DonationLeaderboardEntry[];
  topReceivers: DonationLeaderboardEntry[];
}

export interface DonationBucket {
  label: string; // "00:00", "Mon", etc.
  given: number;
  received: number;
  timestamp: Date;
}

export interface DonationTimeline {
  window: DonationWindow;
  buckets: DonationBucket[];
  hasPartialData: boolean;
}

// ---------------------------------------------------------------------------
// Activity timeline (tracked history)
// ---------------------------------------------------------------------------

export interface ActivityBucket {
  label: string;
  activeMembers: number;
  totalMembers: number;
  percent: number; // activeMembers / totalMembers * 100, 0 when totalMembers is 0
  timestamp: Date;
}

export interface ActivityTimeline {
  window: DonationWindow;
  buckets: ActivityBucket[];
  totalActiveMembers: number; // distinct active members in the window
  totalMembers: number; // retained roster size
  hasPartialData: boolean;
}

// ---------------------------------------------------------------------------
// Member Activity Score (derived metric)
// ---------------------------------------------------------------------------

export interface ActivityScoreComponent {
  name: "donations" | "activity" | "war" | "capital";
  rawValue: number; // the un-normalized source value
  normalized: number; // 0..1 after min-max normalization within the clan
  weight: number; // the weight applied (after reweighting)
  points: number; // normalized * weight * 100
  available: boolean; // false when the component's source data is missing
}

export interface MemberActivityScore {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  league: { name: string; iconUrls?: ClanBadgeUrls } | null;
  leagueTier: { name: string; iconUrls?: ClanBadgeUrls } | null;
  totalScore: number; // 0..100
  rank: number;
  components: ActivityScoreComponent[];
  window: ScoreWindow;
  limitedData: boolean; // true when insufficient tracking history
  trackingStart: Date | null;
}

export interface ActivityScoreLeaderboard {
  window: ScoreWindow;
  entries: MemberActivityScore[];
  totalMembers: number;
}

// ---------------------------------------------------------------------------
// Needs attention (derived from tracked + API facts)
// ---------------------------------------------------------------------------

export interface NeedsAttentionMember {
  playerTag: string;
  name: string;
  role: string;
  townHallLevel: number | null;
  reason: string;
  detail: string | null;
}

export interface NeedsAttention {
  inactive: NeedsAttentionMember[]; // inactive beyond threshold
  attacksRemaining: NeedsAttentionMember[]; // in active war with attacks left
  warPreferenceOut: NeedsAttentionMember[]; // opted out of war
  inactivityThresholdDays: number;
}

// ---------------------------------------------------------------------------
// Clan log (membership events — tracked history)
// ---------------------------------------------------------------------------

export interface ClanLogEntry {
  id: number;
  playerTag: string;
  name: string;
  eventType: "join" | "leave" | "rejoin";
  eventTime: Date;
  // Whether the member profile has been purged under the retention policy.
  // When true, the member detail sheet shows "left on [date]; data removed".
  isPurged: boolean;
}

export interface ClanLog {
  entries: ClanLogEntry[];
  limit: number;
}

// ---------------------------------------------------------------------------
// Navigation summaries
// ---------------------------------------------------------------------------

export interface WarSummaryView {
  state: "notInWar" | "preparation" | "inWar" | "warEnded" | null;
  opponentName: string | null;
  opponentTag: string | null;
  opponentBadgeUrls: ClanBadgeUrls | null;
  teamSize: number | null;
  ownStars: number | null;
  opponentStars: number | null;
  ownDestructionPercentage: number | null;
  opponentDestructionPercentage: number | null;
  ownAttacks: number | null;
  opponentAttacks: number | null;
  attacksPerMember: number | null;
  startTime: Date | null;
  endTime: Date | null;
  lastSyncedAt: Date | null;
}

export interface CapitalNavSummary {
  capitalHallLevel: number | null;
  capitalPoints: number | null;
  capitalLeague: { name: string } | null;
  districtCount: number | null;
  lastCaptureAt: Date | null;
}

// ---------------------------------------------------------------------------
// Hall of Fame (all-time clan records)
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
  value: number;         // raw number for sorting
  valueLabel: string;    // human-readable, e.g. "9,616 troops"
  metaLabel?: string;    // optional secondary stat, e.g. "80% rate"
}

export interface HallOfFameLeaderboard {
  awardKey: HallOfFameAwardKey;
  entries: HallOfFameRankedEntry[];
}

export interface HallOfFame {
  leaderboards: HallOfFameLeaderboard[];
  // The single all-time record holder per category (from the DB cache)
  records: Array<{
    awardKey: HallOfFameAwardKey;
    holderName: string;
    holderTag: string;
    recordValue: number;
    valueLabel: string;
    periodLabel: string | null;
    achievedAt: Date;
  }>;
}

// ---------------------------------------------------------------------------
// Full dashboard aggregate (returned by getDashboard())
// ---------------------------------------------------------------------------

export interface DashboardData {
  clan: DashboardClan;
  warRecord: WarRecordView;
  capital: CapitalSummaryView;
  // 24h (default)
  donations: DonationTotals;
  donationTimeline: DonationTimeline;
  donationLeaderboard: DonationLeaderboard;
  // 7d
  donations7d: DonationTotals;
  donationTimeline7d: DonationTimeline;
  donationLeaderboard7d: DonationLeaderboard;
  // 30d
  donations30d: DonationTotals;
  donationTimeline30d: DonationTimeline;
  donationLeaderboard30d: DonationLeaderboard;
  // Activity timelines for all 3 windows
  activityTimeline: ActivityTimeline;
  activityTimeline7d: ActivityTimeline;
  activityTimeline30d: ActivityTimeline;
  // Activity scores for all 3 windows (tabs switch between them)
  activityScore: ActivityScoreLeaderboard;
  activityScore7d: ActivityScoreLeaderboard;
  activityScore30d: ActivityScoreLeaderboard;
  needsAttention: NeedsAttention;
  clanLog: ClanLog;
  warSummary: WarSummaryView;
  capitalNav: CapitalNavSummary;
  hallOfFame: HallOfFame;
  trackingStart: Date | null; // earliest member_snapshots.captured_at across the clan
}


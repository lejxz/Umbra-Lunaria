/**
 * Typed view models for the dashboard.
 *
 * These are the shapes that page components receive — never raw Drizzle rows.
 * Every value is explicitly typed so the UI can render loading, empty, and
 * unavailable states without guessing. See docs/concept/05-dashboard.md and
 * docs/concept/12 Step 1.1.A.
 *
 * Core principle (docs/concept/00-overview.md "Product contract"):
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
// Custom date-range analytics (Phase 3.2 — F11) — the /api/analytics response.
// Same shapes as the preset donation analytics, minus the preset `window`
// tag (replaced by the resolved day range).
// ---------------------------------------------------------------------------

export interface CustomAnalyticsView {
  from: string; // "YYYY-MM-DD" (clan-TZ day keys, as requested & resolved)
  to: string;
  dayCount: number; // inclusive calendar days covered
  totals: Omit<DonationTotals, "window">;
  timeline: Omit<DonationTimeline, "window">;
  leaderboard: Omit<DonationLeaderboard, "window">;
  /** Phase 4 / F10: same day range, membership-event density — additive so
   *  existing consumers of the donation fields are unaffected. */
  membershipTimeline: MembershipTimeline;
  /** Wars ended inside the day range (oldest-first) — the same shape the
   *  dashboard's war performance panel renders, so a custom range swaps in
   *  with zero client-side translation. */
  warPerformanceTrend: WarPerformanceTrend;
  /** Attack-quality aggregates for wars ended inside the day range — the
   *  star-distribution card's slice of the same request. */
  warAttackQuality: WarAttackQualityTrend;
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
  rushed: NeedsAttentionMember[]; // rushed account (>60% rushed)
  // Phase 2.2: received far more than given over the configured window
  // (reset-aware totals, see lib/scoring/donation-ratio.ts). Sorted
  // worst-first (lowest ratio first).
  belowDonationRatio: NeedsAttentionMember[];
  // Active donation-ratio settings (null when the category is disabled) so
  // the UI can label the group with the live threshold and omit it entirely
  // when off — instead of rendering an empty, confusing group.
  donationRatio: { minRatio: number; windowDays: number } | null;
  inactivityThresholdDays: number;
}

// ---------------------------------------------------------------------------
// Clan log (membership events — tracked history)
// ---------------------------------------------------------------------------

export interface ClanLogEntry {
  id: number;
  playerTag: string;
  name: string;
  eventType: "join" | "leave" | "rejoin" | "thUpgrade" | "rename";
  eventTime: Date;
  // Whether the member profile has been purged under the retention policy.
  // When true, the member detail sheet shows "left on [date]; data removed".
  isPurged: boolean;
  metadata?: {
    oldTH?: number;
    newTH?: number;
    oldName?: string;
    newName?: string;
    rushedPercent?: number | null;
  } | null;
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

// ---------------------------------------------------------------------------
// Analytical graph view models (added 2026-07-23)
// ---------------------------------------------------------------------------

export interface WarPerformancePoint {
  endTime: Date;
  opponentName: string;
  /** "regular" | "cwl" — DB text. */
  warType: string;
  /** Roster size per side (5v5 → 5). Drives star-efficiency normalization;
   *  null on legacy rows without a size. */
  teamSize: number | null;
  ownStars: number;
  opponentStars: number;
  ownDestruction: number;
  opponentDestruction: number;
  result: "win" | "loss" | "tie" | null;
}

export interface WarPerformanceTrend {
  points: WarPerformancePoint[]; // oldest-first for left-to-right charts
}

// ---------------------------------------------------------------------------
// Attack quality — per-war own-attack aggregates for the star-distribution
// card (2026-09-16: windowed redesign; replaces the all-time WarAttackDistribution)
// ---------------------------------------------------------------------------

export interface WarAttackQualityPoint {
  endTime: Date;
  /** Roster size per side (5v5 → 5); null on legacy rows. */
  teamSize: number | null;
  /** Attacks recorded for this war (own clan only — the ingest only writes
   *  rows for our attackers). */
  attacks: number;
  /** Sum of stars across those attacks. */
  starsSum: number;
  /** Sum of destruction % across those attacks. */
  destructionSum: number;
  /** Per-tier attack counts (3★ tier folds stars ≥ 3). */
  threeStar: number;
  twoStar: number;
  oneStar: number;
  zeroStar: number;
  /** Per-tier destruction sums — avg destruction per tier in the tooltip. */
  destSumThreeStar: number;
  destSumTwoStar: number;
  destSumOneStar: number;
  destSumZeroStar: number;
}

export interface WarAttackQualityTrend {
  points: WarAttackQualityPoint[]; // oldest-first, same contract as performance
}

export interface RosterSizePoint {
  timestamp: Date;
  /** Clan-TZ day key "2026-09-14" — from to_char in SQL, so day alignment
   *  never round-trips a naive pg timestamp through a Date (the Phase 4
   *  sidestep). Consumed by lib/scoring/clan-pulse.ts. */
  dayKey: string;
  count: number;
}

export interface RosterSizeTrend {
  points: RosterSizePoint[];
  windowDays: number;
}


// ---------------------------------------------------------------------------
// Clan Pulse — combined Activity × Roster panel (2026-09-14, user request:
// "combine Activity Analytics and Roster growth and improve it"). Pure
// assembly in lib/scoring/clan-pulse.ts; query-layer composition only.
// ---------------------------------------------------------------------------

export type PulseDirection = "up" | "down" | "flat";

export interface ClanPulsePoint {
  /** Axis label from the activity bucket ("14:00" / "Mon" / "Jul 1"). */
  label: string;
  /** Distinct members with an activity-flagged snapshot in the bucket. */
  active: number;
  /** Roster size on the bucket's clan-TZ day (carry-forward), null before
   *  the first roster day. */
  roster: number | null;
  /** active ÷ roster × 100 — null when roster is unknown/zero. */
  rate: number | null;
}

export interface ClanPulseVerdict {
  growth: PulseDirection | null;
  engagement: PulseDirection | null;
  /** "Thriving", "Growing, diluting", "Tightening core", "Fading",
   *  "Steady…", or "Warming up". */
  label: string;
  /** One-liner for the pill tooltip. */
  description: string;
  tone: "success" | "warning" | "danger" | "muted";
}

export interface ClanPulse {
  window: DonationWindow;
  points: ClanPulsePoint[];
  totalActiveMembers: number;
  totalMembers: number;
  hasPartialData: boolean;
  /** Roster size on the last bucket's day (null = no roster days yet). */
  rosterNow: number | null;
  /** Last day's roster − window-start roster (null when unknown). */
  rosterDelta: number | null;
  /** Mean of the per-bucket engagement rates (null when none measurable). */
  avgRate: number | null;
  /** Second-half mean − first-half mean, in percentage points. */
  rateTrendPp: number | null;
  verdict: ClanPulseVerdict;
}

// ---------------------------------------------------------------------------
// Membership timeline (Phase 4 — F10 "clan history timeline")
// ---------------------------------------------------------------------------

/** Windows the clan-history panel offers. Precomputed server-side so tab
 *  switches cost zero fetches (same pattern as the donation windows). */
export type MembershipWindow = "30d" | "90d" | "all";

export interface MembershipTimelinePoint {
  /** Axis label, "Jul 22" — clan-TZ calendar day. */
  label: string;
  /** Clan-TZ day key "2026-07-22". */
  day: string;
  join: number;
  rejoin: number;
  leave: number;
  thUpgrade: number;
  rename: number;
  /** Distinct members whose capital contribution rose that day. */
  capitalContributors: number;
  /** Total capital resources contributed that day (tooltip only). */
  capitalAmount: number;
}

export interface MembershipTimelineTotals {
  join: number;
  rejoin: number;
  leave: number;
  thUpgrade: number;
  rename: number;
  capitalContributors: number;
  /** join + rejoin − leave. */
  netRosterChange: number;
}

export interface MembershipTimeline {
  window: MembershipWindow | "custom";
  points: MembershipTimelinePoint[]; // oldest-first, one per clan-TZ day
  totals: MembershipTimelineTotals;
}

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
  // Clan Pulse — combined Activity × Roster panel, all 3 windows
  // (activity timelines + roster trend merged by lib/scoring/clan-pulse.ts)
  clanPulse: ClanPulse;
  clanPulse7d: ClanPulse;
  clanPulse30d: ClanPulse;
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
  // Analytical graphs
  warPerformanceTrend: WarPerformanceTrend;
  warAttackQuality: WarAttackQualityTrend;
  // Clan history timeline (Phase 4 / F10) — all three windows precomputed
  membershipTimeline30d: MembershipTimeline;
  membershipTimeline90d: MembershipTimeline;
  membershipTimelineAll: MembershipTimeline;
}


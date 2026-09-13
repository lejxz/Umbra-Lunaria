/**
 * Career snapshot diffs — pure logic for Phase 3.1
 * (docs/2026-09-11-implementation-plan.md §3.1 + §1.5 item 7).
 *
 * The daily batch writes one `member_career_snapshots` row per retained
 * member before overwriting `members.career_stats`. This module diffs two
 * captures:
 *
 *   1. `careerMoved` — day-grain ACTIVITY evidence (implementation-plan
 *      §1.5 item 7): career totals only move when the account PLAYED, so a
 *      delta marks the day active. Used by the ingest route to flag the
 *      day's last snapshot.
 *   2. `diffCareerProgress` — the member-detail "Progress (window)" view:
 *      scalar deltas (war stars, attack wins, …) + per-achievement deltas.
 *
 * Pure: no DB, no React, no I/O. Tested in tests/lib/career-deltas.test.ts.
 */

// ---------------------------------------------------------------------------
// Shapes — decoupled from both the Drizzle row and the raw CoC payload so
// tests can pass plain fixtures.
// ---------------------------------------------------------------------------

/** The scalar career fields snapshotted per daily batch. */
export interface CareerScalars {
  warStars: number | null;
  attackWins: number | null;
  defenseWins: number | null;
  clanCapitalContributions: number | null;
  expLevel: number | null;
}

/** One entry of the achievements array inside `career_stats`. */
export interface CareerAchievementEntry {
  name: string;
  value: number;
  target?: number | null;
  stars?: number | null;
  village?: string | null;
}

/** A career capture: scalars + the achievements payload (either side of the diff). */
export interface CareerCapture {
  scalars: CareerScalars;
  achievements: CareerAchievementEntry[];
}

/** The diff result consumed by the member-detail Progress section. */
export interface CareerProgress {
  /** Scalar deltas — null when either side lacks the field (no fabricated zeros). */
  warStars: number | null;
  attackWins: number | null;
  defenseWins: number | null;
  clanCapitalContributions: number | null;
  expLevels: number | null;
  /** Achievements that rose, sorted by delta descending. */
  achievements: Array<{
    name: string;
    delta: number;
    from: number;
    to: number;
    target: number | null;
  }>;
  /** True when nothing moved (all deltas zero / no moved achievements). */
  noChange: boolean;
}

// ---------------------------------------------------------------------------
// careerMoved — day-grain activity evidence (§1.5 item 7)
// ---------------------------------------------------------------------------

/**
 * Whether the career state MOVED between two daily captures in a way that
 * proves the member played (and therefore logged in) — marks the day active.
 *
 * Signal set (deliberate):
 *   - warStars, attackWins, clanCapitalContributions ↑ — unambiguous play.
 *   - any achievement `value` ↑ — achievements only advance through play.
 *   - expLevel is EXCLUDED here: it is already interval-grain evidence via
 *     member_snapshots.exp_level (Phase 1), so counting it again at day grain
 *     would double-credit the same day.
 *   - defenseWins is EXCLUDED: it rises when OTHER players lose attacks
 *     against this village — the member never had to log in.
 *   - trophies are not snapshotted here at all (attack evidence, already
 *     covered by the 5-minute poll).
 */
export function careerMoved(
  prev: CareerCapture | null,
  cur: CareerCapture | null,
): boolean {
  if (!prev || !cur) return false;

  const rose = (a: number | null, b: number | null): boolean =>
    a !== null && b !== null && b > a;

  if (
    rose(prev.scalars.warStars, cur.scalars.warStars) ||
    rose(prev.scalars.attackWins, cur.scalars.attackWins) ||
    rose(prev.scalars.clanCapitalContributions, cur.scalars.clanCapitalContributions)
  ) {
    return true;
  }

  return achievementsMoved(prev.achievements, cur.achievements);
}

/**
 * True when any achievement `value` rose between the two captures.
 * Achievements present on only one side (API payload drift) do not count as
 * movement — a missing name on the other side is absence of evidence, not
 * evidence of zero.
 */
export function achievementsMoved(
  prev: CareerAchievementEntry[],
  cur: CareerAchievementEntry[],
): boolean {
  if (prev.length === 0 || cur.length === 0) return false;
  const prevByName = new Map(prev.map((a) => [a.name, a.value]));
  for (const a of cur) {
    const before = prevByName.get(a.name);
    if (before !== undefined && a.value > before) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// diffCareerProgress — the "Progress (window)" view
// ---------------------------------------------------------------------------

/**
 * Diff two career captures for the member-detail Progress section.
 * `prev` is the baseline (snapshot at/before the window start — may be null
 * on a cold tracker); `cur` is the latest capture (the live members row).
 */
export function diffCareerProgress(
  prev: CareerCapture | null,
  cur: CareerCapture | null,
): CareerProgress {
  const curScalars = cur?.scalars ?? null;

  if (!prev || !curScalars) {
    // No baseline (or no current data): the window predates tracking — every
    // delta is unknown, not zero. The UI renders a "tracking started" note.
    return {
      warStars: null,
      attackWins: null,
      defenseWins: null,
      clanCapitalContributions: null,
      expLevels: null,
      achievements: [],
      noChange: true,
    };
  }

  const diff = (a: number | null, b: number | null): number | null =>
    a !== null && b !== null ? b - a : null;

  const warStars = diff(prev.scalars.warStars, curScalars.warStars);
  const attackWins = diff(prev.scalars.attackWins, curScalars.attackWins);
  const defenseWins = diff(prev.scalars.defenseWins, curScalars.defenseWins);
  const clanCapitalContributions = diff(
    prev.scalars.clanCapitalContributions,
    curScalars.clanCapitalContributions,
  );
  const expLevels = diff(prev.scalars.expLevel, curScalars.expLevel);

  // Per-achievement deltas — matched by name, only RISING values are shown
  // (a decrease is API counter drift, not negative progress).
  const curByName = new Map(
    (cur?.achievements ?? []).map((a) => [a.name, a] as const),
  );
  const achievements: CareerProgress["achievements"] = [];
  for (const before of prev.achievements) {
    const after = curByName.get(before.name);
    if (!after) continue;
    const delta = after.value - before.value;
    if (delta > 0) {
      achievements.push({
        name: before.name,
        delta,
        from: before.value,
        to: after.value,
        target: after.target ?? null,
      });
    }
  }
  achievements.sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name));

  const noChange =
    (warStars ?? 0) === 0 &&
    (attackWins ?? 0) === 0 &&
    (defenseWins ?? 0) === 0 &&
    (clanCapitalContributions ?? 0) === 0 &&
    (expLevels ?? 0) === 0 &&
    achievements.length === 0;

  return {
    warStars,
    attackWins,
    defenseWins,
    clanCapitalContributions,
    expLevels,
    achievements,
    noChange,
  };
}

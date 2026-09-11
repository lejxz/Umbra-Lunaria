/**
 * Membership reconciliation — pure logic extracted from the ingest route so it
 * can be unit-tested without a database (docs/concept/12 Step 1.0.D / the
 * "mocked query boundary" test strategy — see tests/README.md).
 *
 * `reconcileMembership` takes the live roster + the known member rows and
 * decides what to do with each tag: join, rejoin, refresh, or leave. It
 * returns a list of operations + event counts; the ingest route applies them
 * to the DB. `computeActivityFlags` derives the reset-aware activity/login
 * flags from the current member + prior snapshot.
 *
 * Pure: no DB, no React, no I/O. Inputs in, decisions out.
 */

/** Minimal known-member shape — the fields reconciliation reads. */
export interface KnownMember {
  playerTag: string;
  name: string;
  leftAt: Date | null;
}

/** Minimal live-member shape — the fields reconciliation reads. */
export interface LiveMember {
  tag: string;
  name: string;
}

export type MembershipOp =
  | { type: "join"; tag: string; name: string }
  | { type: "rejoin"; tag: string; name: string }
  | { type: "refresh"; tag: string }
  | { type: "leave"; tag: string; name: string; purgeAt: Date };

export interface ReconciliationResult {
  operations: MembershipOp[];
  events: { joins: number; leaves: number; rejoins: number };
}

/**
 * Decide what to do with each member tag given the live roster vs the known
 * (retained + departed) member rows.
 *
 * Rules (docs/concept/03 "Retention and privacy contract" + docs/concept/04
 * "Light-poll sequence"):
 *   - Live tag not in known        → join (new member)
 *   - Live tag in known, leftAt set → rejoin (clear departure)
 *   - Live tag in known, no leftAt  → refresh (existing retained)
 *   - Known retained tag not in live → leave (set leftAt + purgeAt)
 *   - Known departed tag not in live → no-op (already left)
 *
 * `capturedAt` is the poll timestamp; `retentionDays` is from clanConfig.
 * The purge deadline is `capturedAt + retentionDays`.
 *
 * Failed-poll safety (docs/concept/04 #3): this function is NOT called when the
 * clan fetch fails — the ingest route returns early before reconciliation, so
 * a failed poll never produces spurious leaves. That control-flow guarantee
 * is verified by inspection of `runLightPoll`; the pure function itself
 * faithfully reports leaves for every retained member missing from the live
 * roster, which is correct only when the live roster was successfully fetched.
 */
export function reconcileMembership(
  liveMembers: readonly LiveMember[],
  knownMembers: readonly KnownMember[],
  capturedAt: Date,
  retentionDays: number,
): ReconciliationResult {
  const liveTags = new Set(liveMembers.map((m) => m.tag));
  const knownMap = new Map(knownMembers.map((m) => [m.playerTag, m]));
  const operations: MembershipOp[] = [];
  const events = { joins: 0, leaves: 0, rejoins: 0 };

  // ---- Live members: join / rejoin / refresh ----
  for (const live of liveMembers) {
    const known = knownMap.get(live.tag);
    if (!known) {
      events.joins++;
      operations.push({ type: "join", tag: live.tag, name: live.name });
    } else if (known.leftAt) {
      events.rejoins++;
      operations.push({ type: "rejoin", tag: live.tag, name: live.name });
    } else {
      operations.push({ type: "refresh", tag: live.tag });
    }
  }

  // ---- Known retained members missing from live → leave ----
  for (const known of knownMembers) {
    if (known.leftAt) continue; // already departed — no change
    if (liveTags.has(known.playerTag)) continue; // still in clan
    events.leaves++;
    const purgeAt = new Date(capturedAt);
    purgeAt.setDate(purgeAt.getDate() + retentionDays);
    operations.push({
      type: "leave",
      tag: known.playerTag,
      name: known.name,
      purgeAt,
    });
  }

  return { operations, events };
}

// ---------------------------------------------------------------------------
// Activity flags — derived from the current member vs the prior snapshot.
// ---------------------------------------------------------------------------

/** Minimal prior-snapshot shape — the fields activity-flag logic reads. */
export interface PriorSnapshot {
  donations: number;
  donationsReceived: number;
  trophies: number;
  builderBaseTrophies: number | null;
  /** XP level at the prior snapshot (Phase 1 signal; null before migration 0011 data exists). */
  expLevel?: number | null;
}

/** Minimal current-member shape for activity flags. */
export interface CurrentMemberCounters {
  donations: number;
  donationsReceived: number;
  trophies: number;
  builderBaseTrophies?: number | null;
  expLevel?: number | null;
}

export interface ActivityFlags {
  activityFlag: boolean;
  loginDayFlag: boolean;
}

/**
 * Derive the reset-aware activity + estimated-login flags for a member this
 * poll (docs/concept/04 "Activity and estimated login evidence" + "War, XP
 * and day-grain evidence").
 *
 *   activityFlag  = donations given ↑ OR received ↑ OR trophies changed OR
 *                   Builder Base trophies changed OR XP level ↑ OR at least
 *                   one war attack in the interval.
 *   loginDayFlag  = donations given ↑ OR received ↑ OR at least one war
 *                   attack in the interval. (A counter reset alone never
 *                   counts as a login; trophy/XP movement is treated as
 *                   attack/progress evidence, not unambiguous login
 *                   evidence — only donation movement and performing a war
 *                   attack require the player to be demonstrably playing.)
 *
 * `warAttacksInInterval` is the number of this member's war attacks first
 * recorded in the half-open interval (prior snapshot, now] — the evidence
 * query in the ingest route reads `war_attacks.attacked_at`, which the war
 * sync stamps at poll time, so attacks from BOTH regular and CWL wars count
 * (the query does not filter war type). Performing a war attack is
 * unambiguous login evidence, so it sets BOTH flags — this closes the
 * "doesn't donate or request but fights every war" blind spot.
 *
 * When `lastSnapshot` is null (first-ever poll for this member), the
 * cumulative counters have no baseline — but war attacks are exact,
 * event-based evidence, so they still count even on the first snapshot.
 * The default `0` keeps the legacy baseline behavior for every caller that
 * has no war evidence.
 */
export function computeActivityFlags(
  current: CurrentMemberCounters,
  lastSnapshot: PriorSnapshot | null,
  warAttacksInInterval = 0,
): ActivityFlags {
  const warEvidence = warAttacksInInterval > 0;
  if (!lastSnapshot) {
    return {
      activityFlag: warEvidence,
      loginDayFlag: warEvidence,
    };
  }
  const donationsIncreased = current.donations > lastSnapshot.donations;
  const receivedIncreased =
    current.donationsReceived > lastSnapshot.donationsReceived;
  const trophiesChanged = current.trophies !== lastSnapshot.trophies;
  const bbTrophiesChanged =
    current.builderBaseTrophies != null &&
    lastSnapshot.builderBaseTrophies != null &&
    current.builderBaseTrophies !== lastSnapshot.builderBaseTrophies;
  // XP only ever rises, and every XP source (war attacks, multiplayer,
  // donations, obstacle removal) requires gameplay — a strict increase is
  // activity evidence. Null (column new / value absent) is not evidence.
  const expLevelIncreased =
    current.expLevel != null &&
    lastSnapshot.expLevel != null &&
    current.expLevel > lastSnapshot.expLevel;

  return {
    activityFlag:
      donationsIncreased ||
      receivedIncreased ||
      trophiesChanged ||
      bbTrophiesChanged ||
      expLevelIncreased ||
      warEvidence,
    loginDayFlag: donationsIncreased || receivedIncreased || warEvidence,
  };
}

/**
 * Membership reconciliation — pure logic extracted from the ingest route so it
 * can be unit-tested without a database (concept/12 Step 1.0.D / the
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
 * Rules (concept/03 "Retention and privacy contract" + concept/04
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
 * Failed-poll safety (concept/04 #3): this function is NOT called when the
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
}

/** Minimal current-member shape for activity flags. */
export interface CurrentMemberCounters {
  donations: number;
  donationsReceived: number;
  trophies: number;
  builderBaseTrophies?: number | null;
}

export interface ActivityFlags {
  activityFlag: boolean;
  loginDayFlag: boolean;
}

/**
 * Derive the reset-aware activity + estimated-login flags for a member this
 * poll (concept/04 "Activity and estimated login evidence").
 *
 *   activityFlag  = donations given ↑ OR received ↑ OR trophies changed OR
 *                   Builder Base trophies changed.
 *   loginDayFlag  = donations given ↑ OR received ↑ (a counter reset alone
 *                   never counts as a login).
 *
 * When `lastSnapshot` is null (first-ever poll for this member), both flags
 * are false — the first sample is a baseline, not evidence of activity.
 */
export function computeActivityFlags(
  current: CurrentMemberCounters,
  lastSnapshot: PriorSnapshot | null,
): ActivityFlags {
  if (!lastSnapshot) {
    return { activityFlag: false, loginDayFlag: false };
  }
  const donationsIncreased = current.donations > lastSnapshot.donations;
  const receivedIncreased =
    current.donationsReceived > lastSnapshot.donationsReceived;
  const trophiesChanged = current.trophies !== lastSnapshot.trophies;
  const bbTrophiesChanged =
    current.builderBaseTrophies != null &&
    lastSnapshot.builderBaseTrophies != null &&
    current.builderBaseTrophies !== lastSnapshot.builderBaseTrophies;

  return {
    activityFlag:
      donationsIncreased || receivedIncreased || trophiesChanged || bbTrophiesChanged,
    loginDayFlag: donationsIncreased || receivedIncreased,
  };
}

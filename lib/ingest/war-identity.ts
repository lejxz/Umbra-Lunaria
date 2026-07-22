/**
 * War identity matching — pure logic extracted from `syncCurrentWar` so it can
 * be unit-tested without a database (concept/12 Step 1.0.D / the "mocked
 * query boundary" test strategy — see tests/README.md).
 *
 * `matchExistingWar` implements the stable-identity rule that makes war sync
 * idempotent across preparation → inWar → warEnded transitions:
 *   - CWL (`warTag` provided)        → match on `war_tag`
 *   - Regular (`warTag` undefined)   → match on (opponent_tag + start_time)
 *
 * Duplicate-attack protection is enforced by the `war_attacks` unique index on
 * (war_id, attacker_tag, attack_order) + `onConflictDoNothing` at the DB
 * layer; this function only handles war-row identity, which is the part that
 * decides insert-vs-update.
 *
 * Pure: no DB, no React, no I/O. Inputs in, match out.
 */

/** Minimal existing-war row shape — the fields identity matching reads. */
export interface ExistingWarRow {
  id: number;
  warTag: string | null;
  opponentTag: string | null;
  startTime: Date | null;
}

/** Minimal current-war shape — the fields identity matching reads. */
export interface CurrentWarIdentity {
  opponentTag?: string;
  startTime: Date | null;
}

/**
 * Find the existing war row that represents the same war as `currentWar`, if
 * any. Returns the match (or undefined) so the caller can decide insert vs
 * update.
 *
 * `warTag` is the CWL war tag (`#...`) when syncing a CWL war; undefined for
 * regular wars. `existingWars` is the candidate set (in practice, the result
 * of a filtered SELECT — but this function is agnostic to how the set was
 * fetched, so tests can pass any array).
 */
export function matchExistingWar(
  existingWars: readonly ExistingWarRow[],
  currentWar: CurrentWarIdentity,
  warTag?: string,
): ExistingWarRow | undefined {
  if (warTag) {
    // CWL — match on war_tag.
    return existingWars.find((w) => w.warTag === warTag);
  }
  // Regular — match on (opponent_tag + start_time). Both must be present.
  if (!currentWar.opponentTag || !currentWar.startTime) return undefined;
  const startMs = currentWar.startTime.getTime();
  return existingWars.find(
    (w) =>
      w.opponentTag === currentWar.opponentTag &&
      w.startTime !== null &&
      w.startTime.getTime() === startMs,
  );
}

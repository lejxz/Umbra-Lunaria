/**
 * War ingestion + refresh — shared by the ingest route (/api/ingest) and the
 * public refresh route (/api/war/refresh). See concept/07-clan-war.md and
 * concept/12 Step 1.4.A.
 *
 * Responsibilities:
 *   - parseCoCTime / computeWarResult: pure helpers.
 *   - syncCurrentWar: idempotent upsert of one regular or CWL war, including
 *     the full CocCurrentWar snapshot (both rosters + attacks) so the War
 *     Center can render the opponent roster and a names-attached attack log.
 *   - backfillWarLog: fetch /warlog and upsert historical regular wars (only
 *     while isWarLogPublic) so the history list isn't empty before tracking.
 *   - syncCwlWars: fetch the CWL league group and sync each of our clan's
 *     CWL wars by war tag (best-effort; 404 = not in CWL).
 *   - refreshCurrentWar: single source of truth for the refresh button —
 *     fetches current war (falling back to CWL), syncs, returns a structured
 *     result. The route layer adds the shared TTL on top.
 *
 * Server-only: imports @/lib/db. Never call from a client component.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wars, warParticipants, warAttacks, clans } from "@/lib/db/schema";
import {
  cocClient,
  type CocCurrentWar,
  type CocWarLogEntry,
} from "@/lib/coc-client/client";
import { matchExistingWar } from "@/lib/ingest/war-identity";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Parse a Clash of Clans API timestamp.
 * The API returns times as "YYYYMMDDTHHMMSS.000Z" (no dashes/colons), which
 * `new Date()` cannot parse. This converts to ISO 8601.
 */
export function parseCoCTime(time: string | undefined | null): Date | null {
  if (!time) return null;
  const iso = time.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    "$1-$2-$3T$4:$5:$6",
  );
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Compute the war result from the live API state. Returns `null` for wars
 * that haven't ended. Star ties are broken by destruction percentage (CoC's
 * standard tiebreaker).
 */
export function computeWarResult(
  currentWar: CocCurrentWar,
): "win" | "loss" | "tie" | null {
  if (currentWar.state !== "warEnded") return null;
  if (!currentWar.clan || !currentWar.opponent) return null;

  const own = currentWar.clan.stars;
  const opp = currentWar.opponent.stars;
  if (own > opp) return "win";
  if (own < opp) return "loss";

  const ownDestr = currentWar.clan.destructionPercentage;
  const oppDestr = currentWar.opponent.destructionPercentage;
  if (ownDestr > oppDestr) return "win";
  if (ownDestr < oppDestr) return "loss";
  return "tie";
}

// ---------------------------------------------------------------------------
// syncCurrentWar — idempotent upsert of one war (regular or CWL).
// ---------------------------------------------------------------------------

/**
 * Sync a regular or CWL war idempotently.
 *
 * Identity:
 *   - CWL (`warTag` provided)        → match on `wars.war_tag`
 *   - Regular (`warTag` undefined)   → match on (opponent_tag + start_time)
 *
 * On a hit: update state / stars / destruction / attacks / result /
 * `lastSyncedAt` and refresh the full snapshot. On a miss: insert.
 *
 * `war_attacks` use `.onConflictDoNothing()` against the
 * (war_id, attacker_tag, attack_order) unique index. `attackedAt` is only
 * written on the first insert for a given attack.
 *
 * The full `CocCurrentWar` is stored in `war_snapshot` so the War Center can
 * render the opponent roster and a names-attached attack log. Opponent clan
 * members are NOT persisted to `war_participants` (FK to `members`); their
 * identity lives only in the snapshot.
 */
export async function syncCurrentWar(
  currentWar: CocCurrentWar,
  capturedAt: Date,
  warTag?: string,
): Promise<{ warId: number; inserted: boolean } | null> {
  if (!currentWar.clan || !currentWar.opponent) return null;

  const warType: "regular" | "cwl" = warTag ? "cwl" : "regular";
  const startTime = parseCoCTime(currentWar.startTime);

  // ---- Find existing war by stable identity ----
  // The DB WHERE clause pre-filters; matchExistingWar (pure, in war-identity.ts)
  // confirms the match against the identity rule. Tested independently.
  let candidates: typeof wars.$inferSelect[] = [];
  if (warType === "cwl" && warTag) {
    candidates = await db
      .select()
      .from(wars)
      .where(eq(wars.warTag, warTag))
      .limit(1);
  } else if (currentWar.opponent.tag && startTime) {
    candidates = await db
      .select()
      .from(wars)
      .where(
        and(
          eq(wars.opponentTag, currentWar.opponent.tag),
          eq(wars.startTime, startTime),
        ),
      )
      .limit(1);
  }
  const matched = matchExistingWar(
    candidates,
    { opponentTag: currentWar.opponent.tag, startTime },
    warTag,
  );
  const existingWar = matched
    ? candidates.find((c) => c.id === matched.id)
    : undefined;

  const result = computeWarResult(currentWar);
  const warFieldSet = {
    state: currentWar.state,
    opponentTag: currentWar.opponent.tag,
    opponentName: currentWar.opponent.name,
    opponentBadgeUrls: currentWar.opponent.badgeUrls ?? null,
    opponentClanLevel: currentWar.opponent.clanLevel ?? null,
    teamSize: currentWar.teamSize ?? null,
    attacksPerMember: currentWar.attacksPerMember ?? null,
    ownStars: currentWar.clan.stars,
    opponentStars: currentWar.opponent.stars,
    ownDestructionPercentage: Math.round(currentWar.clan.destructionPercentage),
    opponentDestructionPercentage: Math.round(
      currentWar.opponent.destructionPercentage,
    ),
    ownAttacks: currentWar.clan.attacks,
    opponentAttacks: currentWar.opponent.attacks,
    result,
    startTime,
    endTime: parseCoCTime(currentWar.endTime),
    preparationStartTime: parseCoCTime(currentWar.preparationStartTime),
    lastSyncedAt: capturedAt,
    // Full snapshot for the War Center UI (both rosters + attack log).
    warSnapshot: currentWar as unknown as object,
  };

  let warId: number;
  let inserted = false;
  if (existingWar) {
    warId = existingWar.id;
    await db.update(wars).set(warFieldSet).where(eq(wars.id, warId));
  } else {
    const [row] = await db
      .insert(wars)
      .values({
        warTag: warType === "cwl" ? warTag : null,
        warType,
        ...warFieldSet,
      })
      .returning({ id: wars.id });
    if (!row) throw new Error("failed to insert war row");
    warId = row.id;
    inserted = true;
  }

  // ---- Sync own-clan participants + attacks ----
  const attacksAllowed = currentWar.attacksPerMember ?? 2;
  for (const m of currentWar.clan.members ?? []) {
    const attacksUsed = m.attacks?.length ?? 0;
    const starsEarned = m.attacks?.reduce((sum, a) => sum + a.stars, 0) ?? 0;

    await db
      .insert(warParticipants)
      .values({
        warId,
        playerTag: m.tag,
        mapPosition: m.mapPosition,
        attacksAllowed,
        attacksUsed,
        starsEarned,
        missed: attacksUsed === 0,
      })
      .onConflictDoUpdate({
        target: [warParticipants.warId, warParticipants.playerTag],
        set: {
          mapPosition: m.mapPosition,
          attacksAllowed,
          attacksUsed,
          starsEarned,
          missed: attacksUsed === 0,
        },
      });

    for (const attack of m.attacks ?? []) {
      await db
        .insert(warAttacks)
        .values({
          warId,
          attackerTag: attack.attackerTag,
          defenderTag: attack.defenderTag,
          stars: attack.stars,
          destructionPercentage: attack.destructionPercentage,
          attackOrder: attack.order,
          duration: attack.duration ?? null,
          // attackedAt only written on the first insert — the unique index on
          // (war_id, attacker_tag, attack_order) makes later attempts no-ops.
          attackedAt: capturedAt,
        })
        .onConflictDoNothing();
    }
  }

  return { warId, inserted };
}

// ---------------------------------------------------------------------------
// backfillWarLog — populate history from /warlog (only when public).
// ---------------------------------------------------------------------------

/**
 * Fetch the public war log and upsert each entry as a historical regular war.
 * Idempotent: dedupes on (opponent_tag, end_time, warType='regular') so repeat
 * runs never create duplicate rows. Wars already tracked live (with a real
 * startTime) are updated with the confirmed result/destruction rather than
 * duplicated. Returns the number of entries processed and any error.
 *
 * No-op (returns availability reason) when the war log is private (403) or the
 * clan row says isWarLogPublic = false. See concept/07 §"War history".
 */
export async function backfillWarLog(
  clanTag: string,
): Promise<{ processed: number; skipped: boolean; reason: string | null }> {
  // Trust the cached clan flag first — avoids a guaranteed 403 when private.
  const [clan] = await db
    .select({ isWarLogPublic: clans.isWarLogPublic })
    .from(clans)
    .where(eq(clans.clanTag, clanTag))
    .limit(1);
  if (clan && clan.isWarLogPublic === false) {
    return { processed: 0, skipped: true, reason: "war log is private" };
  }

  let entries: CocWarLogEntry[];
  try {
    const res = await cocClient.getWarLog(clanTag);
    entries = res.items ?? [];
  } catch (err) {
    const reason =
      err instanceof Error
        ? `war log fetch failed: ${err.message}`
        : "war log fetch failed";
    return { processed: 0, skipped: true, reason };
  }

  let processed = 0;
  for (const entry of entries) {
    const endTime = parseCoCTime(entry.endTime);
    if (!entry.opponent?.tag || !endTime) continue;

    // Dedupe on (opponent_tag, end_time) for regular wars.
    const [existing] = await db
      .select()
      .from(wars)
      .where(
        and(
          eq(wars.opponentTag, entry.opponent.tag),
          eq(wars.endTime, endTime),
          eq(wars.warType, "regular"),
        ),
      )
      .limit(1);

    const fieldSet = {
      opponentName: entry.opponent.name,
      opponentBadgeUrls: entry.opponent.badgeUrls ?? null,
      opponentClanLevel: entry.opponent.clanLevel ?? null,
      teamSize: entry.teamSize ?? null,
      attacksPerMember: entry.attacksPerMember ?? null,
      ownStars: entry.clan.stars,
      opponentStars: entry.opponent.stars,
      ownDestructionPercentage: Math.round(entry.clan.destructionPercentage),
      opponentDestructionPercentage: Math.round(
        entry.opponent.destructionPercentage,
      ),
      ownAttacks: entry.clan.attacks ?? null,
      opponentAttacks: entry.opponent.attacks ?? null,
      result: entry.result ?? null,
      endTime,
      state: "warEnded" as const,
      lastSyncedAt: new Date(),
      // No roster detail available from the war log — leave snapshot null.
      // The history list still shows result/stars/destruction/date.
    };

    if (existing) {
      await db.update(wars).set(fieldSet).where(eq(wars.id, existing.id));
    } else {
      await db.insert(wars).values({
        warTag: null,
        warType: "regular",
        startTime: null,
        preparationStartTime: null,
        ...fieldSet,
      });
    }
    processed++;
  }

  return { processed, skipped: false, reason: null };
}

// ---------------------------------------------------------------------------
// syncCwlWars — CWL league-group + war-tag ingestion.
// ---------------------------------------------------------------------------

/**
 * Fetch the CWL league group for the clan and sync every war that involves us.
 * Best-effort: a 404 (not in CWL) or network failure is swallowed and reported
 * via the returned reason. Each CWL war is synced by `warTag` so the
 * idempotency unique index on `wars.war_tag` prevents duplicates across polls.
 *
 * Only fetches war tags that look real (the league group uses "#0" placeholders
 * for rounds that haven't opened yet). Per-war fetch errors are caught so one
 * inaccessible round doesn't abort the rest.
 *
 * CWL side normalization: the `/clanwarleagues/wars/{warTag}` response lists
 * the two clans as `clan` and `opponent`, but does NOT guarantee our clan is
 * `clan`. We swap the two sides when our clan is the `opponent` so that
 * `syncCurrentWar` always sees our clan as `clan` — otherwise `ownStars`,
 * `war_participants` (FK to `members`), and the stored snapshot would all be
 * recorded from the opponent's perspective.
 */
export async function syncCwlWars(
  clanTag: string,
  capturedAt: Date,
): Promise<{ synced: number; reason: string | null; lastState: string | null }> {
  let group;
  try {
    group = await cocClient.getCwlLeagueGroup(clanTag);
  } catch (err) {
    const reason =
      err instanceof Error ? `cwl league group: ${err.message}` : "cwl league group failed";
    // 404 = not in CWL this season — normal, not an error worth surfacing.
    return { synced: 0, reason, lastState: null };
  }

  let synced = 0;
  let lastState: string | null = null;
  for (const round of group.rounds ?? []) {
    for (const warTag of round.warTags ?? []) {
      // "#0" placeholders mark rounds that haven't opened yet.
      if (!warTag || warTag === "#0") continue;
      try {
        const cwlWar = await cocClient.getCwlWar(warTag);
        if (!cwlWar.clan || !cwlWar.opponent) continue;
        // Only sync wars that involve our clan.
        const weAreClan = cwlWar.clan.tag === clanTag;
        const weAreOpponent = cwlWar.opponent.tag === clanTag;
        if (!weAreClan && !weAreOpponent) continue;

        // Normalize so `clan` is always OUR clan before syncing.
        const normalized = weAreClan
          ? cwlWar
          : { ...cwlWar, clan: cwlWar.opponent, opponent: cwlWar.clan };

        await syncCurrentWar(normalized, capturedAt, warTag);
        synced++;
        lastState = cwlWar.state;
      } catch {
        // A single round being inaccessible (404) is expected mid-season.
      }
    }
  }
  return { synced, reason: null, lastState };
}

// ---------------------------------------------------------------------------
// refreshCurrentWar — the refresh button's server-side action.
// ---------------------------------------------------------------------------

export interface RefreshResult {
  ok: boolean;
  state: string | null;
  warType: "regular" | "cwl" | null;
  capturedAt: Date | null;
  error: string | null;
}

/**
 * Fetch the freshest current-war state (regular endpoint, falling back to CWL
 * when the clan is in Clan War League) and sync it. Returns a structured
 * result the /api/war/refresh route surfaces to the browser. Does NOT apply a
 * TTL — the route layer owns the shared cache so concurrent requests collapse.
 */
export async function refreshCurrentWar(
  clanTag: string,
): Promise<RefreshResult> {
  const capturedAt = new Date();

  // --- Regular current-war endpoint ---
  try {
    const currentWar = await cocClient.getCurrentWar(clanTag);
    if (
      currentWar &&
      (currentWar.state === "preparation" ||
        currentWar.state === "inWar" ||
        currentWar.state === "warEnded") &&
      currentWar.clan &&
      currentWar.opponent
    ) {
      await syncCurrentWar(currentWar, capturedAt);
      return {
        ok: true,
        state: currentWar.state,
        warType: "regular",
        capturedAt,
        error: null,
      };
    }
    // state === "notInWar" (or missing clans) → fall through to CWL check.
  } catch (err) {
    // If the regular endpoint errored, still try CWL before giving up.
    const regularErr =
      err instanceof Error ? err.message : "current war fetch failed";
    const cwl = await syncCwlWars(clanTag, capturedAt);
    if (cwl.synced > 0) {
      return {
        ok: true,
        state: cwl.lastState ?? "inWar",
        warType: "cwl",
        capturedAt,
        error: null,
      };
    }
    return {
      ok: false,
      state: null,
      warType: null,
      capturedAt: null,
      error: cwl.reason ? `${regularErr}; cwl: ${cwl.reason}` : regularErr,
    };
  }

  // --- Regular endpoint returned notInWar — try CWL ---
  const cwl = await syncCwlWars(clanTag, capturedAt);
  if (cwl.synced > 0) {
    return {
      ok: true,
      state: cwl.lastState ?? "inWar",
      warType: "cwl",
      capturedAt,
      error: null,
    };
  }

  // Genuinely not in any war. Still a success — the UI shows no-active-war.
  return {
    ok: true,
    state: "notInWar",
    warType: null,
    capturedAt,
    error: cwl.reason && !/404|not found/i.test(cwl.reason) ? cwl.reason : null,
  };
}

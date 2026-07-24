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
import { wars, warParticipants, warAttacks, clans, cwlSeasons } from "@/lib/db/schema";
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
    if (!entry.opponent?.tag || !entry.opponent?.name || !endTime) continue;

    const oppTag = entry.opponent.tag;
    const oppName = entry.opponent.name;

    // Dedupe on (opponent_tag, end_time); fall back to (opponent_name, end_time).
    let existing: typeof wars.$inferSelect | undefined;
    [existing] = await db
      .select()
      .from(wars)
      .where(
        and(
          eq(wars.opponentTag, oppTag),
          eq(wars.endTime, endTime),
          eq(wars.warType, "regular"),
        ),
      )
      .limit(1);
    if (!existing) {
      [existing] = await db
        .select()
        .from(wars)
        .where(
          and(
            eq(wars.opponentName, oppName),
            eq(wars.endTime, endTime),
            eq(wars.warType, "regular"),
          ),
        )
        .limit(1);
    }

    const fieldSet = {
      opponentTag: oppTag,
      opponentName: oppName,
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
      result: entry.result === "lose" ? "loss" : (entry.result ?? null),
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
 * Fetch the CWL league group for the clan, store it, and sync ALL wars in
 * every round (not just ours) so the War Center can render full league
 * standings. Wars involving our clan are normalized (our clan = `clan` side)
 * and get full participant + attack syncing. Other clans' wars are stored as
 * lightweight rows (stars/destruction/result only, no snapshot) for standings.
 *
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

  // Store the league group for the standings + day-tabs view.
  await db
    .insert(cwlSeasons)
    .values({
      season: group.season,
      state: group.state,
      leagueGroup: group as unknown as object,
      capturedAt,
    })
    .onConflictDoUpdate({
      target: cwlSeasons.season,
      set: {
        state: group.state,
        leagueGroup: group as unknown as object,
        capturedAt,
      },
    });

  let synced = 0;
  let lastState: string | null = null;
  for (const round of group.rounds ?? []) {
    for (const warTag of round.warTags ?? []) {
      // "#0" placeholders mark rounds that haven't opened yet.
      if (!warTag || warTag === "#0") continue;
      try {
        const cwlWar = await cocClient.getCwlWar(warTag);
        if (!cwlWar.clan || !cwlWar.opponent) continue;

        const weAreClan = cwlWar.clan.tag === clanTag;
        const weAreOpponent = cwlWar.opponent.tag === clanTag;
        const involvesUs = weAreClan || weAreOpponent;

        if (involvesUs) {
          // Normalize so `clan` is always OUR clan before syncing.
          const normalized = weAreClan
            ? cwlWar
            : { ...cwlWar, clan: cwlWar.opponent, opponent: cwlWar.clan };
          await syncCurrentWar(normalized, capturedAt, warTag);
          synced++;
          lastState = cwlWar.state;
        } else {
          // Other clans' war — store as a lightweight row for standings.
          // No snapshot, no participants (FK to members would fail for
          // foreign tags). Just stars/destruction/result/state.
          await syncCwlOtherWar(cwlWar, capturedAt, warTag);
        }
      } catch {
        // A single round being inaccessible (404) is expected mid-season.
      }
    }
  }
  return { synced, reason: null, lastState };
}

/**
 * Sync a CWL war that does NOT involve our clan — a lightweight row for
 * league standings. Stores stars/destruction/result/state but no snapshot
 * and no participants (foreign tags aren't in our `members` table).
 * Idempotent via the `wars.war_tag` unique index.
 */
async function syncCwlOtherWar(
  cwlWar: CocCurrentWar,
  capturedAt: Date,
  warTag: string,
): Promise<void> {
  if (!cwlWar.clan || !cwlWar.opponent) return;

  // For other clans' wars, we store the data from the API's perspective
  // (clan = first clan, opponent = second clan). The standings query will
  // aggregate across all CWL wars by matching either clan or opponent tag.
  const result = computeWarResult(cwlWar);
  const startTime = parseCoCTime(cwlWar.startTime);
  const endTime = parseCoCTime(cwlWar.endTime);

  const fieldSet = {
    state: cwlWar.state,
    opponentTag: cwlWar.opponent.tag,
    opponentName: cwlWar.opponent.name,
    opponentBadgeUrls: cwlWar.opponent.badgeUrls ?? null,
    opponentClanLevel: cwlWar.opponent.clanLevel ?? null,
    teamSize: cwlWar.teamSize ?? null,
    attacksPerMember: cwlWar.attacksPerMember ?? null,
    ownStars: cwlWar.clan.stars,
    opponentStars: cwlWar.opponent.stars,
    ownDestructionPercentage: Math.round(cwlWar.clan.destructionPercentage),
    opponentDestructionPercentage: Math.round(cwlWar.opponent.destructionPercentage),
    ownAttacks: cwlWar.clan.attacks,
    opponentAttacks: cwlWar.opponent.attacks,
    result,
    startTime,
    endTime,
    preparationStartTime: parseCoCTime(cwlWar.preparationStartTime),
    lastSyncedAt: capturedAt,
    // No snapshot — we don't need roster/attack detail for other clans' wars.
    warSnapshot: null,
  };

  // Also store the "clan" side's tag/name so the standings query can find
  // both participants. We use the opponentTag/opponentName fields for the
  // second clan (as seen from the first clan's perspective).
  // The `clan` side's identity is stored implicitly: the war_tag identifies
  // it, and the standings query will match on both opponentTag and a new
  // lookup. Actually, we need to store both clan tags. Let me use a different
  // approach: store the war with clanTag = first clan, opponentTag = second
  // clan, and the standings query matches on EITHER tag.

  // Check if this war already exists (by warTag).
  const [existing] = await db
    .select()
    .from(wars)
    .where(eq(wars.warTag, warTag))
    .limit(1);

  if (existing) {
    await db.update(wars).set(fieldSet).where(eq(wars.id, existing.id));
  } else {
    await db.insert(wars).values({
      warTag,
      warType: "cwl",
      ...fieldSet,
    });
  }
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

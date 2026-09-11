import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bustAllCache } from "@/lib/cache";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clans,
  members,
  memberSnapshots,
  membershipEvents,
  unitLevels,
  capitalDistrictSnapshots,
} from "@/lib/db/schema";
import {
  cocClient,
  type CocClan,
  type CocClanMember,
  type CocPlayer,
  type CocUnitLevel,
} from "@/lib/coc-client/client";
import { clanConfig } from "@/config/clan.config";
import type { IngestResult } from "@/lib/ingest/types";
import { checkHallOfFameRecords } from "@/lib/db/records-updater";
import {
  syncCurrentWar,
  syncCwlWars,
  backfillWarLog,
} from "@/lib/ingest/war-sync";
import {
  reconcileMembership,
  computeActivityFlags,
} from "@/lib/ingest/membership";
import { computeRushed } from "@/lib/scoring/rushed";
import { resolveSuperTroopLevel } from "@/lib/assets/super-troops";

/**
 * POST /api/ingest
 *
 * Called by the third-party cron-job service (cron-job.org) every 5 min for
 * the light poll, and once daily for the batch. See docs/concept/04.
 *
 * Auth: `Authorization: Bearer <INGEST_SECRET>`.
 * Body: `{ batch?: boolean }` — `true` on the daily-batch cron trigger.
 *
 * Failed-poll safety: if the clan fetch fails, the route returns an error
 * response but NEVER marks members as departed. Sub-calls (war sync, daily
 * batch) are best-effort: each is wrapped in try/catch and the rest of the
 * poll continues. See docs/concept/04 "Cold starts, partial data, and failures".
 */

// Vercel Hobby tier caps function duration at 10s by default. The daily
// batch (full player-detail fetches for 40+ members + capital raid-season
// sync + rushed computation + HoF records) can take 30-50s, so raise the
// limit. The light poll finishes in <5s regardless.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SECRET}`;
  if (!process.env.INGEST_SECRET || authHeader !== expected) {
    // Observability: log whether this was a missing secret (config issue) vs
    // a wrong-secret request (cron service misconfigured). This disambiguates
    // "no calls arriving" from "calls arriving with wrong secret" in Vercel
    // runtime logs, which is the single most useful diagnostic for overdue polls.
    if (!process.env.INGEST_SECRET) {
      console.warn("[ingest] rejected: INGEST_SECRET not configured");
    } else {
      console.warn("[ingest] rejected: auth mismatch (wrong secret or no header)");
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const isBatch = body?.batch === true;

  const lightResult = await runLightPoll();

  // Only run the daily batch when the light poll captured the clan
  // successfully. A failed clan fetch must not trigger expensive
  // per-member player fetches (which would also fail).
  if (isBatch && lightResult.ok) {
    const batchErrors = await runDailyBatch();
    const result: IngestResult = {
      ok: true,
      batch: true,
      membersPolled: lightResult.membersPolled,
      warSynced: lightResult.warSynced,
      errors: [...lightResult.errors, ...batchErrors],
      events: lightResult.events,
    };
    // EGRESS OPTIMIZATION (docs log 110/115): only revalidate on the daily
    // batch, not on every 5-min light poll. The dashboard's 15-min ISR handles
    // freshness between batches. Revalidating on every poll defeated the ISR
    // and caused 288 dashboard renders/day instead of 96.
    revalidatePath("/");
    bustAllCache();
    return NextResponse.json(result);
  }

  // Light poll: no revalidatePath — the ISR timers handle page freshness.
  // The DB is updated; pages will pick up the new data on their next ISR tick.
  return NextResponse.json({
    ...lightResult,
    batch: isBatch,
  } satisfies IngestResult);
}

// ===========================================================================
// Light poll — roster, member snapshots, join/leave/rejoin, current war.
// ===========================================================================

async function runLightPoll(): Promise<IngestResult> {
  const clanTag = clanConfig.clanTag;
  const capturedAt = new Date();
  const errors: string[] = [];
  const events = { joins: 0, leaves: 0, rejoins: 0 };

  // ---- Clan fetch with failed-poll safety ----
  let clanData: CocClan;
  try {
    clanData = await cocClient.getClan(clanTag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`clan fetch failed: ${msg}`);
    // CRITICAL: do not mark members as left/inactive when the clan fetch
    // fails. See docs/concept/04 "Cold starts, partial data, and failures" #3.
    return {
      ok: false,
      batch: false,
      membersPolled: 0,
      warSynced: false,
      errors,
      events,
    };
  }

  // ---- Upsert clan with expanded fields ----
  await upsertClan(clanTag, clanData, capturedAt, /* isBatch */ false);

  // ---- Membership reconciliation ----
  // The decision logic (join/leave/rejoin/refresh) lives in the pure
  // `reconcileMembership` function (lib/ingest/membership.ts), tested without
  // a DB. This route applies the resulting operations to the database.
  const liveMembers = clanData.memberList ?? [];

  const knownMembers = await db
    .select({
      playerTag: members.playerTag,
      name: members.name,
      leftAt: members.leftAt,
      townHallLevel: members.townHallLevel,
    })
    .from(members);

  const { operations, events: recoEvents } = reconcileMembership(
    liveMembers,
    knownMembers,
    capturedAt,
    clanConfig.memberRetentionDays,
  );
  events.joins = recoEvents.joins;
  events.leaves = recoEvents.leaves;
  events.rejoins = recoEvents.rejoins;

  // Build a lookup of live members by tag so we can apply refresh fields.
  const liveMap = new Map(liveMembers.map((m) => [m.tag, m]));

  for (const op of operations) {
    if (op.type === "join") {
      const live = liveMap.get(op.tag)!;
      await db
        .insert(members)
        .values({
          playerTag: op.tag,
          joinedAt: capturedAt,
          ...memberRefreshFields(live),
        });
    } else if (op.type === "rejoin") {
      const live = liveMap.get(op.tag)!;
      await db
        .update(members)
        .set({
          ...memberRefreshFields(live),
          leftAt: null,
          purgeAt: null,
        })
        .where(eq(members.playerTag, op.tag));
    } else if (op.type === "leave") {
      await db
        .update(members)
        .set({ leftAt: capturedAt, purgeAt: op.purgeAt })
        .where(eq(members.playerTag, op.tag));
    }
  }

  // Membership events for the ops above — one multi-row insert (joins and
  // leaves are rare, so this stays tiny). "refresh" ops emit no event row.
  const eventOps = operations.filter(
    (op): op is typeof op & { type: "join" | "rejoin" | "leave" } =>
      op.type === "join" || op.type === "rejoin" || op.type === "leave",
  );
  if (eventOps.length > 0) {
    await db.insert(membershipEvents).values(
      eventOps.map((op) => ({
        playerTag: op.tag,
        nameAtEvent: op.name,
        eventType: op.type,
        eventTime: capturedAt,
      })),
    );
  }

  // ---- War sync (best-effort — failure does not invalidate the poll) ----
  // PHASE 1 ORDERING (docs/2026-09-11-implementation-plan.md §1.5 step 1):
  // war sync runs BEFORE the snapshot insert. War sync writes only
  // wars / war_participants / war_attacks (no dependency on snapshots), and
  // the snapshot flags below consume `war_attacks.attacked_at` as activity
  // evidence — so the current poll's attacks must be on disk before the
  // evidence query reads them. It must stay AFTER the membership ops above:
  // war_participants has a FK to `members`, so a member who joined this poll
  // and is on the war roster needs their member row to exist first.
  let warSynced = false;
  try {
    const currentWar = await cocClient.getCurrentWar(clanTag);
    if (
      currentWar &&
      currentWar.state !== "notInWar" &&
      currentWar.clan &&
      currentWar.opponent
    ) {
      await syncCurrentWar(currentWar, capturedAt);
      warSynced = true;
    } else {
      // Regular endpoint says notInWar — the clan may be in Clan War League,
      // which uses the league-group + war-tag endpoints instead.
      const cwl = await syncCwlWars(clanTag, capturedAt);
      if (cwl.synced > 0) warSynced = true;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`war sync failed: ${msg}`);
  }

  // ---- Refresh retained members + insert activity snapshots (batched) ----
  // fix §4.5 (docs/2026-09-10 assessment DB opt 5): this used to be a
  // per-member loop — ~50 sequential prior-snapshot SELECTs + ~50 snapshot
  // INSERTs + up to ~50 member UPDATEs ≈ 150 round-trips per 5-minute poll
  // against a serverless pooler. It is now: 1 prior-snapshot query
  // (DISTINCT ON), 1 war-evidence query, 1 multi-row snapshot INSERT, 1
  // UPDATE…FROM (VALUES), and 1 multi-row insert for the (rare)
  // TH-upgrade/rename events ≈ 5 round-trips.
  const knownMap = new Map(knownMembers.map((k) => [k.playerTag, k]));

  // (a) Latest prior snapshot per live member — one DISTINCT ON query
  // instead of one `ORDER BY … LIMIT 1` per member. Includes captured_at
  // (the per-member war-evidence bound) and exp_level (Phase 1 signal).
  const liveTags = liveMembers.map((m) => m.tag);
  const priorByTag = new Map<
    string,
    {
      capturedAt: Date;
      donations: number;
      donationsReceived: number;
      trophies: number;
      builderBaseTrophies: number | null;
      expLevel: number | null;
    }
  >();
  if (liveTags.length > 0) {
    const priorRows = await db.execute<{
      player_tag: string;
      captured_at: Date;
      donations: number;
      donations_received: number;
      trophies: number;
      builder_base_trophies: number | null;
      exp_level: number | null;
    }>(sql`
      SELECT DISTINCT ON (player_tag)
        player_tag, captured_at, donations, donations_received, trophies,
        builder_base_trophies, exp_level
      FROM member_snapshots
      WHERE player_tag = ANY(${sql.param(liveTags)}::text[])
      ORDER BY player_tag, captured_at DESC
    `);
    for (const r of priorRows.rows ?? priorRows) {
      priorByTag.set(r.player_tag, {
        capturedAt:
          r.captured_at instanceof Date ? r.captured_at : new Date(r.captured_at),
        donations: r.donations,
        donationsReceived: r.donations_received,
        trophies: r.trophies,
        builderBaseTrophies: r.builder_base_trophies,
        expLevel: r.exp_level,
      });
    }
  }

  // (a2) War-attack evidence in the interval (Phase 1). One round-trip:
  // every attack by a live member first recorded in (min prior, now].
  // The global lower bound is the EARLIEST live member's prior snapshot;
  // each member's own bound is their own prior snapshot (members without a
  // prior — brand new or post-purge — use the global bound, so a fresh
  // database's first poll still catches the war sync that just ran above).
  // `attacked_at` is stamped by the war sync at the poll that first observed
  // the attack (any war type — regular and CWL both count), so each attack
  // is counted exactly once, by the poll whose evidence window contains it.
  const warAttacksByTag = new Map<string, number>();
  if (liveTags.length > 0) {
    const priorTimes = [...priorByTag.values()].map((p) => p.capturedAt.getTime());
    const globalLower = priorTimes.length > 0 ? Math.min(...priorTimes) : 0;
    const evidenceRows = await db.execute<{
      attacker_tag: string;
      attacked_at: Date;
    }>(sql`
      SELECT attacker_tag, attacked_at
      FROM war_attacks
      WHERE attacker_tag = ANY(${sql.param(liveTags)}::text[])
        AND attacked_at > ${new Date(globalLower)}
        AND attacked_at <= ${capturedAt}
    `);
    for (const r of evidenceRows.rows ?? evidenceRows) {
      const prior = priorByTag.get(r.attacker_tag);
      const memberBound = prior ? prior.capturedAt.getTime() : globalLower;
      const attackedAt =
        r.attacked_at instanceof Date ? r.attacked_at : new Date(r.attacked_at);
      if (attackedAt.getTime() > memberBound) {
        warAttacksByTag.set(
          r.attacker_tag,
          (warAttacksByTag.get(r.attacker_tag) ?? 0) + 1,
        );
      }
    }
  }

  // (b) Reset-aware activity snapshots — flags computed in bulk from the
  // prior map + war evidence (same pure `computeActivityFlags` as before,
  // now with `warAttacksInInterval`), inserted in ONE multi-row statement.
  const snapshotRows = liveMembers.map((liveMember) => {
    const prior = priorByTag.get(liveMember.tag) ?? null;
    const { activityFlag, loginDayFlag } = computeActivityFlags(
      {
        donations: liveMember.donations,
        donationsReceived: liveMember.donationsReceived,
        trophies: liveMember.trophies,
        builderBaseTrophies: liveMember.builderBaseTrophies ?? null,
        expLevel: liveMember.expLevel ?? null,
      },
      prior
        ? {
            donations: prior.donations,
            donationsReceived: prior.donationsReceived,
            trophies: prior.trophies,
            builderBaseTrophies: prior.builderBaseTrophies,
            expLevel: prior.expLevel,
          }
        : null,
      warAttacksByTag.get(liveMember.tag) ?? 0,
    );
    return {
      playerTag: liveMember.tag,
      capturedAt,
      donations: liveMember.donations,
      donationsReceived: liveMember.donationsReceived,
      trophies: liveMember.trophies,
      builderBaseTrophies: liveMember.builderBaseTrophies ?? null,
      expLevel: liveMember.expLevel ?? null,
      activityFlag,
      loginDayFlag,
    };
  });
  if (snapshotRows.length > 0) {
    await db.insert(memberSnapshots).values(snapshotRows);
  }

  // (c) Refresh fields for already-known retained members — one
  // UPDATE … FROM (VALUES …) join instead of N sequential UPDATEs. Joins and
  // rejoins were already refreshed by their ops above.
  const refreshTargets = liveMembers.filter((m) => {
    const known = knownMap.get(m.tag);
    return known && !known.leftAt;
  });
  if (refreshTargets.length > 0) {
    const refreshRows = refreshTargets.map(
      (m) =>
        sql`(${m.tag}::text, ${m.name}::text, ${m.role}::text, ${m.townHallLevel}::integer, ${m.expLevel ?? null}::integer, ${m.trophies}::integer, ${m.league ? JSON.stringify(m.league) : null}::jsonb, ${m.leagueTier ? JSON.stringify(m.leagueTier) : null}::jsonb, ${m.clanRank ?? null}::integer, ${m.previousClanRank ?? null}::integer, ${m.builderBaseTrophies ?? null}::integer, ${m.donations}::integer, ${m.donationsReceived}::integer)`,
    );
    await db.execute(sql`
      UPDATE members AS mem
      SET
        name = v.name,
        role = v.role,
        town_hall_level = v.town_hall_level,
        exp_level = v.exp_level,
        trophies = v.trophies,
        league = v.league,
        league_tier = v.league_tier,
        clan_rank = v.clan_rank,
        previous_clan_rank = v.previous_clan_rank,
        builder_base_trophies = v.builder_base_trophies,
        current_donations = v.current_donations,
        current_donations_received = v.current_donations_received
      FROM (VALUES ${sql.join(refreshRows, sql`, `)}) AS v(tag, name, role, town_hall_level, exp_level, trophies, league, league_tier, clan_rank, previous_clan_rank, builder_base_trophies, current_donations, current_donations_received)
      WHERE mem.player_tag = v.tag
    `);
  }

  // (d) TH-upgrade + rename events (rare) — detected in bulk, one insert.
  const lifecycleEvents: Array<typeof membershipEvents.$inferInsert> = [];
  for (const liveMember of liveMembers) {
    const known = knownMap.get(liveMember.tag);
    if (!known || known.leftAt) continue;
    if (
      known.townHallLevel !== null &&
      liveMember.townHallLevel > known.townHallLevel
    ) {
      lifecycleEvents.push({
        playerTag: liveMember.tag,
        nameAtEvent: liveMember.name,
        eventType: "thUpgrade",
        eventTime: capturedAt,
        metadata: {
          oldTH: known.townHallLevel,
          newTH: liveMember.townHallLevel,
        },
      });
    }
    if (known.name !== liveMember.name) {
      lifecycleEvents.push({
        playerTag: liveMember.tag,
        nameAtEvent: liveMember.name,
        eventType: "rename",
        eventTime: capturedAt,
        metadata: { oldName: known.name, newName: liveMember.name },
      });
    }
  }
  if (lifecycleEvents.length > 0) {
    await db.insert(membershipEvents).values(lifecycleEvents);
  }

  return {
    ok: true,
    batch: false,
    membersPolled: liveMembers.length,
    warSynced,
    errors,
    events,
  };
}

// ===========================================================================
// Daily batch — full clan refresh + war-log backfill + complete player detail.
// ===========================================================================

async function runDailyBatch(): Promise<string[]> {
  const clanTag = clanConfig.clanTag;
  const capturedAt = new Date();
  const errors: string[] = [];

  // ---- Refresh ALL clan fields ----
  let clanData: CocClan;
  try {
    clanData = await cocClient.getClan(clanTag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`daily batch clan fetch failed: ${msg}`);
    return errors;
  }

  await upsertClan(clanTag, clanData, capturedAt, /* isBatch */ true);

  // ---- Insert capital district snapshots for each district ----
  for (const district of clanData.clanCapital?.districts ?? []) {
    await db.insert(capitalDistrictSnapshots).values({
      districtName: district.name,
      districtHallLevel: district.districtHallLevel,
      capturedAt,
    });
  }

  // ---- War-log backfill (only while isWarLogPublic) ----
  // Populates the War Center history list with past wars the tracker didn't
  // observe live. Idempotent — safe to run every daily batch. See docs/concept/07.
  try {
    await backfillWarLog(clanTag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`war log backfill failed: ${msg}`);
  }

  // ---- Capital raid-season ingestion (Step 3.1) ----
  // Idempotent: completed seasons already in the DB are skipped. Per-member
  // contributions for departed/purged tags are filtered (FK safety). See
  // docs/concept/08 + docs/concept/12 Step 3.1.
  try {
    const { syncCapitalRaidSeasons } = await import("@/lib/ingest/capital-sync");
    const raidResult = await syncCapitalRaidSeasons(clanTag);
    errors.push(...raidResult.errors);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`capital raid season sync failed: ${msg}`);
  }

  // ---- Full player profile per retained member ----
  const retained = await db
    .select({
      playerTag: members.playerTag,
      clanCapitalContributions: members.clanCapitalContributions,
    })
    .from(members)
    .where(isNull(members.leftAt));

  // Map of playerTag → old clanCapitalContributions (for delta computation).
  const knownContribMap = new Map(
    retained.map((r) => [r.playerTag, r.clanCapitalContributions ?? 0]),
  );

  // EGRESS OPTIMIZATION (docs log 115): process player detail fetches in
  // parallel chunks of 5 instead of sequentially. The CoC API allows
  // concurrent requests; this speeds up the batch from ~50s (sequential) to
  // ~10s (5-wide parallel) for a 50-member clan.
  const CONCURRENCY = 5;
  const processPlayer = async (playerTag: string): Promise<void> => {
    let player: CocPlayer;
    try {
      player = await cocClient.getPlayer(playerTag);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`player fetch failed for ${playerTag}: ${msg}`);
      return;
    }

    await db
      .update(members)
      .set({
        warPreference: player.warPreference ?? null,
        warStars: player.warStars ?? null,
        attackWins: player.attackWins ?? null,
        defenseWins: player.defenseWins ?? null,
        bestTrophies: player.bestTrophies ?? null,
        builderHallLevel: player.builderHallLevel ?? null,
        builderBaseTrophies: player.builderBaseTrophies ?? null,
        bestBuilderBaseTrophies: player.bestBuilderBaseTrophies ?? null,
        clanCapitalContributions: player.clanCapitalContributions ?? null,
        league: player.league ?? null,
        leagueTier: player.leagueTier ?? null,
        builderBaseLeague: player.builderBaseLeague ?? null,
        expLevel: player.expLevel ?? null,
        trophies: player.trophies ?? null,
        townHallWeaponLevel: player.townHallWeaponLevel ?? null,
        careerStats: { achievements: player.achievements },
        lastDetailCaptureAt: capturedAt,
      })
      .where(eq(members.playerTag, playerTag));

    // ---- Capital contribution delta log ----
    const oldContrib = knownContribMap.get(playerTag) ?? 0;
    const newContrib = player.clanCapitalContributions ?? 0;
    const contribDelta = newContrib - oldContrib;
    if (contribDelta > 0) {
      await db.insert(membershipEvents).values({
        playerTag,
        nameAtEvent: player.name ?? playerTag,
        eventType: "capitalContribution",
        eventTime: capturedAt,
        metadata: { amount: contribDelta, total: newContrib },
      });
    }

    // ---- unit_levels with pets filtered out of troops ----
    const { troops, pets } = splitTroopsAndPets(player.troops);
    const homeTroops = troops.filter((t) => t.village === "home");
    const homeHeroes = player.heroes.filter((h) => h.village === "home");
    const builderBasePayload = {
      builderHallLevel: player.builderHallLevel ?? null,
      versusTrophies: player.versusTrophies ?? null,
      bestVersusTrophies: player.bestVersusTrophies ?? null,
      builderBaseTrophies: player.builderBaseTrophies ?? null,
      bestBuilderBaseTrophies: player.bestBuilderBaseTrophies ?? null,
      troops: troops.filter((t) => t.village === "builderBase"),
      heroes: player.heroes.filter((h) => h.village === "builderBase"),
    };

    await db
      .insert(unitLevels)
      .values({
        playerTag,
        capturedAt,
        troops: homeTroops,
        heroes: homeHeroes,
        heroEquipment: player.heroEquipment ?? [],
        spells: player.spells,
        pets,
        builderBase: builderBasePayload,
      })
      .onConflictDoUpdate({
        target: unitLevels.playerTag,
        set: {
          capturedAt,
          troops: homeTroops,
          heroes: homeHeroes,
          heroEquipment: player.heroEquipment ?? [],
          spells: player.spells,
          pets,
          builderBase: builderBasePayload,
        },
      });

    // Compute rushed percent — super troops resolved from base (docs log 101).
    const homeTroopByName = new Map(homeTroops.map((t) => [t.name, t]));
    const rushedTroops = homeTroops.map((t) => {
      const resolved = resolveSuperTroopLevel(t, homeTroopByName);
      return { name: t.name, level: resolved.level, maxLevel: resolved.maxLevel };
    });
    const rushedResult = computeRushed([
      { category: "Troops", items: rushedTroops },
      { category: "Heroes", items: homeHeroes.map((h) => ({ name: h.name, level: h.level, maxLevel: h.maxLevel ?? null })) },
      { category: "Equipment", items: (player.heroEquipment ?? []).map((e) => ({ name: e.name, level: e.level, maxLevel: e.maxLevel ?? null })) },
      { category: "Spells", items: player.spells.map((s) => ({ name: s.name, level: s.level, maxLevel: s.maxLevel ?? null })) },
      { category: "Pets", items: pets.map((p) => ({ name: p.name, level: p.level, maxLevel: p.maxLevel ?? null })) },
    ]);
    await db
      .update(members)
      .set({ rushedPercent: rushedResult.overallPercent })
      .where(eq(members.playerTag, playerTag));
  };

  // Process in chunks of CONCURRENCY to limit parallel CoC API calls.
  for (let i = 0; i < retained.length; i += CONCURRENCY) {
    const chunk = retained.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((r) => processPlayer(r.playerTag)));
  }

  // ---- Checkpoint computation (before HoF + before purge) ----
  // Computes cumulative lifetime totals from ALL snapshots and stores them
  // on the members table. Must run BEFORE checkHallOfFameRecords (which now
  // reads checkpoints) and BEFORE the purge route prunes old snapshots.
  try {
    const { computeCheckpoints } = await import("@/lib/ingest/checkpoints");
    await computeCheckpoints();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`checkpoint computation failed: ${msg}`);
  }

  // ---- Hall of Fame records (checked once per daily batch) ----
  try {
    const hofErrors = await checkHallOfFameRecords();
    errors.push(...hofErrors);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`hall-of-fame records update failed: ${msg}`);
  }

  return errors;
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Fields refreshed from a `CocClanMember` (the lightweight roster entry from
 * the clan endpoint). Used for inserts, updates, and rejoins — `joinedAt`
 * and lifecycle columns are handled by the caller.
 */
function memberRefreshFields(m: CocClanMember) {
  return {
    name: m.name,
    role: m.role,
    townHallLevel: m.townHallLevel,
    expLevel: m.expLevel ?? null,
    trophies: m.trophies,
    league: m.league ?? null,
    leagueTier: m.leagueTier ?? null,
    clanRank: m.clanRank ?? null,
    previousClanRank: m.previousClanRank ?? null,
    builderBaseTrophies: m.builderBaseTrophies ?? null,
    currentDonations: m.donations,
    currentDonationsReceived: m.donationsReceived,
  };
}

/**
 * Upsert the configured clan row with all expanded fields from the new
 * hardened schema. The same shape is used for light polls and daily batches;
 * `isBatch` controls whether `lastDailyBatchAt` is stamped.
 */
async function upsertClan(
  clanTag: string,
  clanData: CocClan,
  capturedAt: Date,
  isBatch: boolean,
) {
  const setValues = {
    name: clanData.name,
    description: clanData.description ?? null,
    type: clanData.type ?? null,
    isFamilyFriendly: clanData.isFamilyFriendly ?? null,
    badgeUrls: clanData.badgeUrls ?? null,
    clanLevel: clanData.clanLevel,
    clanPoints: clanData.clanPoints ?? null,
    clanBuilderBasePoints: clanData.clanBuilderBasePoints ?? null,
    clanCapitalPoints: clanData.clanCapitalPoints ?? null,
    memberCount: clanData.members ?? null,
    location: clanData.location ?? null,
    chatLanguage: clanData.chatLanguage ?? null,
    labels: clanData.labels ?? null,
    warFrequency: clanData.warFrequency ?? null,
    warLeague: clanData.warLeague ?? null,
    capitalLeague: clanData.capitalLeague ?? null,
    requiredTrophies: clanData.requiredTrophies ?? null,
    requiredTownhallLevel: clanData.requiredTownhallLevel ?? null,
    requiredBuilderBaseTrophies: clanData.requiredBuilderBaseTrophies ?? null,
    warWins: clanData.warWins ?? null,
    warTies: clanData.warTies ?? null,
    warLosses: clanData.warLosses ?? null,
    warWinStreak: clanData.warWinStreak ?? null,
    isWarLogPublic: clanData.isWarLogPublic ?? null,
    capitalHallLevel: clanData.clanCapital?.capitalHallLevel ?? null,
    districtsPayload: clanData.clanCapital?.districts ?? null,
    lastPolledAt: capturedAt,
    ...(isBatch ? { lastDailyBatchAt: capturedAt } : {}),
  };

  await db
    .insert(clans)
    .values({
      clanTag,
      ...setValues,
    })
    .onConflictDoUpdate({
      target: clans.clanTag,
      set: setValues,
    });
}

/**
 * Known pet names — the CoC API ships pets inside the `troops` array with no
 * `type` discriminator, so we filter by name. The list is sourced from the
 * in-game Pet House. New pets added by Supercell will land in `troops` until
 * this list is updated; this is the documented behavior in docs/concept/03
 * ("The captured API currently represents pets among troop-like progression
 * entries").
 */
const PET_NAMES = new Set<string>([
  "L.A.S.S.I",
  "Electro Owl",
  "Mighty Yak",
  "Unicorn",
  "Frosty",
  "Diggy",
  "Poison Lizard",
  "Phoenix",
  "Angry Jelly",
  "Sneezy",
  "Spirit Fox",
  "Greedy Raven",
]);

/**
 * Split a `troops` payload (which from the API contains troops + siege
 * machines + pets) into a `troops` array (everything that isn't a pet) and
 * a `pets` array. The original API category mapping is preserved per
 * docs/concept/03 ("the persistence layer may expose a normalized `pets`
 * presentation field, but it must preserve the original API category
 * mapping for refreshes and audits").
 */
function splitTroopsAndPets(troops: CocUnitLevel[]): {
  troops: CocUnitLevel[];
  pets: CocUnitLevel[];
} {
  const troopList: CocUnitLevel[] = [];
  const petList: CocUnitLevel[] = [];
  for (const t of troops) {
    if (PET_NAMES.has(t.name)) {
      petList.push(t);
    } else {
      troopList.push(t);
    }
  }
  return { troops: troopList, pets: petList };
}

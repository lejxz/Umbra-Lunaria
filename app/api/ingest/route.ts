import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { desc, eq, isNull } from "drizzle-orm";
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

/**
 * POST /api/ingest
 *
 * Called by the GitHub Actions workflow (.github/workflows/poll.yml) on two
 * schedules: a light poll every 10-15 min, and a daily batch. See
 * concept/04-activity-tracking-and-polling.md for the full design.
 *
 * Auth: `Authorization: Bearer <INGEST_SECRET>`.
 * Body: `{ batch?: boolean }` — `true` on the daily-batch cron trigger.
 *
 * Failed-poll safety: if the clan fetch fails, the route returns an error
 * response but NEVER marks members as departed. Sub-calls (war sync, daily
 * batch) are best-effort: each is wrapped in try/catch and the rest of the
 * poll continues. See concept/04 "Cold starts, partial data, and failures".
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SECRET}`;
  if (!process.env.INGEST_SECRET || authHeader !== expected) {
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
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  }

  revalidatePath("/", "layout");
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
    // fails. See concept/04 "Cold starts, partial data, and failures" #3.
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
  const liveMembers = clanData.memberList ?? [];
  const liveTags = new Set(liveMembers.map((m) => m.tag));

  // Fetch every known member row (retained AND departed) once. We need both:
  // retained → leave detection; departed → rejoin detection.
  const knownMembers = await db
    .select({
      playerTag: members.playerTag,
      name: members.name,
      leftAt: members.leftAt,
    })
    .from(members);
  const knownMap = new Map(knownMembers.map((m) => [m.playerTag, m]));

  for (const liveMember of liveMembers) {
    const known = knownMap.get(liveMember.tag);

    if (!known) {
      // ---- New join ----
      events.joins++;
      await db
        .insert(members)
        .values({
          playerTag: liveMember.tag,
          joinedAt: capturedAt,
          ...memberRefreshFields(liveMember),
        });
      await db.insert(membershipEvents).values({
        playerTag: liveMember.tag,
        nameAtEvent: liveMember.name,
        eventType: "join",
        eventTime: capturedAt,
      });
    } else if (known.leftAt) {
      // ---- Rejoin (was departed, retention window not yet expired) ----
      events.rejoins++;
      await db
        .update(members)
        .set({
          ...memberRefreshFields(liveMember),
          leftAt: null,
          purgeAt: null,
        })
        .where(eq(members.playerTag, liveMember.tag));
      await db.insert(membershipEvents).values({
        playerTag: liveMember.tag,
        nameAtEvent: liveMember.name,
        eventType: "rejoin",
        eventTime: capturedAt,
      });
    } else {
      // ---- Existing retained member ----
      await db
        .update(members)
        .set(memberRefreshFields(liveMember))
        .where(eq(members.playerTag, liveMember.tag));
    }

    // ---- Reset-aware activity snapshot ----
    await insertMemberSnapshot(liveMember, capturedAt);
  }

  // ---- Detect leaves (retained members missing from this poll) ----
  for (const known of knownMembers) {
    if (known.leftAt) continue; // already departed — no change
    if (liveTags.has(known.playerTag)) continue; // still in clan

    events.leaves++;
    const purgeAt = new Date(capturedAt);
    purgeAt.setDate(purgeAt.getDate() + clanConfig.memberRetentionDays);
    await db
      .update(members)
      .set({ leftAt: capturedAt, purgeAt })
      .where(eq(members.playerTag, known.playerTag));
    await db.insert(membershipEvents).values({
      playerTag: known.playerTag,
      nameAtEvent: known.name,
      eventType: "leave",
      eventTime: capturedAt,
    });
  }

  // ---- War sync (best-effort — failure does not invalidate the poll) ----
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
  // observe live. Idempotent — safe to run every daily batch. See concept/07.
  try {
    await backfillWarLog(clanTag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`war log backfill failed: ${msg}`);
  }

  // ---- Full player profile per retained member ----
  const retained = await db
    .select({ playerTag: members.playerTag })
    .from(members)
    .where(isNull(members.leftAt));

  for (const { playerTag } of retained) {
    let player: CocPlayer;
    try {
      player = await cocClient.getPlayer(playerTag);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`player fetch failed for ${playerTag}: ${msg}`);
      continue;
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
 * Insert a member_snapshots row with reset-aware activity flags.
 *
 * Activity evidence (per concept/04): a member is active for this interval
 * if donations given/received increased OR trophies/Builder Base trophies
 * changed. Estimated login evidence requires a donation-counter increase;
 * a weekly counter reset alone never counts as a login.
 */
async function insertMemberSnapshot(m: CocClanMember, capturedAt: Date) {
  const [lastSnap] = await db
    .select()
    .from(memberSnapshots)
    .where(eq(memberSnapshots.playerTag, m.tag))
    .orderBy(desc(memberSnapshots.capturedAt))
    .limit(1);

  const donationsIncreased = lastSnap
    ? m.donations > lastSnap.donations
    : false;
  const receivedIncreased = lastSnap
    ? m.donationsReceived > lastSnap.donationsReceived
    : false;
  const trophiesChanged = lastSnap ? m.trophies !== lastSnap.trophies : false;
  const bbTrophiesChanged =
    lastSnap &&
    m.builderBaseTrophies != null &&
    lastSnap.builderBaseTrophies != null
      ? m.builderBaseTrophies !== lastSnap.builderBaseTrophies
      : false;

  const activityFlag =
    donationsIncreased ||
    receivedIncreased ||
    trophiesChanged ||
    bbTrophiesChanged;
  const loginDayFlag = donationsIncreased || receivedIncreased;

  await db.insert(memberSnapshots).values({
    playerTag: m.tag,
    capturedAt,
    donations: m.donations,
    donationsReceived: m.donationsReceived,
    trophies: m.trophies,
    builderBaseTrophies: m.builderBaseTrophies ?? null,
    activityFlag,
    loginDayFlag,
  });
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
 * this list is updated; this is the documented behavior in concept/03
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
]);

/**
 * Split a `troops` payload (which from the API contains troops + siege
 * machines + pets) into a `troops` array (everything that isn't a pet) and
 * a `pets` array. The original API category mapping is preserved per
 * concept/03 ("the persistence layer may expose a normalized `pets`
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

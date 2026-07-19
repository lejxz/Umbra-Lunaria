import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clans,
  members,
  memberSnapshots,
  unitLevels,
  wars,
  warParticipants,
  warAttacks,
  capitalDistrictSnapshots,
} from "@/lib/db/schema";
import { cocClient } from "@/lib/coc-client/client";
import { clanConfig } from "@/config/clan.config";

/**
 * POST /api/ingest
 * Called by the GitHub Actions workflow (.github/workflows/poll.yml) on two
 * schedules: a light poll every 10-15 min, and a daily batch. See
 * concept/04-activity-tracking-and-polling.md for the full design.
 *
 * Auth: Authorization: Bearer <INGEST_SECRET>
 * Body: { batch?: boolean } — true on the daily-batch cron trigger.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SECRET}`;
  if (!process.env.INGEST_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const isBatch = body?.batch === true;

  const result = await runLightPoll();

  if (isBatch) {
    await runDailyBatch();
  }

  return NextResponse.json({ ok: true, batch: isBatch, ...result });
}

async function runLightPoll() {
  const clanTag = clanConfig.clanTag;
  const capturedAt = new Date();

  const clanData = await cocClient.getClan(clanTag);

  await db
    .insert(clans)
    .values({ clanTag, name: clanData.name, clanLevel: clanData.clanLevel, lastPolledAt: capturedAt })
    .onConflictDoUpdate({
      target: clans.clanTag,
      set: { name: clanData.name, clanLevel: clanData.clanLevel, lastPolledAt: capturedAt },
    });

  const liveMembers = clanData.memberList;
  const liveTags = new Set(liveMembers.map((m) => m.tag));

  for (const m of liveMembers) {
    // Upsert the member row.
    await db
      .insert(members)
      .values({
        playerTag: m.tag,
        name: m.name,
        role: m.role,
        townHallLevel: m.townHallLevel,
        joinedAt: capturedAt,
      })
      .onConflictDoUpdate({
        target: members.playerTag,
        set: { name: m.name, role: m.role, townHallLevel: m.townHallLevel, leftAt: null, purgeAt: null },
      });

    // Diff against the most recent snapshot for activity + login-day detection.
    const [previous] = await db
      .select()
      .from(memberSnapshots)
      .where(eq(memberSnapshots.playerTag, m.tag))
      .orderBy(desc(memberSnapshots.capturedAt))
      .limit(1);

    const donationsIncreased = previous ? m.donations > previous.donations : false;
    const receivedIncreased = previous ? m.donationsReceived > previous.donationsReceived : false;
    const trophiesChanged = previous ? m.trophies !== previous.trophies : false;

    // A drop in donations without a corresponding increase elsewhere is the
    // weekly reset — never counted as activity or a login day on its own.
    // See concept/04-activity-tracking-and-polling.md "Weekly donation reset handling".
    const activityFlag = donationsIncreased || receivedIncreased || trophiesChanged;
    const loginDayFlag = donationsIncreased || receivedIncreased;

    await db.insert(memberSnapshots).values({
      playerTag: m.tag,
      capturedAt,
      donations: m.donations,
      donationsReceived: m.donationsReceived,
      trophies: m.trophies,
      activityFlag,
      loginDayFlag,
    });
  }

  // Mark members missing from this poll as departed. See the retention
  // policy in concept/03-data-model-and-database.md.
  const dbMembers = await db
    .select({ playerTag: members.playerTag })
    .from(members)
    .where(isNull(members.leftAt));

  for (const { playerTag } of dbMembers) {
    if (!liveTags.has(playerTag)) {
      const purgeAt = new Date(capturedAt);
      purgeAt.setDate(purgeAt.getDate() + clanConfig.memberRetentionDays);
      await db
        .update(members)
        .set({ leftAt: capturedAt, purgeAt })
        .where(eq(members.playerTag, playerTag));
    }
  }

  // Poll currentwar whenever a war is on — covers preparation day too, since
  // the scouting view (concept/07-clan-war.md) needs opponent data before
  // attacks open.
  const currentWar = await cocClient.getCurrentWar(clanTag).catch(() => null);
  let warSynced = false;
  if (currentWar && (currentWar.state === "preparation" || currentWar.state === "inWar" || currentWar.state === "warEnded")) {
    await syncCurrentWar(currentWar, capturedAt);
    warSynced = true;
  }

  return { membersPolled: liveMembers.length, warSynced };
}

async function syncCurrentWar(
  currentWar: NonNullable<Awaited<ReturnType<typeof cocClient.getCurrentWar>>>,
  capturedAt: Date,
) {
  if (!currentWar.clan || !currentWar.opponent) return;

  const [existingWar] = await db
    .select()
    .from(wars)
    .where(and(eq(wars.state, currentWar.state), eq(wars.opponentTag, currentWar.opponent.tag)))
    .orderBy(desc(wars.id))
    .limit(1);

  let warRow = existingWar;
  if (!warRow) {
    const [inserted] = await db
      .insert(wars)
      .values({
        opponentTag: currentWar.opponent.tag,
        opponentName: currentWar.opponent.name,
        warType: "regular",
        state: currentWar.state,
        teamSize: currentWar.teamSize,
        attacksPerMember: currentWar.attacksPerMember,
        startTime: currentWar.startTime ? new Date(currentWar.startTime) : undefined,
        endTime: currentWar.endTime ? new Date(currentWar.endTime) : undefined,
      })
      .returning();
    if (!inserted) throw new Error("Failed to insert war row");
    warRow = inserted;
  }

  await db
    .update(wars)
    .set({
      state: currentWar.state,
      ownStars: currentWar.clan.stars,
      opponentStars: currentWar.opponent.stars,
    })
    .where(eq(wars.id, warRow.id));

  const attacksAllowed = currentWar.attacksPerMember ?? 2;

  for (const m of currentWar.clan.members) {
    const attacksUsed = m.attacks?.length ?? 0;
    const starsEarned = m.attacks?.reduce((sum, a) => sum + a.stars, 0) ?? 0;

    await db
      .insert(warParticipants)
      .values({
        warId: warRow.id,
        playerTag: m.tag,
        attacksAllowed,
        attacksUsed,
        starsEarned,
        missed: attacksUsed === 0,
      })
      .onConflictDoUpdate({
        target: [warParticipants.warId, warParticipants.playerTag],
        set: { attacksUsed, starsEarned, missed: attacksUsed === 0 },
      });

    for (const attack of m.attacks ?? []) {
      await db
        .insert(warAttacks)
        .values({
          warId: warRow.id,
          attackerTag: attack.attackerTag,
          defenderTag: attack.defenderTag,
          stars: attack.stars,
          destructionPercentage: attack.destructionPercentage,
          attackOrder: attack.order,
          attackedAt: capturedAt,
        })
        .onConflictDoNothing();
    }
  }
}

async function runDailyBatch() {
  const clanTag = clanConfig.clanTag;
  const capturedAt = new Date();

  // Refresh cached clan-level fields + capital district snapshots.
  const clanData = await cocClient.getClan(clanTag);

  await db
    .update(clans)
    .set({
      capitalHallLevel: clanData.clanCapital?.capitalHallLevel,
      warWins: clanData.warWins,
      warTies: clanData.warTies,
      warLosses: clanData.warLosses,
      warWinStreak: clanData.warWinStreak,
      requiredTrophies: clanData.requiredTrophies,
      requiredTownHallLevel: clanData.requiredTownhallLevel,
      requiredBuilderBaseTrophies: clanData.requiredBuilderBaseTrophies,
      location: clanData.location?.name,
      labels: clanData.labels,
      warFrequency: clanData.warFrequency,
    })
    .where(eq(clans.clanTag, clanTag));

  for (const district of clanData.clanCapital?.districts ?? []) {
    await db.insert(capitalDistrictSnapshots).values({
      districtName: district.name,
      districtHallLevel: district.districtHallLevel,
      capturedAt,
    });
  }

  // Full player detail per member — career stats, war preference, unit levels.
  const liveMembers = await db.select({ playerTag: members.playerTag }).from(members).where(isNull(members.leftAt));

  for (const { playerTag } of liveMembers) {
    const player = await cocClient.getPlayer(playerTag).catch(() => null);
    if (!player) continue;

    await db
      .update(members)
      .set({
        warPreference: player.warPreference ?? null,
        careerStats: {
          warStars: player.warStars,
          attackWins: player.attackWins,
          defenseWins: player.defenseWins,
          bestTrophies: player.bestTrophies,
          achievements: Object.fromEntries(
            player.achievements
              .filter((a) => ["Gold Grab", "Friend in Need"].includes(a.name))
              .map((a) => [a.name, a.value]),
          ),
        },
      })
      .where(eq(members.playerTag, playerTag));

    await db
      .insert(unitLevels)
      .values({
        playerTag,
        capturedAt,
        troops: player.troops.filter((t) => t.village === "home"),
        heroes: player.heroes.filter((h) => h.village === "home"),
        heroEquipment: player.heroEquipment ?? [],
        spells: player.spells,
        pets: [], // pets ship inside `troops` from the API, filtered at read time
        builderBase: {
          builderHallLevel: player.builderHallLevel ?? null,
          versusTrophies: player.versusTrophies ?? null,
          bestVersusTrophies: player.bestVersusTrophies ?? null,
        },
      })
      .onConflictDoUpdate({
        target: unitLevels.playerTag,
        set: {
          capturedAt,
          troops: player.troops.filter((t) => t.village === "home"),
          heroes: player.heroes.filter((h) => h.village === "home"),
          heroEquipment: player.heroEquipment ?? [],
          spells: player.spells,
        },
      });
  }
}

/**
 * Capital raid-season ingestion — shared by the ingest route's daily batch.
 * See concept/08-clan-capital.md and concept/12 Step 3.1.
 *
 * Responsibilities:
 *   - parseRaidSeasonTime: pure helper (CoC timestamps reuse the war-sync
 *     parser, but we keep a local alias so the module is self-contained).
 *   - syncCapitalRaidSeasons: fetch /capitalraidseasons, upsert each completed
 *     season into capital_raid_seasons (idempotent on startTime — see migration
 *     0006), and upsert per-member contributions into capital_contributions.
 *     Contributions for player tags not in `members` are skipped (FK safety).
 *
 * Server-only: imports @/lib/db. Never call from a client component.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  capitalRaidSeasons,
  capitalContributions,
  members,
} from "@/lib/db/schema";
import { cocClient, type CocCapitalRaidSeason } from "@/lib/coc-client/client";
import { parseCoCTime } from "@/lib/ingest/war-sync";

export interface CapitalSyncResult {
  processed: number;
  skipped: number;
  errors: string[];
}

/**
 * Sync completed Capital raid seasons for the configured clan.
 *
 * Idempotent: a season already in the DB (matched by startTime) is skipped
 * entirely — no member-contribution re-write. The API returns seasons newest
 * first; we ingest every "ended" season we don't already have and stop at the
 * first known one (the history is monotonic — no past seasons get edited).
 *
 * Contributions for player tags that aren't in `members` (departed + purged)
 * are skipped rather than failing the whole season — the FK on
 * capital_contributions.player_tag → members.player_tag would reject them
 * otherwise.
 */
export async function syncCapitalRaidSeasons(
  clanTag: string,
): Promise<CapitalSyncResult> {
  const result: CapitalSyncResult = { processed: 0, skipped: 0, errors: [] };

  let seasons: CocCapitalRaidSeason[];
  try {
    const res = await cocClient.getCapitalRaidSeasons(clanTag);
    seasons = res.items ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`capital raid seasons fetch failed: ${msg}`);
    return result;
  }

  // Load existing season start-times so we can skip already-ingested seasons.
  const existing = await db
    .select({ startTime: capitalRaidSeasons.startTime })
    .from(capitalRaidSeasons);
  const existingKeys = new Set(
    existing.map((r) => r.startTime.getTime()),
  );

  // Current retained members — contributions for unknown tags are skipped.
  const retainedTags = await db
    .select({ playerTag: members.playerTag })
    .from(members);
  const retainedSet = new Set(retainedTags.map((r) => r.playerTag));

  for (const season of seasons) {
    const start = parseCoCTime(season.startTime);
    const end = parseCoCTime(season.endTime);
    if (!start) {
      result.errors.push(
        `capital raid season with unparseable startTime: ${season.startTime}`,
      );
      continue;
    }

    // Only ingest completed seasons. "inProgress" seasons are skipped — the
    // API returns them but the loot/reward totals aren't final.
    if (season.state !== "ended") {
      result.skipped++;
      continue;
    }

    // Idempotent skip: we've already ingested this season.
    if (existingKeys.has(start.getTime())) {
      result.skipped++;
      continue;
    }

    // Upsert the season row (conflict on startTime via migration 0006).
    const [row] = await db
      .insert(capitalRaidSeasons)
      .values({
        startTime: start,
        endTime: end,
        capitalTotalLoot: season.capitalTotalLoot ?? null,
        raidsCompleted: season.raidsCompleted ?? null,
        totalAttacks: season.totalAttacks ?? null,
        offensiveReward: season.offensiveReward ?? null,
        defensiveReward: season.defensiveReward ?? null,
      })
      .onConflictDoUpdate({
        target: capitalRaidSeasons.startTime,
        set: {
          endTime: end,
          capitalTotalLoot: season.capitalTotalLoot ?? null,
          raidsCompleted: season.raidsCompleted ?? null,
          totalAttacks: season.totalAttacks ?? null,
          offensiveReward: season.offensiveReward ?? null,
          defensiveReward: season.defensiveReward ?? null,
        },
      })
      .returning({ id: capitalRaidSeasons.id });

    if (!row) {
      result.errors.push(`failed to upsert raid season starting ${start.toISOString()}`);
      continue;
    }
    const seasonId = row.id;

    // Insert per-member contributions. Skip unknown tags (FK safety).
    const memberContributions = (season.members ?? []).filter((m) =>
      retainedSet.has(m.tag),
    );
    if (memberContributions.length > 0) {
      // onConflictDoUpdate on the composite PK (raidSeasonId, playerTag) keeps
      // the upsert idempotent if the same season is re-processed.
      await db
        .insert(capitalContributions)
        .values(
          memberContributions.map((m) => ({
            raidSeasonId: seasonId,
            playerTag: m.tag,
            attacksUsed: m.attacks ?? 0,
            attackLimit: m.attackLimit ?? null,
            bonusAttackLimit: m.bonusAttackLimit ?? null,
            capitalResourcesLooted: m.capitalResourcesLooted ?? 0,
            raidWeekendMedals: m.raidWeekendMedals ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: [capitalContributions.raidSeasonId, capitalContributions.playerTag],
          set: {
            attacksUsed: sql`excluded.attacks_used`,
            attackLimit: sql`excluded.attack_limit`,
            bonusAttackLimit: sql`excluded.bonus_attack_limit`,
            capitalResourcesLooted: sql`excluded.capital_resources_looted`,
            raidWeekendMedals: sql`excluded.raid_weekend_medals`,
          },
        });
    }

    result.processed++;
  }

  return result;
}

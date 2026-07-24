/**
 * War-select inputs query — fetches the per-member data the auto-select score
 * needs that isn't already in the member roster.
 *
 * The roster query (getMemberRoster) already returns attacksUsed/allowed +
 * warsTracked. This module fetches the remaining three inputs the
 * `computeWarSelectScore` function needs:
 *
 *   1. recentActivityRate — trailing-14-day active-interval rate from
 *      member_snapshots (matches the dashboard activity-score derivation).
 *   2. warStarsEarned + threeStarAttacks — from war_attacks joined to our
 *      clan's attackers only.
 *   3. rushedPercent — from unit_levels via computeRushed.
 *
 * Server-only — imports @/lib/db. Never call from a client component.
 */

import { and, inArray, sql, gte, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  memberSnapshots,
  warAttacks,
  unitLevels,
  members,
} from "@/lib/db/schema";
import { computeRushed } from "@/lib/scoring/rushed";

export interface WarSelectInputRow {
  playerTag: string;
  /** 0..1 — fraction of the trailing-14d snapshots with activityFlag=true. */
  recentActivityRate: number | null;
  /** Total stars earned by this member across tracked war attacks. */
  warStarsEarned: number | null;
  /** Count of 3-star attacks by this member across tracked wars. */
  threeStarAttacks: number | null;
  /** Rushed percent from unit_levels (0..100). null when no cap data. */
  rushedPercent: number | null;
}

const TRAILING_WINDOW_DAYS = 14;

/**
 * Fetch the war-select inputs for all currently-retained members. Returns one
 * row per member; members with no snapshot/war/progression data get nulls.
 */
export async function getWarSelectInputs(): Promise<WarSelectInputRow[]> {
  const retained = await db
    .select({ playerTag: members.playerTag })
    .from(members)
    .where(isNotNull(members.playerTag));
  const tags = retained.map((r) => r.playerTag);
  if (tags.length === 0) return [];

  const cutoff = new Date(Date.now() - TRAILING_WINDOW_DAYS * 86_400_000);

  // Run the four source queries in parallel.
  const [activityRows, attackAggRows, progressionRows] = await Promise.all([
    // 1. Trailing-14d activity rate.
    db
      .select({
        playerTag: memberSnapshots.playerTag,
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${memberSnapshots.activityFlag})::int`,
      })
      .from(memberSnapshots)
      .where(
        and(
          inArray(memberSnapshots.playerTag, tags),
          gte(memberSnapshots.capturedAt, cutoff),
        ),
      )
      .groupBy(memberSnapshots.playerTag),

    // 2. Stars earned + three-star count per attacker (our clan's attacks only).
    //    We scope by attackerTag IN retained tags — opponent attacks are
    //    naturally excluded because opponent tags aren't in `members`.
    db
      .select({
        attackerTag: warAttacks.attackerTag,
        starsEarned: sql<number>`coalesce(sum(${warAttacks.stars}), 0)::int`,
        threeStars: sql<number>`coalesce(sum(case when ${warAttacks.stars} = 3 then 1 else 0 end), 0)::int`,
      })
      .from(warAttacks)
      .where(inArray(warAttacks.attackerTag, tags))
      .groupBy(warAttacks.attackerTag),

    // 3. unit_levels for the rushed computation.
    db
      .select()
      .from(unitLevels)
      .where(inArray(unitLevels.playerTag, tags)),
  ]);

  const activityByTag = new Map(
    activityRows.map((r) => [
      r.playerTag,
      r.total > 0 ? r.active / r.total : null,
    ]),
  );
  const attacksByTag = new Map(
    attackAggRows.map((r) => [
      r.attackerTag,
      { starsEarned: r.starsEarned, threeStars: r.threeStars },
    ]),
  );

  const result: WarSelectInputRow[] = [];
  for (const tag of tags) {
    const activity = activityByTag.get(tag) ?? null;
    const attacks = attacksByTag.get(tag);
    const progression = progressionRows.find((p) => p.playerTag === tag);

    let rushedPercent: number | null = null;
    if (progression) {
      const cats = progressionToCategories(progression);
      if (cats.length > 0) {
        const rushed = computeRushed(cats);
        rushedPercent = rushed.overallPercent;
      }
    }

    result.push({
      playerTag: tag,
      recentActivityRate: activity,
      warStarsEarned: attacks ? attacks.starsEarned : null,
      threeStarAttacks: attacks ? attacks.threeStars : null,
      rushedPercent,
    });
  }

  return result;
}

/**
 * Map a `unitLevels` row into the `UnitLevelEntry[][]` categories shape that
 * `computeRushed` expects. Mirrors `computeRushedFromProgression` in
 * lib/db/member-queries.ts.
 */
function progressionToCategories(p: {
  troops: unknown;
  heroes: unknown;
  heroEquipment: unknown;
  spells: unknown;
  pets: unknown;
}): Array<{ category: string; items: { name: string; level: number; maxLevel: number | null }[] }> {
  const cats: Array<{ category: string; items: { name: string; level: number; maxLevel: number | null }[] }> = [];
  const map: Record<string, unknown> = {
    Troops: p.troops,
    Heroes: p.heroes,
    Equipment: p.heroEquipment,
    Spells: p.spells,
    Pets: p.pets,
  };
  for (const [category, raw] of Object.entries(map)) {
    if (!Array.isArray(raw)) continue;
    const items = raw
      .map((it) => {
        const u = it as { name?: string; level?: number; maxLevel?: number | null };
        if (typeof u.name !== "string") return null;
        return {
          name: u.name,
          level: typeof u.level === "number" ? u.level : 0,
          maxLevel: typeof u.maxLevel === "number" ? u.maxLevel : null,
        };
      })
      .filter((it): it is { name: string; level: number; maxLevel: number | null } => it !== null);
    if (items.length > 0) cats.push({ category, items });
  }
  return cats;
}

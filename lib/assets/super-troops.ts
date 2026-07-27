/**
 * Super-troop → base-troop mapping.
 *
 * A "super troop" in Clash of Clans is a temporary 1-week boosted variant of a
 * regular (lab-researched) troop. The CoC API reports every super troop at
 * `level: 1` and `maxLevel` = the super variant's own max — because the boost
 * itself has no progression, only the base troop does.
 *
 * This means a player with a level-8 Valkyrie who activates Super Valkyrie
 * will show "Super Valkyrie 1/12" in the raw API data, which is misleading.
 * The player's real investment is the base Valkyrie's lab level (8/12).
 *
 * This map resolves a super troop to its base troop so callers can display or
 * compute against the base troop's level. Used by:
 *   - the member-detail progression cards (display level)
 *   - the ingest rushed-percent calculation (don't let super troops at level 1
 *     inflate the deficit)
 *
 * Notes on non-obvious mappings:
 *   - Sneaky Goblin → Goblin (not "Super Goblin")
 *   - Inferno Dragon → Dragon (not "Super Dragon" — Inferno Dragon is the
 *     Dragon's super variant)
 *   - Rocket Balloon → Balloon
 *   - Ice Hound → Lava Hound (Ice Hound is the Lava Hound's super variant)
 *   - Super Ice Hound → Lava Hound (same base as Ice Hound)
 *   - Lavaloon is a distinct troop, NOT a super variant — not listed here.
 */

export const SUPER_TROOP_BASE: Record<string, string> = {
  "Super Barbarian": "Barbarian",
  "Super Archer": "Archer",
  "Super Giant": "Giant",
  "Sneaky Goblin": "Goblin",
  "Super Wall Breaker": "Wall Breaker",
  "Super Wizard": "Wizard",
  "Super Valkyrie": "Valkyrie",
  "Super Witch": "Witch",
  "Super Bowler": "Bowler",
  "Super Miner": "Miner",
  "Super Dragon": "Dragon",
  "Super Hog Rider": "Hog Rider",
  "Super Minion": "Minion",
  "Super Yeti": "Yeti",
  "Super Ice Hound": "Lava Hound",
  "Inferno Dragon": "Dragon",
  "Rocket Balloon": "Balloon",
  "Ice Hound": "Lava Hound",
};

/** True when `name` is a super-troop variant (has a base troop). */
export function isSuperTroop(name: string): boolean {
  return name in SUPER_TROOP_BASE;
}

/** The base troop name for a super troop, or `null` if `name` is not one. */
export function baseTroopName(name: string): string | null {
  return SUPER_TROOP_BASE[name] ?? null;
}

export type UnitLevelLike = {
  name: string;
  level: number;
  maxLevel?: number | null;
};

/**
 * Resolve a troop's display level + maxLevel. For super troops (always API
 * level 1), use the base troop's lab level so the value reflects the player's
 * actual research investment. Falls back to the raw level when the base troop
 * isn't in the payload (e.g. a brand-new super troop with no base captured).
 *
 * @param troop      The troop entry to resolve.
 * @param byName     A Map from troop name → troop entry (the full payload),
 *                   used to look up the base troop's level.
 */
export function resolveSuperTroopLevel<T extends UnitLevelLike>(
  troop: T,
  byName: Map<string, T>,
): { level: number; maxLevel: number | null } {
  const baseName = SUPER_TROOP_BASE[troop.name];
  if (!baseName) {
    return { level: troop.level, maxLevel: troop.maxLevel ?? null };
  }
  const base = byName.get(baseName);
  if (!base) {
    return { level: troop.level, maxLevel: troop.maxLevel ?? null };
  }
  return { level: base.level, maxLevel: base.maxLevel ?? null };
}

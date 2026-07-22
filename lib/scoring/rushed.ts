/**
 * Rushed-account analysis.
 *
 * Compares each unit's current level against its API-reported global maximum
 * (`maxLevel`). The formula from concept/06-members.md §7:
 *
 * ```text
 * rushed_percent =
 *   sum(weight_i × max(0, maxLevel_i − current_level_i))
 *   ─────────────────────────────────────────────────────── × 100
 *   sum(weight_i × maxLevel_i)
 * ```
 *
 * The initial model uses equal weights. The API's `maxLevel` is the global
 * maximum for that unit (not TH-specific), so this measures how far each unit
 * is from its global cap. A higher percentage means more rushed.
 *
 * Units without a `maxLevel` (null) are excluded from the calculation.
 * If no units have `maxLevel`, the result is null ("not available").
 *
 * See concept/06-members.md §7 and concept/03-data-model-and-database.md.
 */

export interface UnitLevelEntry {
  name: string;
  level: number;
  maxLevel: number | null;
}

export interface RushedCategoryResult {
  category: string;
  percent: number | null;
  unitsCounted: number;
  unitsMaxed: number;
}

export interface RushedResult {
  overallPercent: number | null;
  categoryBreakdown: RushedCategoryResult[];
  totalUnits: number;
  maxedUnits: number;
}

/**
 * Compute the rushed percentage for a set of units.
 *
 * @param units Array of { name, level, maxLevel } entries
 * @returns RushedResult with overall percent, category breakdown, and counts
 */
export function computeRushed(
  categories: Array<{ category: string; items: UnitLevelEntry[] }>,
): RushedResult {
  let totalDeficit = 0;
  let totalMax = 0;
  let totalUnits = 0;
  let maxedUnits = 0;

  const breakdown: RushedCategoryResult[] = categories.map(({ category, items }) => {
    let catDeficit = 0;
    let catMax = 0;
    let catCounted = 0;
    let catMaxed = 0;

    for (const item of items) {
      if (item.maxLevel === null || item.maxLevel === 0) continue;
      catCounted++;
      catMax += item.maxLevel;
      catDeficit += Math.max(0, item.maxLevel - item.level);
      if (item.level >= item.maxLevel) catMaxed++;
    }

    totalDeficit += catDeficit;
    totalMax += catMax;
    totalUnits += catCounted;
    maxedUnits += catMaxed;

    return {
      category,
      percent: catMax > 0 ? (catDeficit / catMax) * 100 : null,
      unitsCounted: catCounted,
      unitsMaxed: catMaxed,
    };
  });

  return {
    overallPercent: totalMax > 0 ? (totalDeficit / totalMax) * 100 : null,
    categoryBreakdown: breakdown,
    totalUnits,
    maxedUnits,
  };
}

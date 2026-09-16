import type { WarPerformancePoint } from "@/lib/view-models/dashboard";

/**
 * Star-efficiency math for the war performance panel — pure functions so the
 * normalization is unit-testable without a DB.
 *
 * Why normalize: the clan's recent wars mix 5v5 up to 40v40 lineups. Raw
 * stars are incomparable across sizes (a perfect 5v5 is 15★, a perfect 40v40
 * is 120★), so a raw-star chart zigzags with lineup size, not performance.
 * Expressing stars as a share of the war's maximum makes every war read on
 * the same 0–100 scale.
 */

/** Max stars attainable in a war — 3 per roster slot. Null when the war's
 *  team size is unknown (legacy rows), which makes efficiency uncomputable. */
export function maxStars(teamSize: number | null): number | null {
  return teamSize != null && teamSize > 0 ? teamSize * 3 : null;
}

/** Stars as a share of the war's maximum, 0–100 with one decimal.
 *  15/15 in a 5v5 and 84/120 in a 40v40 both express as performance. */
export function starEfficiency(
  stars: number,
  teamSize: number | null,
): number | null {
  const max = maxStars(teamSize);
  if (max == null) return null;
  return Math.round((stars / max) * 1000) / 10;
}

/** Trailing-N arithmetic mean aligned to each index. Nulls (uncomputable
 *  points) are skipped; indices with fewer than N prior+current values get
 *  null, so the trend line starts N-1 bars in. */
export function rollingAverage(
  values: Array<number | null>,
  n: number,
): Array<number | null> {
  if (n <= 0) return values.map(() => null);
  const out: Array<number | null> = [];
  for (let i = 0; i < values.length; i++) {
    const window = values.slice(Math.max(0, i - n + 1), i + 1);
    const usable = window.filter((v): v is number => v != null);
    // Require a full window before drawing the trend — a 1-point "average"
    // is just the value itself and doubles the first dot.
    out.push(usable.length === n ? usable.reduce((a, b) => a + b, 0) / n : null);
  }
  return out;
}

export interface WarPerformanceSummary {
  wars: number;
  wins: number;
  ties: number;
  losses: number;
  /** Mean own star efficiency over the window, 0–100, one decimal.
   *  Null when no point has a computable team size. */
  avgOwnEfficiency: number | null;
}

/** W-T-L record + average own star efficiency for a set of war points.
 *  Points without a result (ongoing or legacy rows) still count toward the
 *  war total and the efficiency average, but not toward W/T/L. */
export function summarizeWarPerformance(
  points: WarPerformancePoint[],
): WarPerformanceSummary {
  let wins = 0;
  let ties = 0;
  let losses = 0;
  let effSum = 0;
  let effCount = 0;
  for (const p of points) {
    if (p.result === "win") wins++;
    else if (p.result === "tie") ties++;
    else if (p.result === "loss") losses++;
    const eff = starEfficiency(p.ownStars, p.teamSize);
    if (eff != null) {
      effSum += eff;
      effCount++;
    }
  }
  return {
    wars: points.length,
    wins,
    ties,
    losses,
    avgOwnEfficiency:
      effCount > 0 ? Math.round((effSum / effCount) * 10) / 10 : null,
  };
}

/**
 * Attack targeting intelligence — pure logic for Phase 3.3
 * (docs/2026-09-11-implementation-plan.md §3.3, assessment F9).
 *
 * Groups own-clan war attacks by TOWN HALL DELTA (defender TH − attacker TH)
 * to answer "who attacks up/down well?" for war prep:
 *
 *   - Δ = 0    → attacking an equal-TH base (the standard matchup)
 *   - Δ > 0     → attacking UP (defender is higher TH — the hard matchup)
 *   - Δ < 0     → attacking DOWN (defender is lower TH — the expected 3★)
 *
 * Buckets: "-2" (≤ −2), "-1", "0", "+1", "+2+" (≥ +2) — five rows, matching
 * the implementation plan's THΔ set.
 *
 * Coverage is honest by design: only live-tracked wars carry war snapshots
 * (warlog-backfilled wars have no defender detail), so the query layer only
 * feeds snapshot-backed attacks in. Attacks missing either TH are skipped.
 *
 * Pure: no DB, no React, no I/O. Tested in tests/lib/targeting.test.ts.
 */

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One own-clan war attack with both TH levels resolved (query layer's job). */
export interface TargetingAttack {
  warId: number;
  attackerTag: string;
  attackerTownhallLevel: number;
  defenderTownhallLevel: number;
  stars: number;
  destructionPercentage: number;
}

/** Aggregate over one THΔ bucket. */
export interface ThDeltaBucket {
  /** "-2", "-1", "0", "+1", "+2+" — label is the identity. */
  delta: string;
  attacks: number;
  avgStars: number | null;
  avgDestruction: number | null;
  threeStarRate: number | null;
}

/** Per-member targeting summary. */
export interface MemberTargeting {
  playerTag: string;
  attacks: number;
  avgStars: number | null;
  avgDestruction: number | null;
  threeStarRate: number | null;
  /** The Δ bucket this member performs best in (avg stars; ≥2 attacks). */
  bestDelta: string | null;
  /** The Δ bucket this member performs worst in (avg stars; ≥2 attacks). */
  worstDelta: string | null;
}

export interface TargetingResult {
  /** All five buckets, ordered -2 → +2+ (always present — zero-attack buckets
   *  render as empty rows so the axis never reshuffles as data accrues). */
  aggregate: ThDeltaBucket[];
  members: MemberTargeting[];
  totalAttacks: number;
}

// ---------------------------------------------------------------------------
// bucketThDelta
// ---------------------------------------------------------------------------

/** Canonical bucket labels, display order. */
export const TH_DELTA_BUCKETS = ["-2", "-1", "0", "+1", "+2+"] as const;

/**
 * Classify an attack into a THΔ bucket (defender TH − attacker TH).
 * Positive = attacking up (harder); negative = attacking down.
 */
export function bucketThDelta(
  attackerTownhallLevel: number,
  defenderTownhallLevel: number,
): string {
  const delta = defenderTownhallLevel - attackerTownhallLevel;
  if (delta <= -2) return "-2";
  if (delta === -1) return "-1";
  if (delta === 0) return "0";
  if (delta === 1) return "+1";
  return "+2+";
}

// ---------------------------------------------------------------------------
// computeTargeting
// ---------------------------------------------------------------------------

function summarize(
  attacks: Array<{ stars: number; destructionPercentage: number }>,
): {
  attacks: number;
  avgStars: number | null;
  avgDestruction: number | null;
  threeStarRate: number | null;
} {
  const n = attacks.length;
  if (n === 0) {
    return {
      attacks: 0,
      avgStars: null,
      avgDestruction: null,
      threeStarRate: null,
    };
  }
  const starsSum = attacks.reduce((s, a) => s + a.stars, 0);
  const destSum = attacks.reduce((s, a) => s + a.destructionPercentage, 0);
  const threes = attacks.filter((a) => a.stars >= 3).length;
  return {
    attacks: n,
    avgStars: starsSum / n,
    avgDestruction: destSum / n,
    threeStarRate: threes / n,
  };
}

/**
 * Aggregate attacks by THΔ bucket (clan-wide) and per member.
 * Members are returned keyed by tag; the query layer attaches names/TH.
 */
export function computeTargeting(attacks: TargetingAttack[]): TargetingResult {
  // ── Aggregate: one row per canonical bucket, always all five ──
  const byBucket = new Map<string, Array<{ stars: number; destructionPercentage: number }>>();
  for (const label of TH_DELTA_BUCKETS) byBucket.set(label, []);
  for (const a of attacks) {
    const label = bucketThDelta(a.attackerTownhallLevel, a.defenderTownhallLevel);
    byBucket.get(label)?.push(a);
  }

  const aggregate: ThDeltaBucket[] = TH_DELTA_BUCKETS.map((delta) => ({
    delta,
    ...summarize(byBucket.get(delta) ?? []),
  }));

  // ── Per member ──
  const byMember = new Map<
    string,
    {
      all: Array<{ stars: number; destructionPercentage: number }>;
      byDelta: Map<string, Array<{ stars: number; destructionPercentage: number }>>;
    }
  >();
  for (const a of attacks) {
    let entry = byMember.get(a.attackerTag);
    if (!entry) {
      entry = { all: [], byDelta: new Map() };
      byMember.set(a.attackerTag, entry);
    }
    entry.all.push(a);
    const label = bucketThDelta(a.attackerTownhallLevel, a.defenderTownhallLevel);
    const bucketArr = entry.byDelta.get(label) ?? [];
    bucketArr.push(a);
    entry.byDelta.set(label, bucketArr);
  }

  const members: MemberTargeting[] = [];
  for (const [playerTag, entry] of byMember) {
    const overall = summarize(entry.all);

    // Best/worst Δ bucket: only buckets with ≥2 attacks count (a single
    // 3★ attack is not "best at attacking up" evidence).
    let bestDelta: string | null = null;
    let worstDelta: string | null = null;
    let bestStars = -1;
    let worstStars = 4;
    for (const label of TH_DELTA_BUCKETS) {
      const bucket = entry.byDelta.get(label) ?? [];
      if (bucket.length < 2) continue;
      const avg = summarize(bucket).avgStars;
      if (avg === null) continue;
      if (avg > bestStars) {
        bestStars = avg;
        bestDelta = label;
      }
      if (avg < worstStars) {
        worstStars = avg;
        worstDelta = label;
      }
    }

    members.push({
      playerTag,
      attacks: overall.attacks,
      avgStars: overall.avgStars,
      avgDestruction: overall.avgDestruction,
      threeStarRate: overall.threeStarRate,
      bestDelta,
      worstDelta,
    });
  }

  // Most attacks first; stable tag tiebreak for deterministic rendering.
  members.sort(
    (a, b) => b.attacks - a.attacks || a.playerTag.localeCompare(b.playerTag),
  );

  return { aggregate, members, totalAttacks: attacks.length };
}

"use client";

/**
 * TargetingPanel — Attack targeting intelligence (Phase 3.3 — F9).
 *
 * How the clan performs by TOWN HALL DELTA (defender TH − attacker TH):
 *   - a clan-wide table over the five Δ buckets (−2 … +2+)
 *   - a per-member table (most attacks first) with best/worst Δ buckets
 *
 * Δ > 0 means attacking UP (harder base); Δ < 0 attacking DOWN. The panel
 * renders only when snapshot-backed attacks exist (war-log backfilled wars
 * carry no defender detail — the coverage note says so).
 */

import type {
  TargetingIntelligence,
  TargetingThBucket,
} from "@/lib/view-models/strategy";

/** Δ bucket presentation: label, meaning, tone. */
const DELTA_META: Array<{ label: string; meaning: string }> = [
  { label: "-2", meaning: "2+ TH down (expected 3★)" },
  { label: "-1", meaning: "1 TH down" },
  { label: "0", meaning: "even matchup" },
  { label: "+1", meaning: "1 TH up" },
  { label: "+2+", meaning: "2+ TH up (hardest)" },
];

function fmtAvg(value: number | null, digits = 1): string {
  return value !== null ? value.toFixed(digits) : "—";
}

function fmtPct(value: number | null): string {
  return value !== null ? `${Math.round(value * 100)}%` : "—";
}

function bucketMeta(label: string): string {
  return DELTA_META.find((m) => m.label === label)?.meaning ?? label;
}

export function TargetingPanel({
  targeting,
  onMemberClick,
}: {
  targeting: TargetingIntelligence;
  onMemberClick?: (playerTag: string) => void;
}) {
  const byLabel = new Map(targeting.aggregate.map((b) => [b.delta, b]));
  const buckets: TargetingThBucket[] = DELTA_META.map(
    (meta) =>
      byLabel.get(meta.label) ?? {
        delta: meta.label,
        attacks: 0,
        avgStars: null,
        avgDestruction: null,
        threeStarRate: null,
      },
  );

  return (
    <section className="glass mb-8 rounded-2xl p-5">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl text-umbra-lilac">Attack Targeting</h2>
        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-sky-300">
          {targeting.totalAttacks} attacks · {targeting.coveredWars} wars
        </span>
      </div>
      <p className="mb-4 text-xs text-umbra-muted">
        Performance by town-hall gap (defender TH − attacker TH). Positive Δ =
        attacking up.
      </p>

      {/* ── Clan-wide Δ table ─────────────────────────────────────────── */}
      <div className="data-container">
        <table className="w-full text-xs">
          <thead className="data-thead">
            <tr>
              <th className="data-th text-left font-mono uppercase tracking-wider text-umbra-muted">Δ</th>
              <th className="data-th text-center font-mono uppercase tracking-wider text-umbra-muted">Attacks</th>
              <th className="data-th text-center font-mono uppercase tracking-wider text-umbra-muted">Avg ★</th>
              <th className="hidden data-th text-center font-mono uppercase tracking-wider text-umbra-muted sm:table-cell">Destr.</th>
              <th className="data-th text-right font-mono uppercase tracking-wider text-umbra-muted">3★%</th>
            </tr>
          </thead>
          <tbody className="data-tbody">
            {buckets.map((b) => {
              const isUp = b.delta.startsWith("+");
              const isDown = b.delta.startsWith("-");
              return (
                <tr key={b.delta} className="data-tr">
                  <td className="data-td">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono font-bold ${
                        isUp ? "text-amber-400" : isDown ? "text-umbra-muted" : "text-umbra-lilac"
                      }`}
                      title={bucketMeta(b.delta)}
                    >
                      {b.delta}
                      <span className="text-[0.6rem] font-normal text-umbra-muted/60">
                        {bucketMeta(b.delta)}
                      </span>
                    </span>
                  </td>
                  <td className="data-td text-center font-mono text-umbra-muted">{b.attacks}</td>
                  <td className="data-td text-center font-mono text-umbra-lilac">{fmtAvg(b.avgStars)}</td>
                  <td className="hidden data-td text-center font-mono text-umbra-muted sm:table-cell">
                    {fmtAvg(b.avgDestruction, 0)}%
                  </td>
                  <td className="data-td text-right font-mono text-emerald-400">{fmtPct(b.threeStarRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Per-member table ──────────────────────────────────────────── */}
      {targeting.members.length > 0 && (
        <>
          <p className="mb-2 mt-6 font-mono text-label uppercase tracking-wider text-umbra-muted">
            By member
          </p>
          <div className="data-container">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="data-thead">
                  <tr>
                    <th className="data-th text-left font-mono uppercase tracking-wider text-umbra-muted">Member</th>
                    <th className="data-th text-center font-mono uppercase tracking-wider text-umbra-muted">Atks</th>
                    <th className="data-th text-center font-mono uppercase tracking-wider text-umbra-muted">Avg ★</th>
                    <th className="hidden data-th text-center font-mono uppercase tracking-wider text-umbra-muted sm:table-cell">Destr.</th>
                    <th className="hidden data-th text-center font-mono uppercase tracking-wider text-umbra-muted md:table-cell">3★%</th>
                    <th className="data-th text-right font-mono uppercase tracking-wider text-umbra-muted">Best Δ</th>
                  </tr>
                </thead>
                <tbody className="data-tbody">
                  {targeting.members.map((m) => (
                    <tr
                      key={m.playerTag}
                      onClick={() => onMemberClick?.(m.playerTag)}
                      className="cursor-pointer data-tr"
                    >
                      <td className="data-td">
                        <div className="flex items-center gap-2">
                          {m.townHallLevel && (
                            <span className="font-mono text-[0.6rem] font-bold text-umbra-muted">
                              TH{m.townHallLevel}
                            </span>
                          )}
                          <span className="truncate font-medium text-umbra-lilac" title={m.name}>
                            {m.name}
                          </span>
                        </div>
                      </td>
                      <td className="data-td text-center font-mono text-umbra-muted">{m.attacks}</td>
                      <td className="data-td text-center font-mono text-umbra-lilac">{fmtAvg(m.avgStars)}</td>
                      <td className="hidden data-td text-center font-mono text-umbra-muted sm:table-cell">
                        {fmtAvg(m.avgDestruction, 0)}%
                      </td>
                      <td className="hidden data-td text-center font-mono text-emerald-400 md:table-cell">
                        {fmtPct(m.threeStarRate)}
                      </td>
                      <td className="data-td text-right font-mono">
                        {m.bestDelta ? (
                          <span
                            className="font-bold text-emerald-400"
                            title={m.worstDelta ? `Worst Δ: ${m.worstDelta}` : undefined}
                          >
                            {m.bestDelta}
                          </span>
                        ) : (
                          <span className="text-umbra-muted/50" title="Needs ≥2 attacks in a Δ bucket">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Honest coverage note (implementation-plan §3.3) */}
      <p className="mt-3 text-2xs text-umbra-muted/50">
        Based on the {targeting.coveredWars} most recent live-tracked wars —
        war-log backfilled wars lack defender detail and are excluded. Best Δ
        needs at least 2 attacks in a bucket.
      </p>
    </section>
  );
}

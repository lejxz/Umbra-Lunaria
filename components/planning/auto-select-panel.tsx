"use client";

/**
 * AutoSelectPanel — the explainable auto-select recommendation (Step 3.2).
 *
 * Lists members sorted by their war-select composite score, highest first.
 * Opted-out members (`warPreference = "out"`) are excluded from the
 * suggestion list per concept/09 §"Eligibility" #2, but remain manually
 * selectable in the main planner.
 *
 * Each row exposes the factor breakdown (activity, participation, avg stars,
 * three-star rate, account readiness) so leadership can see WHY a member is
 * recommended, not just the number. The panel is collapsible so it doesn't
 * crowd the two-panel layout.
 *
 * Per concept/09: "Auto-select proposes an eligible roster; it never
 * finalizes one." This panel has a "Fill lineup" button that populates the
 * top-N slots — leadership still reviews and adjusts before saving.
 */

import { useMemo, useState } from "react";
import type { PlanningContext } from "@/lib/planning/types";
import type { WarSelectScore } from "@/lib/scoring/war-select-score";
import {
  IconChevronDown,
  IconChevronUp,
  IconZap,
  IconPlus,
  IconAlert,
} from "@/components/ui/icons";

interface AutoSelectPanelProps {
  members: PlanningContext["members"];
  warSize: number;
  /** Tags already in the lineup — used to dim recommended members already added. */
  selectedTags: Set<string>;
  /** Add a member to the next free slot. */
  onAdd: (tag: string) => void;
  /** Fill the top-N recommended members into empty slots in one click. */
  onFillTopN: (n: number) => void;
  minWarsForConfidentRanking: number;
}

export function AutoSelectPanel({
  members,
  warSize,
  selectedTags,
  onAdd,
  onFillTopN,
  minWarsForConfidentRanking,
}: AutoSelectPanelProps) {
  const [open, setOpen] = useState(true);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  // Eligible members: opted-in, with a computable score. Sorted by total desc.
  const ranked = useMemo(() => {
    const eligible = members.filter(
      (m) => m.autoSelectScore !== null && !m.autoSelectScore.optedOut,
    );
    return eligible
      .sort((a, b) => (b.autoSelectScore!.total - a.autoSelectScore!.total));
  }, [members]);

  const topN = warSize;
  const topTags = new Set(ranked.slice(0, topN).map((m) => m.playerTag));
  const allTopFilled = ranked.slice(0, topN).every((m) => selectedTags.has(m.playerTag));

  return (
    <section className="glass rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="rounded-full bg-umbra-purple/15 p-2 text-umbra-purple">
            <IconZap className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
              Auto-select
            </span>
            <span className="mt-0.5 block text-sm text-umbra-lilac">
              Top {topN} recommendations by composite score
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          {!allTopFilled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onFillTopN(topN);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onFillTopN(topN);
                }
              }}
              className="rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-umbra-purple transition hover:bg-umbra-purple/20"
            >
              Fill top {topN}
            </span>
          )}
          {open ? (
            <IconChevronUp className="h-4 w-4 text-umbra-muted" />
          ) : (
            <IconChevronDown className="h-4 w-4 text-umbra-muted" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-umbra-line p-3">
          <p className="mb-3 px-1 text-xs italic text-umbra-muted">
            Auto-select proposes an eligible roster; it never finalizes one.
            Leadership reviews and adjusts before saving.
          </p>
          {ranked.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-umbra-muted">
              No eligible members with enough tracked data yet. The auto-select
              score needs at least one of: recent activity, war attacks, or
              progression data.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {ranked.map((m, i) => {
                const score = m.autoSelectScore!;
                const isExpanded = expandedTag === m.playerTag;
                const isInLineup = selectedTags.has(m.playerTag);
                const isTopN = topTags.has(m.playerTag);
                return (
                  <li
                    key={m.playerTag}
                    className={`rounded-xl border p-2.5 transition ${
                      isTopN
                        ? "border-umbra-purple/30 bg-umbra-purple/5"
                        : "border-umbra-line/40 bg-umbra-surface/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono text-sm font-semibold text-umbra-muted">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedTag(isExpanded ? null : m.playerTag)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <ThBadge th={m.townHallLevel} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-umbra-lilac">
                            {m.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-umbra-muted">
                            Score {score.total.toFixed(1)}
                            {score.limitedData && (
                              <span className="ml-2 text-amber-300/80">Limited data</span>
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdd(m.playerTag)}
                        disabled={isInLineup}
                        className="focus-ring inline-flex items-center gap-1 rounded-full border border-umbra-purple/30 bg-umbra-purple/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/60 hover:bg-umbra-purple/20 disabled:cursor-not-allowed disabled:opacity-30"
                        title={isInLineup ? "Already in lineup" : "Add to lineup"}
                      >
                        <IconPlus className="h-3 w-3" />
                        {isInLineup ? "Added" : "Add"}
                      </button>
                    </div>

                    {isExpanded && <ScoreBreakdown score={score} />}
                  </li>
                );
              })}
            </ol>
          )}

          {ranked.length > 0 && ranked[0]!.autoSelectScore!.limitedData && (
            <p className="mt-3 flex items-center gap-1.5 px-2 text-xs text-amber-300/70">
              <IconAlert className="h-3.5 w-3.5" />
              Top members are flagged &ldquo;Limited data&rdquo; — fewer than{" "}
              {minWarsForConfidentRanking} tracked wars. Treat scores as
              provisional.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Breakdown + TH badge (mirrors the planner-shell badges)
// ---------------------------------------------------------------------------

function ScoreBreakdown({ score }: { score: WarSelectScore }) {
  const labels: Record<string, string> = {
    activity: "Recent activity",
    participation: "Attack participation",
    averageStars: "Average stars",
    threeStarRate: "Three-star rate",
    accountReadiness: "Account readiness",
  };
  return (
    <div className="mt-2.5 grid grid-cols-1 gap-1.5 rounded-lg bg-umbra-ink/40 p-2.5 sm:grid-cols-2">
      {score.components.map((c) => (
        <div key={c.name} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-umbra-muted">{labels[c.name] ?? c.name}</span>
          <span className="flex items-center gap-2">
            {c.available ? (
              <>
                <span className="font-mono text-umbra-muted/70">
                  {(c.normalized * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-umbra-lilac">
                  {c.points.toFixed(1)}pts
                </span>
                <span className="font-mono text-[0.6rem] text-umbra-muted/60">
                  ×{(c.weight * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <span className="text-umbra-muted/50">unavailable</span>
            )}
          </span>
        </div>
      ))}
      <div className="col-span-full mt-1 flex items-center justify-between border-t border-umbra-line/40 pt-1.5 text-xs">
        <span className="font-mono uppercase tracking-wider text-umbra-muted">Total</span>
        <span className="font-display text-umbra-lilac">{score.total.toFixed(1)} / 100</span>
      </div>
    </div>
  );
}

function ThBadge({ th }: { th: number | null }) {
  if (th === null) return <span className="th-badge th-unknown">—</span>;
  const tier = th >= 14 ? "high" : th >= 11 ? "mid" : th >= 8 ? "low" : "base";
  return <span className={`th-badge th-${tier}`}>TH{th}</span>;
}

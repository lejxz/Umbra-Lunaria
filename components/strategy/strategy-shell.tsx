"use client";

/**
 * StrategyShell — the war strategy page composition root.
 *
 * Two lists:
 *   1. Suggested Participants — ranked by composite score (war history,
 *      activity, rushed, recency). New members are NOT penalized.
 *   2. Review Needed — members flagged for moderation (inactive, low
 *      participation, low activity, rushed, opted out).
 *
 * Each member row is clickable → opens the shared MemberDetailSheet.
 *
 * Layout (Celestial Observatory redesign):
 *   • A trio of `.lunar-tile` headline stats (total members, suggested count,
 *     review count) sits at the top of the page inside a single `.glass` band.
 *   • The suggested-participant table uses the unified `.data-container`
 *     system with sticky header + accent-bar row hover.
 *   • The review list renders each member as a `.data-li` row.
 */

import { useState } from "react";
import { PageScaffold } from "@/components/page-scaffold";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { CardMount } from "@/components/ui/card-mount";
import { IconSwords, IconUsers, IconAlert } from "@/components/ui/icons";
import type { StrategyPageData, SuggestedParticipant, ReviewMember } from "@/lib/view-models/strategy";

export function StrategyShell({ data }: { data: StrategyPageData }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  return (
    <PageScaffold
      section="Strategy"
      title="War Strategy"
      description="Automatic ranking of suggested war participants and members needing review."
    >
      {/* ── Headline stat trio ────────────────────────────────────────────── */}
      <CardMount delay={0}>
        <section className="glass rounded-2xl p-5" aria-label="Strategy summary">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="lunar-tile">
              <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
                Total members
              </p>
              <p className="mt-2 font-display text-2xl text-umbra-moonlight">
                {data.totalMembers}
              </p>
            </div>
            <div className="lunar-tile">
              <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
                Suggested
              </p>
              <p className="mt-2 font-display text-2xl text-umbra-moonlight">
                {data.suggested.length}
              </p>
            </div>
            <div className="lunar-tile">
              <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
                Flagged for review
              </p>
              <p className="mt-2 font-display text-2xl text-umbra-moonlight">
                {data.review.length}
              </p>
            </div>
          </div>
        </section>
      </CardMount>

      {/* ── Section 1: Suggested Participants ────────────────────────────── */}
      <CardMount delay={0.04} className="mt-8">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span
              className="h-5 w-1 rounded-full bg-gradient-to-b from-umbra-purple to-umbra-violet shadow-glow-sm"
              aria-hidden
            />
            <h2 className="font-display text-xl text-umbra-moonlight">
              Suggested Participants
            </h2>
            <span className="font-mono text-2xs uppercase tracking-wider text-umbra-faint">
              {data.suggested.length} ranked
            </span>
          </div>

          {data.suggested.length > 0 ? (
            <div className="data-container">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="data-thead">
                    <tr>
                      <th className="data-th text-left">#</th>
                      <th className="data-th text-left">Member</th>
                      <th className="data-th text-center">Score</th>
                      <th className="hidden data-th text-center sm:table-cell">Part.</th>
                      <th className="hidden data-th text-center sm:table-cell">Avg★</th>
                      <th className="hidden data-th text-center md:table-cell">3★%</th>
                      <th className="hidden data-th text-center md:table-cell">Activity</th>
                      <th className="hidden data-th text-center lg:table-cell">Rushed</th>
                      <th className="data-th text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="data-tbody">
                    {data.suggested.map((p, i) => (
                      <SuggestedRow
                        key={p.playerTag}
                        participant={p}
                        rank={i + 1}
                        onClick={() => setSelectedMember(p.playerTag)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-5">
              <EmptyState
                icon={<IconSwords className="h-10 w-10" />}
                title="No participants ranked yet"
                description="Members will appear here once the tracker has accumulated enough data."
              />
            </div>
          )}
        </section>
      </CardMount>

      {/* ── Section 2: Review Needed ────────────────────────────────────── */}
      <CardMount delay={0.08} className="mt-8">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span
              className="h-5 w-1 rounded-full bg-rose-400/80"
              aria-hidden
            />
            <h2 className="font-display text-xl text-umbra-moonlight">
              Review Needed
            </h2>
            <span className="font-mono text-2xs uppercase tracking-wider text-umbra-faint">
              {data.review.length} flagged
            </span>
          </div>

          {data.review.length > 0 ? (
            <div className="data-container p-2">
              <ul className="max-h-[400px] space-y-1.5 overflow-y-auto">
                {data.review.map((m) => (
                  <ReviewRow
                    key={m.playerTag}
                    member={m}
                    onClick={() => setSelectedMember(m.playerTag)}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <div className="glass rounded-2xl p-5">
              <EmptyState
                icon={<IconUsers className="h-10 w-10" />}
                title="Everyone looks good"
                description="No members currently flagged for review."
              />
            </div>
          )}
        </section>
      </CardMount>

      {/* ── Shared member detail sheet ──────────────────────────────────── */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </PageScaffold>
  );
}

// ---------------------------------------------------------------------------
// Suggested participant row
// ---------------------------------------------------------------------------

function SuggestedRow({
  participant: p,
  rank,
  onClick,
}: {
  participant: SuggestedParticipant;
  rank: number;
  onClick: () => void;
}) {
  const scoreColor =
    p.compositeScore >= 70
      ? "text-emerald-400"
      : p.compositeScore >= 50
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <tr
      onClick={onClick}
      className="data-tr cursor-pointer"
    >
      <td className="data-td text-center font-mono text-umbra-faint">
        {rank === 1 ? "♛" : rank}
      </td>
      <td className="data-td">
        <div className="flex items-center gap-2">
          {p.townHallLevel && (
            <span className="font-mono text-[0.6rem] font-bold text-umbra-faint">
              TH{p.townHallLevel}
            </span>
          )}
          <span className="truncate font-medium text-umbra-lilac" title={p.name}>{p.name}</span>
          {p.isNewMember && (
            <span className="rounded-full border border-umbra-line-bright bg-umbra-purple/10 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-umbra-purple">
              New
            </span>
          )}
          {p.warPreference === "out" && (
            <span className="rounded-full border border-umbra-line bg-umbra-surface/40 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-umbra-muted">
              Out
            </span>
          )}
        </div>
      </td>
      <td className="data-td text-center">
        <span className={`font-mono font-bold ${scoreColor}`}>{p.compositeScore}</span>
      </td>
      <td className="hidden data-td text-center text-umbra-muted sm:table-cell">
        {p.participationRate !== null
          ? `${Math.round(p.participationRate * 100)}%`
          : "—"}
      </td>
      <td className="hidden data-td text-center text-umbra-muted sm:table-cell">
        {p.averageStars !== null ? p.averageStars.toFixed(1) : "—"}
      </td>
      <td className="hidden data-td text-center text-umbra-muted md:table-cell">
        {p.threeStarRate !== null
          ? `${Math.round(p.threeStarRate * 100)}%`
          : "—"}
      </td>
      <td className="hidden data-td text-center text-umbra-muted md:table-cell">
        {p.activityScore !== null ? Math.round(p.activityScore) : "—"}
      </td>
      <td className="hidden data-td text-center text-umbra-muted lg:table-cell">
        {p.rushedPercent !== null
          ? `${Math.round(p.rushedPercent)}%`
          : "—"}
      </td>
      <td className="data-td text-right">
        <span
          className={`font-mono text-[0.6rem] uppercase tracking-wider ${
            p.isActive ? "text-emerald-400" : "text-umbra-faint"
          }`}
        >
          {p.isActive ? "Active" : "Inactive"}
        </span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Review row
// ---------------------------------------------------------------------------

function ReviewRow({
  member: m,
  onClick,
}: {
  member: ReviewMember;
  onClick: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className="data-li flex cursor-pointer items-center gap-3 px-3 py-2.5"
    >
      {m.townHallLevel && (
        <span className="font-mono text-[0.6rem] font-bold text-umbra-faint">
          TH{m.townHallLevel}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm text-umbra-lilac" title={m.name}>{m.name}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {m.reasons.map((r, i) => (
            <span
              key={i}
              className={`rounded-full px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider ${
                r.includes("Opted out")
                  ? "border border-umbra-line bg-umbra-surface/40 text-umbra-muted"
                  : r.includes("inactive") || r.includes("Rushed")
                    ? "border border-rose-400/30 bg-rose-400/10 text-rose-300"
                    : "border border-amber-400/30 bg-amber-400/10 text-amber-300"
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      {m.daysInactive !== null && m.daysInactive >= 4 && (
        <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-rose-400">
          <IconAlert className="h-3 w-3" aria-hidden />
          {m.daysInactive}d
        </span>
      )}
    </li>
  );
}

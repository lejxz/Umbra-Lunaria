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
 */

import { useState } from "react";
import { PageScaffold } from "@/components/page-scaffold";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSwords, IconUsers } from "@/components/ui/icons";
import type { StrategyPageData, SuggestedParticipant, ReviewMember } from "@/lib/view-models/strategy";

export function StrategyShell({ data }: { data: StrategyPageData }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  return (
    <PageScaffold
      section="Strategy"
      title="War Strategy"
      description="Automatic ranking of suggested war participants and members needing review."
    >
      {/* ── Section 1: Suggested Participants ────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-5 w-1 rounded-full bg-umbra-purple" aria-hidden />
          <h2 className="font-display text-xl text-umbra-lilac">Suggested Participants</h2>
          <span className="font-mono text-xs text-umbra-muted">
            {data.suggested.length} ranked
          </span>
        </div>

        {data.suggested.length > 0 ? (
          <div className="glass rounded-2xl p-3">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-umbra-surface/95 backdrop-blur-sm">
                  <tr className="border-b border-umbra-line">
                    <th className="px-2 py-2 text-left font-mono uppercase tracking-wider text-umbra-muted">#</th>
                    <th className="px-2 py-2 text-left font-mono uppercase tracking-wider text-umbra-muted">Member</th>
                    <th className="px-2 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted">Score</th>
                    <th className="hidden px-2 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted sm:table-cell">Part.</th>
                    <th className="hidden px-2 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted sm:table-cell">Avg★</th>
                    <th className="hidden px-2 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted md:table-cell">3★%</th>
                    <th className="hidden px-2 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted md:table-cell">Activity</th>
                    <th className="hidden px-2 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted lg:table-cell">Rushed</th>
                    <th className="px-2 py-2 text-right font-mono uppercase tracking-wider text-umbra-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
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
          <div className="glass rounded-2xl p-8">
            <EmptyState
              icon={<IconSwords className="h-10 w-10 text-umbra-purple/40" />}
              title="No participants ranked yet"
              description="Members will appear here once the tracker has accumulated enough data."
            />
          </div>
        )}
      </section>

      {/* ── Section 2: Review Needed ────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="h-5 w-1 rounded-full bg-rose-400" aria-hidden />
          <h2 className="font-display text-xl text-umbra-lilac">Review Needed</h2>
          <span className="font-mono text-xs text-umbra-muted">
            {data.review.length} flagged
          </span>
        </div>

        {data.review.length > 0 ? (
          <div className="glass rounded-2xl p-3">
            <div className="max-h-[400px] overflow-y-auto">
              <ul className="space-y-2">
                {data.review.map((m) => (
                  <ReviewRow
                    key={m.playerTag}
                    member={m}
                    onClick={() => setSelectedMember(m.playerTag)}
                  />
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-8">
            <EmptyState
              icon={<IconUsers className="h-10 w-10 text-umbra-purple/40" />}
              title="Everyone looks good"
              description="No members currently flagged for review."
            />
          </div>
        )}
      </section>

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
      className="cursor-pointer border-b border-umbra-line/20 transition hover:bg-white/[.04]"
    >
      <td className="px-2 py-2.5 text-center font-mono text-umbra-muted">
        {rank === 1 ? "👑" : rank}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2">
          {p.townHallLevel && (
            <span className="font-mono text-[0.6rem] font-bold text-umbra-muted">
              TH{p.townHallLevel}
            </span>
          )}
          <span className="truncate font-medium text-umbra-lilac">{p.name}</span>
          {p.isNewMember && (
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-sky-300">
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
      <td className="px-2 py-2.5 text-center">
        <span className={`font-mono font-bold ${scoreColor}`}>{p.compositeScore}</span>
      </td>
      <td className="hidden px-2 py-2.5 text-center text-umbra-muted sm:table-cell">
        {p.participationRate !== null
          ? `${Math.round(p.participationRate * 100)}%`
          : "—"}
      </td>
      <td className="hidden px-2 py-2.5 text-center text-umbra-muted sm:table-cell">
        {p.averageStars !== null ? p.averageStars.toFixed(1) : "—"}
      </td>
      <td className="hidden px-2 py-2.5 text-center text-umbra-muted md:table-cell">
        {p.threeStarRate !== null
          ? `${Math.round(p.threeStarRate * 100)}%`
          : "—"}
      </td>
      <td className="hidden px-2 py-2.5 text-center text-umbra-muted md:table-cell">
        {p.activityScore !== null ? Math.round(p.activityScore) : "—"}
      </td>
      <td className="hidden px-2 py-2.5 text-center text-umbra-muted lg:table-cell">
        {p.rushedPercent !== null
          ? `${Math.round(p.rushedPercent)}%`
          : "—"}
      </td>
      <td className="px-2 py-2.5 text-right">
        <span
          className={`font-mono text-[0.6rem] uppercase tracking-wider ${
            p.isActive ? "text-emerald-400" : "text-umbra-muted/50"
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
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-umbra-line/30 bg-white/[.015] px-3 py-2.5 transition hover:bg-white/[.04]"
    >
      {m.townHallLevel && (
        <span className="font-mono text-[0.6rem] font-bold text-umbra-muted">
          TH{m.townHallLevel}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm text-umbra-lilac">{m.name}</span>
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
        <span className="font-mono text-xs text-rose-400">{m.daysInactive}d</span>
      )}
    </li>
  );
}

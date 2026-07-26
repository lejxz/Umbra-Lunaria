"use client";

/**
 * RecordCard — the shared card design for every Hall of Fame leaderboard.
 *
 * Celestial Observatory redesign: a prestigious `.glass` trophy-case card with
 * `lunar-hover`. The award icon sits in a glowing circular badge that blooms
 * to `shadow-glow` on hover. Each ranked row pairs a holder name
 * (`text-umbra-lilac`) with a large mono record value (`text-umbra-moonlight`).
 *
 * Rank 1 wears a crown, ranks 2/3 take silver/bronze accents. The card stays
 * clickable end-to-end — every row opens the shared MemberDetailSheet via
 * onMemberClick. A "View all" modal exposes the full leaderboard.
 */

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { IconX } from "@/components/ui/icons";

export interface RecordMeta {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
}

export interface RecordEntry {
  playerTag: string;
  name: string;
  rank?: number;
  value: number;
  valueLabel: string;
  metaLabel?: string;
}

const TOP_N = 10;

export function RecordCard({
  meta,
  entries,
  onMemberClick,
  gridClass = "",
}: {
  meta: RecordMeta;
  entries: RecordEntry[];
  onMemberClick?: (playerTag: string) => void;
  gridClass?: string;
}) {
  const [viewAll, setViewAll] = useState(false);
  const displayEntries = entries.slice(0, TOP_N);

  return (
    <>
      <div
        className={`glass lunar-hover group flex h-[350px] flex-col overflow-hidden rounded-2xl ${gridClass}`}
      >
        {/* Category header — circular glowing award badge + title */}
        <div className="flex shrink-0 items-center gap-3 border-b border-umbra-line-soft px-5 py-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-umbra-line bg-umbra-purple/[.06] ${meta.color} transition-shadow duration-220 group-hover:shadow-glow`}
            aria-hidden
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{meta.icon}</span>
          </span>
          <div className="min-w-0">
            <p className="font-mono text-label font-semibold uppercase tracking-[.16em] text-umbra-faint">
              {meta.subtitle}
            </p>
            <h3 className="truncate font-display text-lg text-umbra-moonlight">
              {meta.title}
            </h3>
          </div>
        </div>

        {/* Ranked rows */}
        <div className="scrollbar-none flex-1 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <EmptyLeaderboard />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {displayEntries.map((entry, i) => (
                  <RankRow
                    key={`${entry.playerTag}-${i}`}
                    entry={entry}
                    meta={meta}
                    onClick={() => onMemberClick?.(entry.playerTag)}
                  />
                ))}
              </div>
              {entries.length > TOP_N && (
                <button
                  type="button"
                  onClick={() => setViewAll(true)}
                  className="focus-ring mt-2 flex w-full items-center justify-center rounded-r-md border border-umbra-line bg-umbra-surface/30 py-2.5 font-mono text-2xs font-semibold uppercase tracking-wider text-umbra-muted transition hover:border-umbra-line-bright hover:text-umbra-lilac"
                >
                  View all {entries.length} rankings
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* View-all modal */}
      {viewAll && (
        <Modal
          open
          onClose={() => setViewAll(false)}
          maxWidth="max-w-lg"
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-umbra-line-soft pb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-umbra-line bg-umbra-purple/[.06] ${meta.color}`}
                  aria-hidden
                >
                  <span className="[&>svg]:h-5 [&>svg]:w-5">{meta.icon}</span>
                </span>
                <div>
                  <p className="font-mono text-label font-semibold uppercase tracking-[.16em] text-umbra-faint">
                    {meta.subtitle}
                  </p>
                  <h3 className={`font-display text-lg ${meta.color}`}>
                    {meta.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewAll(false)}
                className="focus-ring btn-icon"
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
              {entries.map((entry, i) => (
                <RankRow
                  key={`${entry.playerTag}-${i}`}
                  entry={entry}
                  meta={meta}
                  onClick={() => {
                    setViewAll(false);
                    onMemberClick?.(entry.playerTag);
                  }}
                />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function RankRow({
  entry,
  meta,
  onClick,
}: {
  entry: RecordEntry;
  meta: RecordMeta;
  onClick?: () => void;
}) {
  const rank = entry.rank ?? 0;
  let rankBadge = "text-umbra-faint";

  if (rank === 1) {
    rankBadge = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
  } else if (rank === 2) {
    rankBadge = "text-slate-300";
  } else if (rank === 3) {
    rankBadge = "text-orange-400";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-3 rounded-r-md border border-umbra-line bg-umbra-surface/30 px-3 py-2 text-left transition hover:border-umbra-line-bright hover:bg-umbra-purple/[.06]"
    >
      <span className={`w-6 shrink-0 text-center font-mono text-xs font-bold ${rankBadge}`}>
        {rank === 1 ? "♛" : rank > 0 ? `#${rank}` : ""}
      </span>
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-umbra-lilac">
            {entry.name}
          </span>
          {entry.metaLabel && entry.metaLabel !== "Since tracking began" && (
            <span className="truncate font-mono text-micro text-umbra-faint">
              {entry.metaLabel}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 font-mono text-base font-semibold ${rank <= 3 ? meta.color : "text-umbra-moonlight"}`}
        >
          {entry.valueLabel}
        </span>
      </div>
    </button>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="flex h-full items-center justify-center py-8 text-center">
      <p className="font-mono text-label text-umbra-faint">
        No records yet.
      </p>
    </div>
  );
}

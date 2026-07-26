"use client";

/**
 * RecordCard — the shared card design for every Hall of Fame leaderboard.
 *
 * Moved from components/dashboard/hall-of-fame-card.tsx and generalized so it
 * works for both the cached all-time awards AND the live-computed records
 * (war + capital). The visual design is unchanged: a fixed-height (350px)
 * glass card with a colored header band (icon + title + subtitle) and a
 * scrollable ranked list. Rank 1/2/3 get the gradient badge treatment;
 * rank 1 shows a 👑.
 *
 * Each row is clickable → opens the shared MemberDetailSheet via onMemberClick.
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
        className={`flex flex-col rounded-2xl border border-umbra-line bg-umbra-surface/40 shadow-lg backdrop-blur-md overflow-hidden h-[350px] ${gridClass}`}
      >
        {/* Category header */}
        <div className={`flex flex-col items-center justify-center border-b border-umbra-line/50 px-5 py-4 text-center ${meta.accent} bg-opacity-20 shrink-0 min-h-[90px]`}>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-muted">
            {meta.subtitle}
          </p>
          <div className={`mt-1.5 flex items-center justify-center gap-2 ${meta.color}`}>
            {meta.icon}
            <h3 className="font-display text-lg">{meta.title}</h3>
          </div>
        </div>

        {/* Ranked rows */}
        <div className="p-3 flex-1 overflow-y-auto scrollbar-none">
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
                  onClick={() => setViewAll(true)}
                  className="mt-2 flex w-full items-center justify-center rounded-lg border border-umbra-line/50 bg-white/[.03] py-2.5 text-xs font-medium text-umbra-muted transition-colors hover:bg-white/[.04] hover:text-umbra-lilac"
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
          <div className="flex flex-col max-h-[85vh] bg-umbra-ink border border-umbra-line rounded-2xl overflow-hidden shadow-2xl">
            <div className={`flex items-center justify-between border-b border-umbra-line/50 px-5 py-4 ${meta.accent} bg-opacity-20`}>
              <div className="flex items-center gap-3">
                <div className={meta.color}>{meta.icon}</div>
                <div>
                  <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-muted/80">
                    {meta.subtitle}
                  </p>
                  <h3 className={`font-display text-lg font-semibold ${meta.color}`}>
                    {meta.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setViewAll(false)}
                className="rounded-full p-2 text-umbra-muted transition-colors hover:bg-umbra-purple/10 hover:text-white"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-umbra-line scrollbar-track-transparent">
              <div className="flex flex-col gap-2">
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
  let rankColor = "text-umbra-muted";
  let badgeStyle = "bg-white/[.03] border border-white/5";

  if (rank === 1) {
    rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
    badgeStyle = "bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20";
  } else if (rank === 2) {
    rankColor = "text-slate-300";
    badgeStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border border-slate-400/20";
  } else if (rank === 3) {
    rankColor = "text-orange-400";
    badgeStyle = "bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20";
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[.04] focus-ring text-left ${badgeStyle}`}
    >
      <span className={`w-5 shrink-0 text-center font-mono text-xs font-bold ${rankColor}`}>
        {rank === 1 ? "👑" : rank > 0 ? `#${rank}` : ""}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-semibold text-xs text-white/90">
            {entry.name}
          </span>
          <span className={`shrink-0 font-mono text-xs font-bold ${rank <= 3 ? meta.color : "text-umbra-lilac/70"}`}>
            {entry.valueLabel}
          </span>
        </div>
        {entry.metaLabel && entry.metaLabel !== "Since tracking began" && (
          <span className="font-mono text-micro text-umbra-muted truncate">
            {entry.metaLabel}
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="py-8 text-center flex items-center justify-center h-full">
      <p className="font-mono text-label text-umbra-muted/50">
        No records yet.
      </p>
    </div>
  );
}

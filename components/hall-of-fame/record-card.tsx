"use client";

/**
 * RecordCard — the shared card design for every Hall of Fame leaderboard.
 *
 * Redesigned "podium + list" layout:
 *  • Featured #1 holder — large name + big value in a glowing accent hero.
 *  • Runner-ups (#2-3) — compact rows with medal-colored rank badges.
 *  • Rest (#4-10) — minimal rows, just rank + name + value.
 *  • No fixed height — card sizes to content; scroll only if >10 entries.
 *  • Glow-on-hover — card lifts and border brightens.
 *  • Crown icon (not emoji) for rank 1, matching the celestial icon system.
 *
 * Each row is clickable → opens the shared MemberDetailSheet via onMemberClick.
 */

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { IconCrown, IconX } from "@/components/ui/icons";

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
  const champion = displayEntries[0];
  const runnerUps = displayEntries.slice(1, 3);
  const rest = displayEntries.slice(3);

  return (
    <>
      <div
        className={`glass group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:border-umbra-purple/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] ${gridClass}`}
      >
        {/* Category header — icon badge + title + subtitle */}
        <div className={`flex items-center gap-3 border-b border-umbra-line/50 px-4 py-3 ${meta.accent} bg-opacity-20`}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-umbra-line/50 bg-umbra-ink/40 ${meta.color}`}>
            {meta.icon}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-umbra-lilac leading-tight">
              {meta.title}
            </h3>
            <p className="font-mono text-micro uppercase tracking-wider text-umbra-muted truncate">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-3">
          {entries.length === 0 ? (
            <EmptyLeaderboard />
          ) : (
            <>
              {/* Featured #1 — champion */}
              {champion && (
                <ChampionRow
                  entry={champion}
                  meta={meta}
                  onClick={() => onMemberClick?.(champion.playerTag)}
                />
              )}

              {/* Runner-ups #2-3 */}
              {runnerUps.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {runnerUps.map((entry, i) => (
                    <RunnerUpRow
                      key={`${entry.playerTag}-${i}`}
                      entry={entry}
                      meta={meta}
                      onClick={() => onMemberClick?.(entry.playerTag)}
                    />
                  ))}
                </div>
              )}

              {/* Rest #4-10 */}
              {rest.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5 border-t border-umbra-line/30 pt-2">
                  {rest.map((entry, i) => (
                    <RestRow
                      key={`${entry.playerTag}-${i}`}
                      entry={entry}
                      onClick={() => onMemberClick?.(entry.playerTag)}
                    />
                  ))}
                </div>
              )}

              {entries.length > TOP_N && (
                <button
                  onClick={() => setViewAll(true)}
                  className="focus-ring mt-2 flex w-full items-center justify-center rounded-lg border border-umbra-line/50 bg-white/[.03] py-2 text-xs font-medium text-umbra-muted transition-colors hover:bg-white/[.04] hover:text-umbra-lilac"
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
          ariaLabel={`${meta.title} — full leaderboard`}
        >
          <div className="mb-4 border-b border-umbra-line/40 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border border-umbra-line/50 bg-umbra-ink/40 ${meta.color}`}>
                  {meta.icon}
                </span>
                <div>
                  <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
                    {meta.subtitle}
                  </p>
                  <h3 className={`font-display text-lg font-semibold ${meta.color}`}>
                    {meta.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setViewAll(false)}
                className="focus-ring rounded-full p-2 text-umbra-muted transition-colors hover:bg-umbra-purple/10 hover:text-umbra-lilac"
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
            {entries.map((entry, i) => (
              <FullListRow
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
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Champion — featured #1 holder with large value + glow
// ---------------------------------------------------------------------------

function ChampionRow({
  entry,
  meta,
  onClick,
}: {
  entry: RecordEntry;
  meta: RecordMeta;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring group/champ flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[.08] via-umbra-purple/[.04] to-transparent px-3 py-3 text-left transition-all duration-200 hover:border-amber-500/40 hover:from-amber-500/[.12]`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.3)]">
        <IconCrown className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-micro uppercase tracking-wider text-amber-300/80">
          Champion
        </p>
        <p className="truncate font-display text-sm font-semibold text-umbra-moonlight">
          {entry.name}
        </p>
        {entry.metaLabel && entry.metaLabel !== "Since tracking began" && (
          <p className="truncate font-mono text-micro text-umbra-muted">
            {entry.metaLabel}
          </p>
        )}
      </div>
      <span className={`shrink-0 font-mono text-lg font-bold ${meta.color}`}>
        {entry.valueLabel}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Runner-up — #2 (silver) and #3 (bronze)
// ---------------------------------------------------------------------------

function RunnerUpRow({
  entry,
  meta,
  onClick,
}: {
  entry: RecordEntry;
  meta: RecordMeta;
  onClick?: () => void;
}) {
  const rank = entry.rank ?? 0;
  const isSilver = rank === 2;
  const medalColor = isSilver ? "text-slate-300" : "text-orange-400";
  const medalBg = isSilver
    ? "bg-slate-400/10 border-slate-400/20"
    : "bg-orange-500/10 border-orange-500/20";

  return (
    <button
      onClick={onClick}
      className={`focus-ring flex w-full items-center gap-2.5 rounded-lg border ${medalBg} px-2.5 py-1.5 text-left transition-colors hover:bg-white/[.04]`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[0.6rem] font-bold ${medalColor} ${medalBg} border`}>
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-umbra-lilac">
        {entry.name}
      </span>
      <span className={`shrink-0 font-mono text-xs font-bold ${meta.color}`}>
        {entry.valueLabel}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rest — #4-10, minimal
// ---------------------------------------------------------------------------

function RestRow({
  entry,
  onClick,
}: {
  entry: RecordEntry;
  onClick?: () => void;
}) {
  const rank = entry.rank ?? 0;
  return (
    <button
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-1 text-left transition-colors hover:bg-white/[.03]"
    >
      <span className="w-5 shrink-0 text-center font-mono text-[0.6rem] font-medium text-umbra-muted">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-umbra-lilac/80">
        {entry.name}
      </span>
      <span className="shrink-0 font-mono text-[0.65rem] text-umbra-muted">
        {entry.valueLabel}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Full list row — used in the view-all modal
// ---------------------------------------------------------------------------

function FullListRow({
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
    rankColor = "text-amber-300";
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
      className={`focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[.04] ${badgeStyle}`}
    >
      <span className={`w-5 shrink-0 text-center font-mono text-xs font-bold ${rankColor}`}>
        {rank === 1 ? "★" : rank > 0 ? rank : ""}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-xs font-semibold text-umbra-lilac">
            {entry.name}
          </span>
          <span className={`shrink-0 font-mono text-xs font-bold ${rank <= 3 ? meta.color : "text-umbra-lilac/70"}`}>
            {entry.valueLabel}
          </span>
        </div>
        {entry.metaLabel && entry.metaLabel !== "Since tracking began" && (
          <span className="truncate font-mono text-micro text-umbra-muted">
            {entry.metaLabel}
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="flex h-20 items-center justify-center py-4 text-center">
      <p className="font-mono text-label text-umbra-muted/50">
        No records yet.
      </p>
    </div>
  );
}

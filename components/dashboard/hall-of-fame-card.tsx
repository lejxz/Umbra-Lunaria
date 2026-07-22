"use client";

import { useState } from "react";

import { Gift, Swords, Flame, Coins, Eye } from "lucide-react";
import type { HallOfFame, HallOfFameAwardKey, HallOfFameLeaderboard } from "@/lib/view-models/dashboard";
import { Modal } from "@/components/ui/modal";
import { IconX } from "@/components/ui/icons";

const AWARD_META: Record<
  HallOfFameAwardKey,
  { title: string; subtitle: string; icon: React.ReactNode; color: string; accent: string }
> = {
  philanthropist: {
    title: "The Philanthropist",
    subtitle: "Highest all-time donations",
    icon: <Gift className="w-5 h-5" />,
    color: "text-emerald-400",
    accent: "border-emerald-400/40 bg-emerald-400/5",
  },
  vanguard: {
    title: "The Vanguard",
    subtitle: "Most 3-star war attacks",
    icon: <Swords className="w-5 h-5" />,
    color: "text-amber-400",
    accent: "border-amber-400/40 bg-amber-400/5",
  },
  dedicated: {
    title: "The Dedicated",
    subtitle: "Longest login streak",
    icon: <Flame className="w-5 h-5" />,
    color: "text-orange-400",
    accent: "border-orange-400/40 bg-orange-400/5",
  },
  capitalist: {
    title: "The Capitalist",
    subtitle: "Best single raid weekend",
    icon: <Coins className="w-5 h-5" />,
    color: "text-yellow-400",
    accent: "border-yellow-400/40 bg-yellow-400/5",
  },
  unsleeping: {
    title: "The Unsleeping",
    subtitle: "Highest all-time raw activity",
    icon: <Eye className="w-5 h-5" />,
    color: "text-umbra-purple",
    accent: "border-umbra-purple/40 bg-umbra-purple/5",
  },
};

const CARD_ORDER: Array<{ key: HallOfFameAwardKey; gridClass: string }> = [
  { key: "unsleeping", gridClass: "lg:col-start-2 lg:col-span-2" },
  { key: "dedicated", gridClass: "lg:col-span-2" },
  { key: "philanthropist", gridClass: "lg:col-span-2 lg:col-start-1" },
  { key: "vanguard", gridClass: "lg:col-span-2" },
  { key: "capitalist", gridClass: "lg:col-span-2" },
];

export function HallOfFameCard({
  data,
  onMemberClick,
}: {
  data: HallOfFame;
  onMemberClick?: (playerTag: string) => void;
}) {
  const [viewAllAward, setViewAllAward] = useState<HallOfFameAwardKey | null>(null);
  const activeBoard = data.leaderboards.find((lb) => lb.awardKey === viewAllAward);
  const activeMeta = viewAllAward ? AWARD_META[viewAllAward] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-2">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          All-time clan records
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-umbra-lilac">
          Hall of Fame
        </h2>
      </div>

      {/* Grid Layout - 6 columns to allow centering 2 items (span 2 each) then 3 items */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 lg:gap-5">
        {CARD_ORDER.map(({ key, gridClass }) => {
          const meta = AWARD_META[key];
          const board = data.leaderboards.find((lb) => lb.awardKey === key);
          return (
            <div
              key={key}
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
                {!board || board.entries.length === 0 ? (
                  <EmptyLeaderboard />
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {board.entries.slice(0, 5).map((entry) => (
                        <RankRow
                          key={entry.playerTag}
                          entry={entry}
                          meta={meta}
                          onClick={() => onMemberClick?.(entry.playerTag)}
                        />
                      ))}
                    </div>
                    {board.entries.length > 5 && (
                      <button
                        onClick={() => setViewAllAward(key)}
                        className="mt-2 flex w-full items-center justify-center rounded-lg border border-umbra-line/30 bg-white/[0.02] py-2.5 text-xs font-medium text-umbra-muted transition-colors hover:bg-white/[0.04] hover:text-umbra-lilac"
                      >
                        View all {board.entries.length} rankings
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeBoard && activeMeta && (
        <Modal
          open={viewAllAward !== null}
          onClose={() => setViewAllAward(null)}
          maxWidth="max-w-lg"
        >
          <div className="flex flex-col max-h-[85vh] bg-umbra-ink border border-umbra-line rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className={`flex items-center justify-between border-b border-umbra-line/50 px-5 py-4 ${activeMeta.accent} bg-opacity-20`}>
              <div className="flex items-center gap-3">
                <div className={activeMeta.color}>{activeMeta.icon}</div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-muted/80">
                    {activeMeta.subtitle}
                  </p>
                  <h3 className={`font-display text-lg font-semibold ${activeMeta.color}`}>
                    {activeMeta.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setViewAllAward(null)}
                className="rounded-full p-2 text-umbra-muted transition-colors hover:bg-white/10 hover:text-white"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            
            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-umbra-line scrollbar-track-transparent">
              <div className="flex flex-col gap-2">
                {activeBoard.entries.map((entry) => (
                  <RankRow
                    key={entry.playerTag}
                    entry={entry}
                    meta={activeMeta}
                    onClick={() => {
                      setViewAllAward(null);
                      onMemberClick?.(entry.playerTag);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RankRow({
  entry,
  meta,
  onClick,
}: {
  entry: HallOfFameLeaderboard["entries"][number];
  meta: (typeof AWARD_META)[HallOfFameAwardKey];
  onClick?: () => void;
}) {
  let rankColor = "text-umbra-muted";
  let badgeStyle = "bg-white/[.02] border border-white/5";

  if (entry.rank === 1) {
    rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
    badgeStyle = "bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20";
  } else if (entry.rank === 2) {
    rankColor = "text-slate-300";
    badgeStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border border-slate-400/20";
  } else if (entry.rank === 3) {
    rankColor = "text-orange-400";
    badgeStyle = "bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20";
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[.07] focus-ring text-left ${badgeStyle}`}
    >
      {/* Rank */}
      <span className={`w-5 shrink-0 text-center font-mono text-xs font-bold ${rankColor}`}>
        {entry.rank === 1 ? "👑" : `#${entry.rank}`}
      </span>

      {/* Name and Value Stack */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-semibold text-[13px] text-white/90">
            {entry.name}
          </span>
          <span className={`shrink-0 font-mono text-xs font-bold ${entry.rank <= 3 ? meta.color : "text-umbra-lilac/70"}`}>
            {entry.valueLabel}
          </span>
        </div>
        {/* Meta label (secondary stat) */}
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

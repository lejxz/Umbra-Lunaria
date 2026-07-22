"use client";

import type { HallOfFame, HallOfFameAwardKey, HallOfFameLeaderboard } from "@/lib/view-models/dashboard";

const AWARD_META: Record<
  HallOfFameAwardKey,
  { title: string; subtitle: string; icon: string; color: string; accent: string }
> = {
  philanthropist: {
    title: "The Philanthropist",
    subtitle: "Highest all-time donations",
    icon: "🎁",
    color: "text-emerald-400",
    accent: "border-emerald-400/40 bg-emerald-400/5",
  },
  vanguard: {
    title: "The Vanguard",
    subtitle: "Most 3-star war attacks",
    icon: "⚔️",
    color: "text-amber-400",
    accent: "border-amber-400/40 bg-amber-400/5",
  },
  dedicated: {
    title: "The Dedicated",
    subtitle: "Longest login streak",
    icon: "🔥",
    color: "text-orange-400",
    accent: "border-orange-400/40 bg-orange-400/5",
  },
  capitalist: {
    title: "The Capitalist",
    subtitle: "Best single raid weekend",
    icon: "💰",
    color: "text-yellow-400",
    accent: "border-yellow-400/40 bg-yellow-400/5",
  },
  unsleeping: {
    title: "The Unsleeping",
    subtitle: "Highest all-time raw activity",
    icon: "👁️",
    color: "text-umbra-purple",
    accent: "border-umbra-purple/40 bg-umbra-purple/5",
  },
};

const AWARD_ORDER: HallOfFameAwardKey[] = [
  "philanthropist",
  "vanguard",
  "dedicated",
  "capitalist",
  "unsleeping",
];

const RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];

export function HallOfFameCard({ data }: { data: HallOfFame }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-1">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          All-time clan records
        </p>
        <h2 className="mt-0.5 font-display text-2xl font-semibold text-umbra-lilac">
          Hall of Fame
        </h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {AWARD_ORDER.map((key) => {
          const meta = AWARD_META[key];
          const board = data.leaderboards.find((lb) => lb.awardKey === key);
          return (
            <div
              key={key}
              className="flex flex-col rounded-2xl border border-umbra-line bg-umbra-surface/40 shadow-lg backdrop-blur-md overflow-hidden"
            >
              {/* Category header */}
              <div className={`flex flex-col items-center gap-1.5 border-b border-umbra-line/50 p-4 text-center ${meta.accent} bg-opacity-20`}>
                <span className="text-3xl">{meta.icon}</span>
                <div>
                  <p className={`font-display text-sm font-bold ${meta.color}`}>{meta.title}</p>
                  <p className="font-mono text-[9px] text-umbra-muted opacity-80 mt-0.5">{meta.subtitle}</p>
                </div>
              </div>

              {/* Ranked rows */}
              <div className="p-3 flex-1">
                {!board || board.entries.length === 0 ? (
                  <EmptyLeaderboard />
                ) : (
                  <div className="space-y-1">
                    {board.entries.map((entry) => (
                      <RankRow key={entry.playerTag} entry={entry} meta={meta} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankRow({
  entry,
  meta,
}: {
  entry: HallOfFameLeaderboard["entries"][number];
  meta: (typeof AWARD_META)[HallOfFameAwardKey];
}) {
  const isTop3 = entry.rank <= 3;
  const rankColor = RANK_COLORS[entry.rank - 1] ?? "text-umbra-muted";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-white/[.04] ${
        isTop3 ? "bg-white/[.02]" : ""
      }`}
    >
      {/* Rank */}
      <span
        className={`w-5 shrink-0 text-center font-mono text-xs font-bold ${rankColor}`}
      >
        {entry.rank === 1 ? "👑" : `#${entry.rank}`}
      </span>

      {/* Name and Value Stack */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-semibold text-[13px] text-white/90">
            {entry.name}
          </span>
          <span className={`shrink-0 font-mono text-[11px] font-bold ${isTop3 ? meta.color : "text-umbra-lilac/70"}`}>
            {entry.valueLabel}
          </span>
        </div>
        {/* Meta label (secondary stat) */}
        {entry.metaLabel && (
          <span className="font-mono text-[9px] text-umbra-muted truncate">
            {entry.metaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="py-8 text-center flex items-center justify-center h-full">
      <p className="font-mono text-[10px] text-umbra-muted/50">
        No records yet.
      </p>
    </div>
  );
}

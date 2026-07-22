"use client";

import { useState } from "react";
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
  const [activeKey, setActiveKey] = useState<HallOfFameAwardKey>("philanthropist");

  const activeBoard = data.leaderboards.find((lb) => lb.awardKey === activeKey);
  const meta = AWARD_META[activeKey];

  return (
    <div className="rounded-2xl border border-umbra-line bg-umbra-surface/40 shadow-lg backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-umbra-line/50">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          All-time clan records
        </p>
        <h2 className="mt-0.5 font-display text-xl font-semibold text-umbra-lilac">
          Hall of Fame
        </h2>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-umbra-line/50 scrollbar-none">
        {AWARD_ORDER.map((key) => {
          const m = AWARD_META[key];
          const isActive = key === activeKey;
          const board = data.leaderboards.find((lb) => lb.awardKey === key);
          return (
            <button
              key={key}
              id={`hof-tab-${key}`}
              onClick={() => setActiveKey(key)}
              className={`flex flex-col items-center gap-1 px-5 py-3 text-left shrink-0 border-b-2 transition-all duration-200 ${
                isActive
                  ? `border-current ${m.color} bg-white/[.03]`
                  : "border-transparent text-umbra-muted hover:text-umbra-lilac/70 hover:bg-white/[.02]"
              }`}
            >
              <span className="text-lg leading-none">{m.icon}</span>
              <span className="font-display text-[11px] font-semibold leading-tight whitespace-nowrap">
                {m.title}
              </span>
              {board && board.entries.length > 0 && (
                <span className="font-mono text-[9px] opacity-50">
                  {board.entries.length} ranked
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active leaderboard */}
      <div className="p-5">
        {/* Category header */}
        <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${meta.accent}`}>
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className={`font-display text-base font-bold ${meta.color}`}>{meta.title}</p>
            <p className="font-mono text-[10px] text-umbra-muted">{meta.subtitle}</p>
          </div>
        </div>

        {/* Ranked rows */}
        {!activeBoard || activeBoard.entries.length === 0 ? (
          <EmptyLeaderboard />
        ) : (
          <div className="space-y-1.5">
            {activeBoard.entries.map((entry) => (
              <RankRow key={entry.playerTag} entry={entry} meta={meta} />
            ))}
          </div>
        )}
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.03] ${
        isTop3 ? "bg-white/[.02]" : ""
      }`}
    >
      {/* Rank */}
      <span
        className={`w-6 shrink-0 text-center font-mono text-sm font-bold ${rankColor}`}
      >
        {entry.rank === 1 ? "👑" : `#${entry.rank}`}
      </span>

      {/* Name */}
      <span className="flex-1 truncate font-semibold text-sm text-white/90">
        {entry.name}
      </span>

      {/* Meta label (secondary stat) */}
      {entry.metaLabel && (
        <span className="font-mono text-[10px] text-umbra-muted shrink-0">
          {entry.metaLabel}
        </span>
      )}

      {/* Value */}
      <span className={`shrink-0 font-mono text-sm font-bold ${isTop3 ? meta.color : "text-umbra-lilac/70"}`}>
        {entry.valueLabel}
      </span>
    </div>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="py-10 text-center">
      <p className="font-mono text-xs text-umbra-muted">
        No data yet — records populate after the first daily batch.
      </p>
    </div>
  );
}

"use client";

import type { HallOfFame, HallOfFameAwardKey, HallOfFameEntry } from "@/lib/view-models/dashboard";

const AWARD_META: Record<
  HallOfFameAwardKey,
  { title: string; subtitle: string; icon: string; color: string; glow: string }
> = {
  philanthropist: {
    title: "The Philanthropist",
    subtitle: "Highest donations given",
    icon: "🎁",
    color: "text-emerald-400",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.15)]",
  },
  vanguard: {
    title: "The Vanguard",
    subtitle: "Most 3-star war attacks",
    icon: "⚔️",
    color: "text-amber-400",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.15)]",
  },
  dedicated: {
    title: "The Dedicated",
    subtitle: "Longest login streak",
    icon: "🔥",
    color: "text-orange-400",
    glow: "shadow-[0_0_24px_rgba(251,146,60,0.15)]",
  },
  capitalist: {
    title: "The Capitalist",
    subtitle: "Highest Capital loot (single raid)",
    icon: "💰",
    color: "text-yellow-400",
    glow: "shadow-[0_0_24px_rgba(250,204,21,0.15)]",
  },
  unsleeping: {
    title: "The Unsleeping",
    subtitle: "Highest all-time raw activity",
    icon: "👁️",
    color: "text-umbra-purple",
    glow: "shadow-[0_0_24px_rgba(182,120,255,0.2)]",
  },
};

export function HallOfFameCard({ data }: { data: HallOfFame }) {
  const { entries } = data;

  return (
    <div className="rounded-2xl border border-umbra-line bg-umbra-surface/40 p-5 shadow-lg backdrop-blur-md">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Clan records
          </p>
          <h2 className="mt-0.5 font-display text-xl font-semibold text-umbra-lilac">
            Hall of Fame
          </h2>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["philanthropist", "vanguard", "dedicated", "capitalist", "unsleeping"] as HallOfFameAwardKey[]).map(
            (key) => {
              const entry = entries.find((e) => e.awardKey === key);
              const meta = AWARD_META[key];
              return entry ? (
                <AwardTile key={key} entry={entry} meta={meta} />
              ) : (
                <PendingTile key={key} meta={meta} />
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function AwardTile({
  entry,
  meta,
}: {
  entry: HallOfFameEntry;
  meta: (typeof AWARD_META)[HallOfFameAwardKey];
}) {
  return (
    <div
      className={`group relative flex flex-col rounded-xl border border-white/[.06] bg-white/[.03] p-4 transition-all duration-300 hover:bg-white/[.05] hover:border-white/[.12] ${meta.glow}`}
    >
      {/* Icon */}
      <span className="text-2xl" role="img" aria-label={meta.title}>
        {meta.icon}
      </span>

      {/* Award title */}
      <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {meta.subtitle}
      </p>
      <p className="font-display text-[11px] font-semibold text-umbra-lilac/80 leading-tight">
        {meta.title}
      </p>

      {/* Record value — the big number */}
      <p className={`mt-3 font-display text-2xl font-bold leading-none ${meta.color}`}>
        {entry.recordValue.toLocaleString()}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-umbra-muted">
        {entry.valueLabel}
      </p>

      {/* Holder */}
      <div className="mt-3 border-t border-white/[.05] pt-3">
        <p className="font-semibold text-sm text-white truncate">{entry.holderName}</p>
        {entry.periodLabel && (
          <p className="font-mono text-[9px] text-umbra-muted/70 mt-0.5">{entry.periodLabel}</p>
        )}
      </div>

      {/* Crown badge */}
      <span className="absolute right-3 top-3 text-[10px] opacity-30 group-hover:opacity-60 transition-opacity">
        👑
      </span>
    </div>
  );
}

function PendingTile({
  meta,
}: {
  meta: (typeof AWARD_META)[HallOfFameAwardKey];
}) {
  return (
    <div className="flex flex-col rounded-xl border border-dashed border-white/[.06] bg-white/[.01] p-4">
      <span className="text-2xl opacity-30" role="img" aria-label={meta.title}>
        {meta.icon}
      </span>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-umbra-muted/50">
        {meta.subtitle}
      </p>
      <p className="font-display text-[11px] font-semibold text-umbra-lilac/30 leading-tight">
        {meta.title}
      </p>
      <p className="mt-3 font-mono text-xs text-umbra-muted/40">
        Pending first daily batch
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center">
      <p className="font-mono text-xs text-umbra-muted">
        Records will appear after the first daily batch completes.
      </p>
    </div>
  );
}

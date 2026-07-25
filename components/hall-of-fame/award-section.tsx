"use client";

/**
 * AwardSection — one of the 5 cached all-time award leaderboards.
 *
 * Renders a glass card with a header (icon + title + subtitle) and the full
 * ranked list (not just top 5 — the dashboard card truncates, this page shows
 * everyone with a recorded rank). Each row is clickable → opens the shared
 * MemberDetailSheet.
 *
 * The award metadata (title, subtitle, icon) mirrors the dashboard's
 * HallOfFameCard so the two surfaces feel consistent. The card shell is
 * intentionally neutral (glass + umbra-line border) so the All-Time Legends
 * grid reads as a unified set — only the icon carries the per-award color.
 *
 * Card structure matches LiveRecordSection exactly so the two grids have the
 * same visual rhythm.
 */

import type { HallOfFameLeaderboard, HallOfFameAwardKey } from "@/lib/view-models/hall-of-fame";
import {
  IconGift,
  IconSwords,
  IconFlame,
  IconCoins,
  IconEye,
  IconCrown,
} from "@/components/ui/icons";

const AWARD_META: Record<
  HallOfFameAwardKey,
  { title: string; subtitle: string; icon: React.ReactNode; color: string }
> = {
  philanthropist: {
    title: "The Philanthropist",
    subtitle: "Highest all-time donations",
    icon: <IconGift className="h-5 w-5" />,
    color: "text-emerald-400",
  },
  vanguard: {
    title: "The Vanguard",
    subtitle: "Most 3-star war attacks",
    icon: <IconSwords className="h-5 w-5" />,
    color: "text-amber-400",
  },
  dedicated: {
    title: "The Dedicated",
    subtitle: "Longest login streak",
    icon: <IconFlame className="h-5 w-5" />,
    color: "text-orange-400",
  },
  capitalist: {
    title: "The Capitalist",
    subtitle: "Best single raid weekend",
    icon: <IconCoins className="h-5 w-5" />,
    color: "text-yellow-400",
  },
  unsleeping: {
    title: "The Unsleeping",
    subtitle: "Highest all-time raw activity",
    icon: <IconEye className="h-5 w-5" />,
    color: "text-umbra-purple",
  },
};

export function AwardSection({
  board,
  onMemberClick,
}: {
  board: HallOfFameLeaderboard;
  onMemberClick: (tag: string) => void;
}) {
  const meta = AWARD_META[board.awardKey];
  if (!meta || board.entries.length === 0) return null;

  return (
    <section className="glass flex flex-col rounded-2xl border border-umbra-line">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-umbra-line/50 p-4">
        <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>
        <div className="min-w-0">
          <h3 className="font-display text-base text-umbra-lilac">{meta.title}</h3>
          <p className="text-xs text-umbra-muted">{meta.subtitle}</p>
        </div>
      </div>

      {/* Leaderboard */}
      <ol className="max-h-80 flex-1 overflow-y-auto p-2">
        {board.entries.map((entry) => (
          <li key={`${entry.playerTag}-${entry.rank}`}>
            <button
              type="button"
              onClick={() => onMemberClick(entry.playerTag)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
            >
              <RankBadge rank={entry.rank} />
              <span className="min-w-0 flex-1 truncate text-sm text-umbra-lilac">
                {entry.name}
              </span>
              <span className="text-right text-xs text-umbra-muted">
                <span className="block font-semibold text-umbra-lilac">
                  {entry.valueLabel}
                </span>
                {entry.metaLabel &&
                  entry.metaLabel !== "Since tracking began" && (
                    <span className="block text-[0.65rem] text-umbra-muted/70">
                      {entry.metaLabel}
                    </span>
                  )}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Rank pill — 👑 for #1, gradient gold/silver/bronze for top 3, plain number otherwise. */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <IconCrown className="h-4 w-4 text-amber-400" />
      </span>
    );
  }
  const tier =
    rank === 2
      ? "from-slate-300/30 to-slate-100/10 text-slate-200"
      : rank === 3
        ? "from-amber-600/30 to-amber-400/10 text-amber-300"
        : "from-umbra-line/20 to-transparent text-umbra-muted";
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-b ${tier} font-mono text-[0.65rem] font-semibold`}
    >
      {rank}
    </span>
  );
}

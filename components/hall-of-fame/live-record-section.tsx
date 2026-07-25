"use client";

/**
 * LiveRecordSection — one live-computed record category.
 *
 * Same visual structure as AwardSection but driven by the LiveRecordCategory
 * type (computed at page load from raw tables, not cached). Each row is
 * clickable → opens the shared MemberDetailSheet.
 *
 * The icon is mapped from the string key in the view model to a Lucide icon
 * so the view model stays serialization-safe (no JSX in the data layer). The
 * icon carries a per-category color so the grid is still visually varied,
 * but the card shell is neutral (glass + umbra-line border) to match the
 * All-Time Legends grid above.
 */

import type { LiveRecordCategory } from "@/lib/view-models/hall-of-fame";
import {
  IconCoins,
  IconSwords,
  IconFlame,
  IconGift,
  IconCrown,
  IconClock,
  IconTrophy,
  IconZap,
} from "@/components/ui/icons";

const ICON_MAP: Record<
  LiveRecordCategory["icon"],
  { node: React.ReactNode; color: string }
> = {
  coins: { node: <IconCoins className="h-5 w-5" />, color: "text-yellow-400" },
  swords: { node: <IconSwords className="h-5 w-5" />, color: "text-amber-400" },
  flame: { node: <IconFlame className="h-5 w-5" />, color: "text-orange-400" },
  gift: { node: <IconGift className="h-5 w-5" />, color: "text-emerald-400" },
  crown: { node: <IconCrown className="h-5 w-5" />, color: "text-amber-300" },
  clock: { node: <IconClock className="h-5 w-5" />, color: "text-sky-300" },
  trophy: { node: <IconTrophy className="h-5 w-5" />, color: "text-umbra-purple" },
  zap: { node: <IconZap className="h-5 w-5" />, color: "text-teal-300" },
};

export function LiveRecordSection({
  category,
  onMemberClick,
}: {
  category: LiveRecordCategory;
  onMemberClick: (tag: string) => void;
}) {
  const iconMeta = ICON_MAP[category.icon] ?? {
    node: <IconTrophy className="h-5 w-5" />,
    color: "text-umbra-purple",
  };

  return (
    <section className="glass flex flex-col rounded-2xl border border-umbra-line">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-umbra-line/50 p-4">
        <span className={`shrink-0 ${iconMeta.color}`}>{iconMeta.node}</span>
        <div className="min-w-0">
          <h3 className="font-display text-base text-umbra-lilac">{category.title}</h3>
          <p className="text-xs text-umbra-muted">{category.description}</p>
        </div>
      </div>

      {/* Leaderboard */}
      <ol className="max-h-80 flex-1 overflow-y-auto p-2">
        {category.entries.map((entry, i) => (
          <li key={`${category.key}-${entry.playerTag}-${i}`}>
            <button
              type="button"
              onClick={() => onMemberClick(entry.playerTag)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-[0.65rem] font-semibold text-umbra-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-umbra-lilac">
                {entry.name}
              </span>
              <span className="text-right text-xs text-umbra-muted">
                <span className="block font-semibold text-umbra-lilac">
                  {entry.valueLabel}
                </span>
                {entry.metaLabel && (
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

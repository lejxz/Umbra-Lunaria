"use client";

/**
 * LiveRecordSection — one live-computed record category.
 *
 * Same visual structure as AwardSection but driven by the LiveRecordCategory
 * type (computed at page load from raw tables, not cached). Each row is
 * clickable → opens the shared MemberDetailSheet.
 *
 * The icon is mapped from the string key in the view model to a Lucide icon
 * so the view model stays serialization-safe (no JSX in the data layer).
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

const ICON_MAP: Record<LiveRecordCategory["icon"], React.ReactNode> = {
  coins: <IconCoins className="h-5 w-5" />,
  swords: <IconSwords className="h-5 w-5" />,
  flame: <IconFlame className="h-5 w-5" />,
  gift: <IconGift className="h-5 w-5" />,
  crown: <IconCrown className="h-5 w-5" />,
  clock: <IconClock className="h-5 w-5" />,
  trophy: <IconTrophy className="h-5 w-5" />,
  zap: <IconZap className="h-5 w-5" />,
};

// Accent colors cycle through the palette so adjacent cards differ.
const ACCENTS = [
  "border-sky-400/30 bg-sky-400/5 text-sky-300",
  "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
  "border-amber-400/30 bg-amber-400/5 text-amber-300",
  "border-rose-400/30 bg-rose-400/5 text-rose-300",
  "border-umbra-purple/30 bg-umbra-purple/5 text-umbra-purple",
  "border-teal-400/30 bg-teal-400/5 text-teal-300",
];

export function LiveRecordSection({
  category,
  index,
  onMemberClick,
}: {
  category: LiveRecordCategory;
  index: number;
  onMemberClick: (tag: string) => void;
}) {
  const accent = ACCENTS[index % ACCENTS.length] ?? ACCENTS[0]!;
  const icon = ICON_MAP[category.icon] ?? <IconTrophy className="h-5 w-5" />;

  return (
    <section className={`glass flex flex-col rounded-2xl border ${accent}`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-umbra-line/50 p-4">
        <span className="shrink-0">{icon}</span>
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

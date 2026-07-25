"use client";

/**
 * HallOfFameShell — the dedicated /hall-of-fame page composition root.
 *
 * Uses the shared RecordCard design (moved from the dashboard). Four
 * categorized sections:
 *
 *   1. All-Time Legends — general cached awards that don't fit a specific
 *      category (Philanthropist, Dedicated, Unsleeping).
 *   2. War Hall of Fame — The Vanguard (cached) + live war records (perfect
 *      attendance, fastest 3-star).
 *   3. Capital Hall of Fame — The Capitalist (cached) + live raid records
 *      (most raid gold, most raid medals, most bonus attacks, raid MVP, most
 *      seasons participated, best gold per attack).
 *   4. Tenure — longest-tenured member.
 *
 * Each section can mix cached awards (from hall_of_fame_records, computed by
 * the daily batch) with live records (computed on-demand from raw tables).
 * Both use the same RecordCard design.
 *
 * All leaderboards are limited to top 10. Each row is clickable → opens the
 * shared MemberDetailSheet.
 */

import { useState } from "react";
import { PageScaffold } from "@/components/page-scaffold";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";
import { RecordCard, type RecordMeta, type RecordEntry } from "./record-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IconGift,
  IconSwords,
  IconFlame,
  IconCoins,
  IconEye,
  IconCrown,
  IconClock,
  IconTrophy,
  IconZap,
  IconUsers,
} from "@/components/ui/icons";
import type { HallOfFamePageData } from "@/lib/view-models/hall-of-fame";

// ---------------------------------------------------------------------------
// Metadata for the cached all-time awards (same design as the dashboard).
// ---------------------------------------------------------------------------

const AWARD_META: Record<string, RecordMeta> = {
  philanthropist: {
    title: "The Philanthropist",
    subtitle: "Highest all-time donations",
    icon: <IconGift className="w-5 h-5" />,
    color: "text-emerald-400",
    accent: "border-emerald-400/40 bg-emerald-400/5",
  },
  vanguard: {
    title: "The Vanguard",
    subtitle: "Most 3-star war attacks",
    icon: <IconSwords className="w-5 h-5" />,
    color: "text-amber-400",
    accent: "border-amber-400/40 bg-amber-400/5",
  },
  dedicated: {
    title: "The Dedicated",
    subtitle: "Longest login streak",
    icon: <IconFlame className="w-5 h-5" />,
    color: "text-orange-400",
    accent: "border-orange-400/40 bg-orange-400/5",
  },
  capitalist: {
    title: "The Capitalist",
    subtitle: "Best single raid weekend",
    icon: <IconCoins className="w-5 h-5" />,
    color: "text-yellow-400",
    accent: "border-yellow-400/40 bg-yellow-400/5",
  },
  unsleeping: {
    title: "The Unsleeping",
    subtitle: "Highest all-time raw activity",
    icon: <IconEye className="w-5 h-5" />,
    color: "text-umbra-purple",
    accent: "border-umbra-purple/40 bg-umbra-purple/5",
  },
};

// ---------------------------------------------------------------------------
// Metadata for the live-computed record categories.
// ---------------------------------------------------------------------------

const LIVE_META: Record<string, RecordMeta> = {
  "perfect-attendance": {
    title: "Perfect Attendance",
    subtitle: "Wars where every attack was used",
    icon: <IconCrown className="w-5 h-5" />,
    color: "text-amber-300",
    accent: "border-amber-300/40 bg-amber-300/5",
  },
  "fastest-3-star": {
    title: "Fastest 3-Star",
    subtitle: "Quickest 3-star attacks",
    icon: <IconZap className="w-5 h-5" />,
    color: "text-teal-300",
    accent: "border-teal-400/40 bg-teal-400/5",
  },
  "most-raid-gold": {
    title: "Most Raid Gold",
    subtitle: "All-time gold looted",
    icon: <IconCoins className="w-5 h-5" />,
    color: "text-yellow-400",
    accent: "border-yellow-400/40 bg-yellow-400/5",
  },
  "most-raid-medals": {
    title: "Most Raid Medals",
    subtitle: "All-time medals earned",
    icon: <IconTrophy className="w-5 h-5" />,
    color: "text-umbra-purple",
    accent: "border-umbra-purple/40 bg-umbra-purple/5",
  },
  "most-bonus-attacks": {
    title: "Most Bonus Attacks",
    subtitle: "Bonus attacks earned",
    icon: <IconZap className="w-5 h-5" />,
    color: "text-teal-300",
    accent: "border-teal-400/40 bg-teal-400/5",
  },
  "raid-mvp": {
    title: "Raid MVP",
    subtitle: "Top looter — latest weekend",
    icon: <IconCrown className="w-5 h-5" />,
    color: "text-amber-300",
    accent: "border-amber-300/40 bg-amber-300/5",
  },
  "most-seasons": {
    title: "Most Seasons",
    subtitle: "Most raid weekends attended",
    icon: <IconUsers className="w-5 h-5" />,
    color: "text-sky-300",
    accent: "border-sky-400/40 bg-sky-400/5",
  },
  "best-gold-per-attack": {
    title: "Best Gold/Attack",
    subtitle: "Most efficient looter",
    icon: <IconCoins className="w-5 h-5" />,
    color: "text-yellow-300",
    accent: "border-yellow-300/40 bg-yellow-300/5",
  },
  "longest-tenure": {
    title: "Longest Tenured",
    subtitle: "Members here the longest",
    icon: <IconClock className="w-5 h-5" />,
    color: "text-sky-300",
    accent: "border-sky-400/40 bg-sky-400/5",
  },
};

// ---------------------------------------------------------------------------
// Section definitions — each item is either a cached award key or a live key.
// ---------------------------------------------------------------------------

type SectionItem = { type: "cached"; key: string } | { type: "live"; key: string };

const ALL_TIME_ITEMS: SectionItem[] = [
  { type: "cached", key: "philanthropist" },
  { type: "cached", key: "dedicated" },
  { type: "cached", key: "unsleeping" },
];

const WAR_ITEMS: SectionItem[] = [
  { type: "cached", key: "vanguard" },
  { type: "live", key: "perfect-attendance" },
  { type: "live", key: "fastest-3-star" },
];

const CAPITAL_ITEMS: SectionItem[] = [
  { type: "cached", key: "capitalist" },
  { type: "live", key: "most-raid-gold" },
  { type: "live", key: "most-raid-medals" },
  { type: "live", key: "most-bonus-attacks" },
  { type: "live", key: "raid-mvp" },
  { type: "live", key: "most-seasons" },
  { type: "live", key: "best-gold-per-attack" },
];

const TENURE_ITEMS: SectionItem[] = [
  { type: "live", key: "longest-tenure" },
];

export function HallOfFameShell({ data }: { data: HallOfFamePageData }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { cachedAwards, liveRecords, lastComputedAt } = data;

  const liveByKey = new Map(liveRecords.map((c) => [c.key, c]));

  /** Resolve a section item into a {meta, entries} pair, or null if empty. */
  const resolveItem = (item: SectionItem): { meta: RecordMeta; entries: RecordEntry[] } | null => {
    if (item.type === "cached") {
      const board = cachedAwards.find((b) => b.awardKey === item.key);
      const meta = AWARD_META[item.key];
      if (!meta || !board || board.entries.length === 0) return null;
      return {
        meta,
        entries: board.entries.map((e) => ({
          playerTag: e.playerTag,
          name: e.name,
          rank: e.rank,
          value: e.value,
          valueLabel: e.valueLabel,
          metaLabel: e.metaLabel,
        })),
      };
    }
    // live
    const cat = liveByKey.get(item.key);
    const meta = LIVE_META[item.key];
    if (!meta || !cat || cat.entries.length === 0) return null;
    return {
      meta,
      entries: cat.entries.map((e, i) => ({
        playerTag: e.playerTag,
        name: e.name,
        rank: i + 1,
        value: e.value,
        valueLabel: e.valueLabel,
        metaLabel: e.metaLabel ?? undefined,
      })),
    };
  };

  /** Render a section's items as RecordCards. */
  const renderSection = (items: SectionItem[]) =>
    items
      .map(resolveItem)
      .filter((x): x is { meta: RecordMeta; entries: RecordEntry[] } => x !== null);

  const allTimeCards = renderSection(ALL_TIME_ITEMS);
  const warCards = renderSection(WAR_ITEMS);
  const capitalCards = renderSection(CAPITAL_ITEMS);
  const tenureCards = renderSection(TENURE_ITEMS);

  const hasAny = allTimeCards.length > 0 || warCards.length > 0 || capitalCards.length > 0 || tenureCards.length > 0;

  return (
    <PageScaffold section="Hall of Fame" title="Hall of Fame">
      {/* ── Last-computed freshness stamp ──────────────────────────────── */}
      {lastComputedAt && (
        <p className="mb-6 font-mono text-xs text-umbra-muted">
          Cached awards last recomputed{" "}
          <span className="text-umbra-lilac">
            {lastComputedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
          . Live records are fresh at page load.
        </p>
      )}

      {/* ── Section 1: All-Time Legends ────────────────────────────────── */}
      {allTimeCards.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="All-Time Legends" />
          <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allTimeCards.map((card, i) => (
              <RecordCard
                key={`alltime-${i}`}
                meta={card.meta}
                entries={card.entries}
                onMemberClick={setSelectedMember}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: War Hall of Fame ───────────────────────────────── */}
      {warCards.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="War Hall of Fame" />
          <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {warCards.map((card, i) => (
              <RecordCard
                key={`war-${i}`}
                meta={card.meta}
                entries={card.entries}
                onMemberClick={setSelectedMember}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 3: Capital Hall of Fame ────────────────────────────── */}
      {capitalCards.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Capital Hall of Fame" />
          <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {capitalCards.map((card, i) => (
              <RecordCard
                key={`capital-${i}`}
                meta={card.meta}
                entries={card.entries}
                onMemberClick={setSelectedMember}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 4: Tenure ─────────────────────────────────────────── */}
      {tenureCards.length > 0 && (
        <section>
          <SectionHeader title="Tenure" />
          <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tenureCards.map((card, i) => (
              <RecordCard
                key={`tenure-${i}`}
                meta={card.meta}
                entries={card.entries}
                onMemberClick={setSelectedMember}
              />
            ))}
          </div>
        </section>
      )}

      {!hasAny && (
        <section className="glass rounded-2xl p-8">
          <EmptyState
            icon={<IconTrophy className="h-10 w-10 text-umbra-purple/40" />}
            title="No records yet"
            description="Records will appear here once the tracker has accumulated enough data."
          />
        </section>
      )}

      {/* ── Shared member detail sheet (lazy fetch) ──────────────────────── */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </PageScaffold>
  );
}

/**
 * Section header — a consistent eyebrow + title used by all sections so they
 * have the same visual weight.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-5 w-1 rounded-full bg-umbra-purple" aria-hidden />
      <h2 className="font-display text-xl text-umbra-lilac">{title}</h2>
    </div>
  );
}

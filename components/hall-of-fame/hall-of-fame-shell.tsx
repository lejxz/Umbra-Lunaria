"use client";

/**
 * HallOfFameShell — the dedicated /hall-of-fame page composition root.
 *
 * Uses the SAME card design as the former dashboard HallOfFameCard (now
 * generalized as RecordCard). Three categorized sections:
 *
 *   1. All-Time Legends — the 5 cached award leaderboards from
 *      hall_of_fame_records (philanthropist, vanguard, dedicated,
 *      capitalist, unsleeping). Computed by the daily batch.
 *   2. War Hall of Fame — live-computed war records (most war attacks,
 *      perfect attendance, fastest 3-star).
 *   3. Capital Hall of Fame — live-computed raid records (most raid gold,
 *      most raid medals, highest raid score, most bonus attacks, raid MVP).
 *
 * All leaderboards are limited to top 10. Each row is clickable → opens the
 * shared MemberDetailSheet.
 *
 * See concept/05-dashboard.md §"Hall of Fame" + concept/12.
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
} from "@/components/ui/icons";
import type { HallOfFamePageData } from "@/lib/view-models/hall-of-fame";

// ---------------------------------------------------------------------------
// Metadata for the 5 cached all-time awards (same design as the dashboard).
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

const CACHED_ORDER = [
  "philanthropist",
  "vanguard",
  "dedicated",
  "capitalist",
  "unsleeping",
] as const;

// ---------------------------------------------------------------------------
// Metadata for the live-computed record categories (same card design).
// ---------------------------------------------------------------------------

const LIVE_META: Record<string, RecordMeta> = {
  "most-war-attacks": {
    title: "Most War Attacks",
    subtitle: "Total attacks across all wars",
    icon: <IconSwords className="w-5 h-5" />,
    color: "text-amber-400",
    accent: "border-amber-400/40 bg-amber-400/5",
  },
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
  "highest-raid-score": {
    title: "Highest Raid Score",
    subtitle: "Best single-weekend loot",
    icon: <IconCoins className="w-5 h-5" />,
    color: "text-yellow-300",
    accent: "border-yellow-300/40 bg-yellow-300/5",
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
  "longest-tenure": {
    title: "Longest Tenured",
    subtitle: "Members here the longest",
    icon: <IconClock className="w-5 h-5" />,
    color: "text-sky-300",
    accent: "border-sky-400/40 bg-sky-400/5",
  },
};

// Keys that belong to each section.
const WAR_KEYS = ["most-war-attacks", "perfect-attendance", "fastest-3-star"];
const CAPITAL_KEYS = [
  "most-raid-gold",
  "most-raid-medals",
  "highest-raid-score",
  "most-bonus-attacks",
  "raid-mvp",
];
const TENURE_KEY = "longest-tenure";

export function HallOfFameShell({ data }: { data: HallOfFamePageData }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { cachedAwards, liveRecords, lastComputedAt } = data;

  const hasCached = cachedAwards.some((a) => a.entries.length > 0);
  const hasLive = liveRecords.length > 0;
  const liveByKey = new Map(liveRecords.map((c) => [c.key, c]));

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
      {hasCached ? (
        <section className="mb-10">
          <SectionHeader title="All-Time Legends" />
          <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CACHED_ORDER.map((key) => {
              const board = cachedAwards.find((b) => b.awardKey === key);
              const meta = AWARD_META[key];
              if (!meta || !board) return null;
              const entries: RecordEntry[] = board.entries.map((e) => ({
                playerTag: e.playerTag,
                name: e.name,
                rank: e.rank,
                value: e.value,
                valueLabel: e.valueLabel,
                metaLabel: e.metaLabel,
              }));
              return (
                <RecordCard
                  key={key}
                  meta={meta}
                  entries={entries}
                  onMemberClick={setSelectedMember}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <section className="glass mb-10 rounded-2xl p-8">
          <EmptyState
            icon={<IconTrophy className="h-10 w-10 text-umbra-purple/40" />}
            title="No all-time records yet"
            description="The daily batch computes the 5 all-time awards. They'll appear here once the batch has run with enough tracked data."
          />
        </section>
      )}

      {/* ── Section 2: War Hall of Fame ───────────────────────────────── */}
      <section className="mb-10">
        <SectionHeader title="War Hall of Fame" />
        <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WAR_KEYS.map((key) => {
            const cat = liveByKey.get(key);
            const meta = LIVE_META[key];
            if (!meta || !cat || cat.entries.length === 0) return null;
            const entries: RecordEntry[] = cat.entries.map((e, i) => ({
              playerTag: e.playerTag,
              name: e.name,
              rank: i + 1,
              value: e.value,
              valueLabel: e.valueLabel,
              metaLabel: e.metaLabel ?? undefined,
            }));
            return (
              <RecordCard
                key={key}
                meta={meta}
                entries={entries}
                onMemberClick={setSelectedMember}
              />
            );
          })}
        </div>
      </section>

      {/* ── Section 3: Capital Hall of Fame ────────────────────────────── */}
      <section className="mb-10">
        <SectionHeader title="Capital Hall of Fame" />
        <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPITAL_KEYS.map((key) => {
            const cat = liveByKey.get(key);
            const meta = LIVE_META[key];
            if (!meta || !cat || cat.entries.length === 0) return null;
            const entries: RecordEntry[] = cat.entries.map((e, i) => ({
              playerTag: e.playerTag,
              name: e.name,
              rank: i + 1,
              value: e.value,
              valueLabel: e.valueLabel,
              metaLabel: e.metaLabel ?? undefined,
            }));
            return (
              <RecordCard
                key={key}
                meta={meta}
                entries={entries}
                onMemberClick={setSelectedMember}
              />
            );
          })}
        </div>
      </section>

      {/* ── Section 4: Tenure (standalone, doesn't fit War or Capital) ── */}
      {liveByKey.has(TENURE_KEY) && liveByKey.get(TENURE_KEY)!.entries.length > 0 && (
        <section>
          <SectionHeader title="Tenure" />
          <div className="grid grid-cols-1 gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const cat = liveByKey.get(TENURE_KEY)!;
              const meta = LIVE_META[TENURE_KEY]!;
              const entries: RecordEntry[] = cat.entries.map((e, i) => ({
                playerTag: e.playerTag,
                name: e.name,
                rank: i + 1,
                value: e.value,
                valueLabel: e.valueLabel,
                metaLabel: e.metaLabel ?? undefined,
              }));
              return (
                <RecordCard
                  meta={meta}
                  entries={entries}
                  onMemberClick={setSelectedMember}
                />
              );
            })()}
          </div>
        </section>
      )}

      {!hasCached && !hasLive && (
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

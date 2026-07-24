"use client";

import { useState } from "react";
import type {
  RaidHistoryView,
  RaidSeasonSummary,
} from "@/lib/view-models/capital";
import {
  IconCapital,
  IconChevronDown,
  IconChevronUp,
  IconCoins,
  IconSwords,
  IconAlert,
  IconUsers,
} from "@/components/ui/icons";

/**
 * RaidHistory — the completed Capital raid-weekend history view.
 *
 * Replaces the RaidPendingCard placeholder once raid-season ingestion (Step 3.1)
 * has landed at least one completed season. Four sections (concept/08 §"Raid-
 * weekend history"):
 *   1. Season summary tiles (loot, raids, attacks, rewards) — newest first.
 *   2. Contribution leaderboard (all-time totals per member, sorted by looted).
 *   3. Zero-attack list for the most recent season.
 *   4. Participation rate (latest + average).
 *
 * The season list is collapsible to keep the card compact when leadership just
 * wants the headline numbers.
 */
export function RaidHistory({ history }: { history: RaidHistoryView }) {
  const [seasonsOpen, setSeasonsOpen] = useState(true);
  const latest = history.seasons[0] ?? null;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="raid-history-title"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Raid weekends
        </p>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-emerald-300">
          {history.participation.totalSeasons} tracked
        </span>
      </div>
      <h3 id="raid-history-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Raid-weekend history
      </h3>

      {/* ── Headline tiles (latest season) ────────────────────────────────── */}
      {latest && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeadlineTile
            icon={<IconCoins className="h-3.5 w-3.5" />}
            label="Total loot"
            value={latest.capitalTotalLoot}
            format={(n) => n.toLocaleString()}
          />
          <HeadlineTile
            icon={<IconCapital className="h-3.5 w-3.5" />}
            label="Raids done"
            value={latest.raidsCompleted}
          />
          <HeadlineTile
            icon={<IconSwords className="h-3.5 w-3.5" />}
            label="Attacks"
            value={latest.totalAttacks}
          />
          <HeadlineTile
            icon={<IconUsers className="h-3.5 w-3.5" />}
            label="Attackers"
            value={latest.participantCount}
          />
        </div>
      )}

      {/* ── Participation rate ────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-umbra-muted">
        <span>
          Latest participation:{" "}
          <ParticipationRate rate={history.participation.participationRate} />
          <span className="text-umbra-muted/70">
            {" "}
            ({history.participation.latestSeasonParticipants}/
            {history.participation.latestSeasonRetainedMembers} retained)
          </span>
        </span>
        <span>
          Avg attackers/season:{" "}
          <span className="text-umbra-lilac">
            {history.participation.averageParticipants.toFixed(1)}
          </span>
        </span>
      </div>

      {/* ── Season list (collapsible) ────────────────────────────────────── */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setSeasonsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-umbra-line bg-umbra-surface/30 px-3 py-2 text-left transition hover:bg-umbra-surface/50"
          aria-expanded={seasonsOpen}
        >
          <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
            Recent seasons ({history.seasons.length})
          </span>
          {seasonsOpen ? (
            <IconChevronUp className="h-4 w-4 text-umbra-muted" />
          ) : (
            <IconChevronDown className="h-4 w-4 text-umbra-muted" />
          )}
        </button>
        {seasonsOpen && (
          <ol className="mt-2 space-y-1.5">
            {history.seasons.map((s) => (
              <SeasonRow key={s.seasonId} season={s} />
            ))}
          </ol>
        )}
      </div>

      {/* ── Contribution leaderboard ──────────────────────────────────────── */}
      {history.contributionLeaderboard.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-label uppercase tracking-wider text-umbra-muted">
            Contribution leaderboard (all tracked seasons)
          </p>
          <ol className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {history.contributionLeaderboard.map((m, i) => (
              <li
                key={m.playerTag}
                className="flex items-center gap-3 rounded-lg border border-umbra-line/40 bg-umbra-surface/20 px-3 py-1.5"
              >
                <span className="w-5 text-center font-mono text-xs font-semibold text-umbra-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-umbra-lilac">
                  {m.name}
                </span>
                <span className="text-xs text-umbra-muted">
                  {m.totalCapitalResourcesLooted.toLocaleString()} gold
                </span>
                <span className="text-xs text-umbra-muted/70">
                  {m.totalAttacks} atk · {m.seasonsParticipated} seasons
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Zero-attack list ─────────────────────────────────────────────── */}
      {history.zeroAttackList.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 font-mono text-label uppercase tracking-wider text-amber-300/80">
            <IconAlert className="h-3.5 w-3.5" />
            Zero attacks — latest season
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {history.zeroAttackList.map((m) => (
              <li
                key={m.playerTag}
                className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-xs text-amber-200/80"
                title={
                  m.attackLimit !== null
                    ? `0 of ${m.attackLimit} attacks used`
                    : "0 attacks used"
                }
              >
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function HeadlineTile({
  icon,
  label,
  value,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  format?: (n: number) => string;
}) {
  const display =
    value === null
      ? "—"
      : format
        ? format(value)
        : value.toLocaleString();
  return (
    <div className="rounded-xl border border-umbra-line bg-umbra-surface/40 p-3">
      <div className="flex items-center gap-1.5 text-umbra-muted">
        <span className="text-umbra-purple">{icon}</span>
        <span className="font-mono text-[0.6rem] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-lg text-umbra-lilac">{display}</p>
    </div>
  );
}

function ParticipationRate({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-umbra-muted">—</span>;
  const pct = (rate * 100).toFixed(0);
  const color =
    rate >= 0.8
      ? "text-emerald-300"
      : rate >= 0.5
        ? "text-amber-300"
        : "text-rose-300";
  return <span className={color}>{pct}%</span>;
}

function SeasonRow({ season }: { season: RaidSeasonSummary }) {
  const dateLabel = season.startTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <li className="grid grid-cols-2 gap-2 rounded-lg border border-umbra-line/40 bg-umbra-surface/20 px-3 py-2 text-xs sm:grid-cols-5">
      <span className="font-mono text-umbra-lilac">{dateLabel}</span>
      <span className="text-umbra-muted">
        {(season.capitalTotalLoot ?? 0).toLocaleString()} gold
      </span>
      <span className="text-umbra-muted">
        {season.raidsCompleted ?? 0} raids
      </span>
      <span className="text-umbra-muted">
        {season.totalAttacks ?? 0} attacks
      </span>
      <span className="text-umbra-muted">
        {season.participantCount} members
      </span>
    </li>
  );
}

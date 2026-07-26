"use client";

import { useState } from "react";
import type {
  RaidHistoryView,
  RaidSeasonSummary,
  RaidContributionHistoryEntry,
  ContributionLogEntry,
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
 * has landed at least one completed season. Four sections (docs/concept/08 §"Raid-
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
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
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
          <HeadlineTile
            icon={<IconCoins className="h-3.5 w-3.5" />}
            label="Off medals"
            value={latest.offensiveReward}
            format={(n) => n.toLocaleString()}
          />
          <HeadlineTile
            icon={<IconCoins className="h-3.5 w-3.5" />}
            label="Def medals"
            value={latest.defensiveReward}
            format={(n) => n.toLocaleString()}
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
          className="flex w-full items-center justify-between rounded-lg border border-umbra-line bg-umbra-surface/30 px-3 py-2 text-left transition hover:bg-umbra-purple/10"
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
                className="flex items-center gap-3 rounded-lg border border-umbra-line/50 bg-umbra-surface/20 px-3 py-1.5"
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
                <span className="text-xs text-amber-300/80">
                  🏅 {m.totalRaidWeekendMedals.toLocaleString()}
                </span>
                <span className="hidden text-xs text-umbra-muted/70 sm:inline">
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

      {/* ── Contribution history table ──────────────────────────────────── */}
      {history.contributionHistory.length > 0 && (
        <ContributionHistoryTable
          entries={history.contributionHistory}
          seasons={history.seasons}
        />
      )}

      {/* ── Contribution log ────────────────────────────────────────────── */}
      {history.contributionLog.length > 0 && (
        <ContributionLog entries={history.contributionLog} />
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
    <div className="rounded-lg border border-umbra-line bg-umbra-surface/40 p-3">
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
    <li className="grid grid-cols-2 gap-2 rounded-lg border border-umbra-line/50 bg-umbra-surface/20 px-3 py-2 text-xs sm:grid-cols-6">
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
      <span className="text-amber-300/80">
        {(season.offensiveReward ?? 0).toLocaleString()}🏅
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Contribution history table — per-member per-season breakdown
// ---------------------------------------------------------------------------

function ContributionHistoryTable({
  entries,
  seasons,
}: {
  entries: RaidContributionHistoryEntry[];
  seasons: RaidSeasonSummary[];
}) {
  const [open, setOpen] = useState(false);

  // Group entries by member, then by season.
  const byMember = new Map<string, { name: string; bySeason: Map<number, RaidContributionHistoryEntry> }>();
  for (const e of entries) {
    if (!byMember.has(e.playerTag)) {
      byMember.set(e.playerTag, { name: e.name, bySeason: new Map() });
    }
    byMember.get(e.playerTag)!.bySeason.set(e.seasonId, e);
  }

  // Sort members by total gold looted (descending).
  const memberRows = Array.from(byMember.entries())
    .map(([tag, { name, bySeason }]) => {
      const totalGold = entries
        .filter((e) => e.playerTag === tag)
        .reduce((sum, e) => sum + e.capitalResourcesLooted, 0);
      return { tag, name, bySeason, totalGold };
    })
    .sort((a, b) => b.totalGold - a.totalGold);

  // Show only top 15 members when collapsed, all when expanded.
  const visibleMembers = open ? memberRows : memberRows.slice(0, 15);

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-umbra-line bg-umbra-surface/30 px-3 py-2 text-left transition hover:bg-umbra-purple/10"
        aria-expanded={open}
      >
        <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
          Contribution history ({memberRows.length} members × {seasons.length} seasons)
        </span>
        {open ? (
          <IconChevronUp className="h-4 w-4 text-umbra-muted" />
        ) : (
          <IconChevronDown className="h-4 w-4 text-umbra-muted" />
        )}
      </button>

      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-umbra-line/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-umbra-line bg-umbra-surface/40">
                <th className="sticky left-0 z-10 bg-umbra-surface/95 px-3 py-2 text-left font-mono uppercase tracking-wider text-umbra-muted">
                  Member
                </th>
                {seasons.map((s) => (
                  <th
                    key={s.seasonId}
                    className="px-3 py-2 text-center font-mono uppercase tracking-wider text-umbra-muted whitespace-nowrap"
                  >
                    {s.startTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-mono uppercase tracking-wider text-umbra-purple">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((m) => (
                <tr key={m.tag} className="border-b border-umbra-line/20 hover:bg-white/[.04]">
                  <td className="sticky left-0 z-10 bg-umbra-ink/95 px-3 py-2 font-medium text-umbra-lilac whitespace-nowrap">
                    {m.name}
                  </td>
                  {seasons.map((s) => {
                    const entry = m.bySeason.get(s.seasonId);
                    return (
                      <td
                        key={s.seasonId}
                        className="px-3 py-2 text-center text-umbra-muted"
                        title={entry ? `${entry.attacksUsed}/${entry.attackLimit ?? "—"} attacks, ${entry.capitalResourcesLooted.toLocaleString()} gold${entry.raidWeekendMedals ? `, ${entry.raidWeekendMedals}🏅` : ""}` : "Did not participate"}
                      >
                        {entry ? (
                          <span className={entry.capitalResourcesLooted > 0 ? "text-umbra-lilac" : "text-umbra-muted/50"}>
                            {entry.capitalResourcesLooted > 0
                              ? entry.capitalResourcesLooted.toLocaleString()
                              : "—"}
                          </span>
                        ) : (
                          <span className="text-umbra-muted/30">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold text-umbra-purple">
                    {m.totalGold.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!open && memberRows.length > 15 && (
        <p className="mt-1 text-center text-xs text-umbra-muted">
          Showing top 15 of {memberRows.length} — click to expand all
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contribution log — recent capital gold contributions
// ---------------------------------------------------------------------------

function ContributionLog({ entries }: { entries: ContributionLogEntry[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-umbra-line bg-umbra-surface/30 px-3 py-2 text-left transition hover:bg-umbra-purple/10"
        aria-expanded={open}
      >
        <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
          Contribution log ({entries.length} recent)
        </span>
        {open ? (
          <IconChevronUp className="h-4 w-4 text-umbra-muted" />
        ) : (
          <IconChevronDown className="h-4 w-4 text-umbra-muted" />
        )}
      </button>

      {open && (
        <ol className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {entries.map((entry, i) => {
            const timeLabel = entry.eventTime.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            return (
              <li
                key={`${entry.playerTag}-${i}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${
                  i % 2 === 0 ? "bg-white/[.015]" : ""
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-400/60" />
                <span className="min-w-0 flex-1 truncate text-umbra-lilac">
                  {entry.name}
                </span>
                <span className="shrink-0 font-mono font-semibold text-yellow-400">
                  +{entry.amount.toLocaleString()}
                </span>
                <span className="shrink-0 font-mono text-umbra-muted/70">
                  ({entry.total.toLocaleString()} total)
                </span>
                <span className="hidden shrink-0 font-mono text-umbra-muted/50 sm:block">
                  {timeLabel}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

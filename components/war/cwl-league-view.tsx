"use client";

import { useState } from "react";
import Image from "next/image";
import type { CwlSeasonView, CwlRoundWar } from "@/lib/view-models/war";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconChevronRight } from "@/components/ui/icons";

/**
 * CWL league view — shows the current Clan War League season with:
 *   1. Season header (season name, state, our rank, captured time).
 *   2. Day-by-day round tabs (Day 1-7) — each tab shows our clan's opponent
 *      and result for that round.
 *   3. League standings table — all 8 clans ranked by stars, with W/L/T,
 *      stars for/against, destruction %.
 *
 * Renders when `cwlSeason` is non-null (the clan is in CWL). The parent
 * (war-shell) conditionally shows this above the regular war hero.
 */
export function CwlLeagueView({
  season,
  onViewDetail,
}: {
  season: CwlSeasonView;
  onViewDetail: (warId: number) => void;
}) {
  const [activeRound, setActiveRound] = useState(0);
  const round: CwlRoundWar | undefined = season.rounds[activeRound];

  return (
    <section className="lunar-card flex flex-col" aria-labelledby="cwl-title">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Clan War League · {season.state}
        </p>
        {season.capturedAt && (
          <span className="text-2xs text-umbra-muted">
            <TimeAgo date={season.capturedAt} />
          </span>
        )}
      </div>
      <h3 id="cwl-title" className="mt-1 font-display text-lg text-umbra-moonlight">
        {season.season}
      </h3>

      {/* Our rank badge */}
      {season.ourRank && (
        <div className="mt-2 flex items-center gap-2">
          <span className="badge brand">
            <span className="d" aria-hidden />
            Rank #{season.ourRank} of {season.standings.length}
          </span>
        </div>
      )}

      {/* Day-by-day round tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {season.rounds.map((r, i) => {
          const hasData = r.opponentName !== null;
          const isActive = i === activeRound;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveRound(i)}
              className={`focus-ring rounded-lg border px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wider transition ${
                isActive
                  ? "border-umbra-purple/50 bg-umbra-purple/15 text-umbra-moonlight"
                  : hasData
                    ? "border-umbra-line bg-umbra-ink/40 text-umbra-muted hover:border-umbra-line-bright hover:text-umbra-lilac"
                    : "border-white/5 bg-white/[.015] text-umbra-faint"
              }`}
            >
              Day {i + 1}
              {r.result === "win" && <span className="ml-1 text-emerald-400">W</span>}
              {r.result === "loss" && <span className="ml-1 text-red-400">L</span>}
              {r.result === "tie" && <span className="ml-1 text-amber-400">T</span>}
            </button>
          );
        })}
      </div>

      {/* Active round detail */}
      {round && (
        <div className="lunar-tile mt-3 !px-4 !py-3">
          {round.opponentName ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {round.opponentBadgeUrls?.small && (
                  <div className="relative h-7 w-7">
                    <Image src={round.opponentBadgeUrls.small} alt={`${round.opponentName} badge`} fill className="object-contain grayscale" />
                  </div>
                )}
                <span className="text-xs text-umbra-lilac">vs {round.opponentName}</span>
              </div>
              <div className="flex items-center gap-3">
                {round.state && (
                  <span className={`badge ${
                    round.state === "inWar"
                      ? "warn"
                      : round.state === "preparation"
                        ? "brand"
                        : "muted"
                  }`}>
                    <span className="d" aria-hidden />
                    {round.state}
                  </span>
                )}
                {round.ownStars != null && round.opponentStars != null && (
                  <span className="font-display text-sm font-bold">
                    <span className="text-amber-400">{round.ownStars}</span>
                    <span className="text-umbra-muted"> – </span>
                    <span className="text-umbra-muted">{round.opponentStars}</span>
                  </span>
                )}
                {round.warId && (
                  <button
                    type="button"
                    onClick={() => onViewDetail(round.warId!)}
                    className="focus-ring btn-ghost inline-flex items-center gap-1 !px-2 !py-0.5 text-micro font-semibold uppercase tracking-wider"
                  >
                    Details <IconChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-2xs text-umbra-faint">Round not started yet</p>
          )}
        </div>
      )}

      {/* Standings table */}
      <div className="mt-4">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple mb-2">
          League standings
        </p>
        <div className="data-container overflow-x-auto !max-h-none">
          <table className="w-full">
            <thead className="data-thead">
              <tr>
                <th className="data-th">#</th>
                <th className="data-th">Clan</th>
                <th className="data-th text-center">W</th>
                <th className="data-th text-center">L</th>
                <th className="data-th text-center">T</th>
                <th className="data-th text-center">★</th>
                <th className="hidden data-th text-right sm:table-cell">Destr.</th>
              </tr>
            </thead>
            <tbody className="data-tbody">
              {season.standings.map((s, i) => (
                <tr
                  key={s.tag}
                  className={`data-tr ${s.isOwnClan ? "bg-umbra-purple/[.06]" : ""}`}
                  style={s.isOwnClan ? { boxShadow: "inset 2px 0 0 #B678FF" } : undefined}
                >
                  <td className="data-td mono">{i + 1}</td>
                  <td className="data-td">
                    <div className="flex items-center gap-1.5">
                      {s.badgeUrls?.small && (
                        <div className="relative h-5 w-5 shrink-0">
                          <Image src={s.badgeUrls.small} alt={`${s.name} badge`} fill className={`object-contain ${s.isOwnClan ? "" : "grayscale"}`} />
                        </div>
                      )}
                      <span className={`truncate ${s.isOwnClan ? "text-umbra-moonlight font-semibold" : "text-umbra-lilac"}`}>
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td className="data-td text-center font-mono text-emerald-400">{s.wins}</td>
                  <td className="data-td text-center font-mono text-red-400">{s.losses}</td>
                  <td className="data-td text-center font-mono text-amber-400">{s.ties}</td>
                  <td className="data-td text-center font-mono font-bold text-amber-400">{s.starsFor}</td>
                  <td className="hidden data-td text-right font-mono text-2xs text-umbra-muted sm:table-cell">
                    {s.destructionPercentage != null ? `${s.destructionPercentage}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest caveat about partial standings */}
      <p className="mt-3 text-2xs text-umbra-faint">
        Standings reflect wars involving our clan. Other clans&apos; wars against each
        other will appear once full league-group ingestion is active during CWL season.
      </p>
    </section>
  );
}

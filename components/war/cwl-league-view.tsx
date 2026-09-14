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
 *   3. League standings table — all 8 clans ranked by stars, with played,
 *      W/L/T record, stars for/against (±), destruction %, and the current
 *      promotion/relegation trajectory (Phase 3.4: rank 1 = promotion
 *      candidate, bottom two = relegation risk — thresholds vary by league
 *      tier, most leagues run two up / two down per Supercell's rules).
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
  const standingsCount = season.standings.length;

  // Trajectory chips only make sense on a real league group (8 clans by
  // design; guard small/partial tables so a 3-clan table never renders three
  // "relegated" clans).
  const showTrajectory = standingsCount >= 6;

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="cwl-title">
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
      <h3 id="cwl-title" className="mt-1 font-display text-lg text-umbra-lilac">
        {season.season}
      </h3>

      {/* Our rank badge */}
      {season.ourRank && (
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-umbra-purple">
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
                  ? "border-umbra-purple/50 bg-umbra-purple/15 text-umbra-lilac"
                  : hasData
                    ? "border-umbra-line bg-white/[.03] text-umbra-muted hover:border-umbra-purple/40 hover:text-umbra-lilac"
                    : "border-white/5 bg-white/[.015] text-umbra-muted/30"
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
        <div className="mt-3 rounded-lg border border-umbra-line bg-white/[.03] px-4 py-3">
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
                  <span className={`rounded-full border px-2 py-0.5 text-micro font-semibold uppercase tracking-wider ${
                    round.state === "inWar" ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                    : round.state === "preparation" ? "border-umbra-purple/40 bg-umbra-purple/15 text-umbra-purple"
                    : "border-white/10 bg-white/5 text-umbra-muted"
                  }`}>{round.state}</span>
                )}
                {round.ownStars != null && round.opponentStars != null && (
                  <span className="font-display text-sm font-bold">
                    <span className="text-amber-400">{round.ownStars}</span>
                    <span className="text-umbra-muted/50"> – </span>
                    <span className="text-umbra-muted">{round.opponentStars}</span>
                  </span>
                )}
                {round.warId && (
                  <button
                    type="button"
                    onClick={() => onViewDetail(round.warId!)}
                    className="focus-ring inline-flex items-center gap-1 rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/50 hover:bg-umbra-purple/10"
                  >
                    Details <IconChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-2xs text-umbra-muted/50">Round not started yet</p>
          )}
        </div>
      )}

      <div className="mt-4 data-container">
        <table className="w-full text-left">
          <thead className="data-thead">
            <tr>
              <th className="w-8 data-th text-center">#</th>
              <th className="data-th">Clan</th>
              <th className="data-th text-center">Pl</th>
              <th className="data-th text-center">W</th>
              <th className="data-th text-center">L</th>
              <th className="hidden data-th text-center sm:table-cell">T</th>
              <th className="data-th text-center">★±</th>
              <th className="hidden data-th text-right sm:table-cell">Destr.</th>
            </tr>
          </thead>
          <tbody className="data-tbody">
            {season.standings.map((s, i) => {
              const isPromotion = showTrajectory && i === 0;
              const isRelegation =
                showTrajectory &&
                (i === standingsCount - 1 || i === standingsCount - 2);
              return (
                <tr
                  key={s.tag}
                  className={`text-sm data-tr ${s.isOwnClan ? "bg-umbra-purple/5" : ""}`}
                >
                  <td className="data-td text-center font-mono text-2xs text-umbra-muted">
                    <span className="inline-flex items-center gap-0.5">
                      {i + 1}
                      {isPromotion && (
                        <span
                          className="text-emerald-400"
                          title="Promotion candidate — currently finishing 1st"
                          aria-label="Promotion candidate"
                        >
                          ↑
                        </span>
                      )}
                      {isRelegation && (
                        <span
                          className="text-red-400"
                          title="Relegation risk — currently in the bottom two"
                          aria-label="Relegation risk"
                        >
                          ↓
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="data-td">
                    <div className="flex items-center gap-2">
                      {s.badgeUrls?.small && (
                        <div className="relative h-6 w-6">
                          <Image src={s.badgeUrls.small} alt={`${s.name} badge`} fill className={`object-contain ${s.isOwnClan ? "" : "grayscale"}`} />
                        </div>
                      )}
                      <span className={`truncate text-xs ${s.isOwnClan ? "text-umbra-lilac font-semibold" : "text-umbra-muted"}`}>
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td className="data-td text-center font-mono text-2xs text-umbra-muted">{s.warsPlayed}</td>
                  <td className="data-td text-center font-mono text-emerald-400">{s.wins}</td>
                  <td className="data-td text-center font-mono text-red-400">{s.losses}</td>
                  <td className="hidden data-td text-center font-mono text-amber-400 sm:table-cell">{s.ties}</td>
                  <td className="data-td text-center font-mono font-bold text-amber-400">
                    {s.starsFor - s.starsAgainst >= 0 ? "+" : ""}
                    {s.starsFor - s.starsAgainst}
                    <span className="ml-1 font-normal text-umbra-muted/60" title={`${s.starsFor} for / ${s.starsAgainst} against`}>
                      ({s.starsFor}/{s.starsAgainst})
                    </span>
                  </td>
                  <td className="hidden data-td text-right font-mono text-2xs text-umbra-muted sm:table-cell">
                    {s.destructionPercentage != null ? `${s.destructionPercentage}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Trajectory legend */}
      <p className="mt-3 text-2xs text-umbra-muted/50">
        ↑ marks the current promotion candidate · ↓ the bottom-two relegation
        risk.
      </p>
    </section>
  );
}

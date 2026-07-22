"use client";

import Image from "next/image";
import type { ActivityScoreLeaderboard } from "@/lib/view-models/dashboard";

/**
 * Standalone Activity Score leaderboard for the Members page.
 * Shows the full ranked list (not capped at 8) with podium styling
 * matching the dashboard's donation top donors.
 */
export function ScoreLeaderboard({
  leaderboard,
  onMemberClick,
}: {
  leaderboard: ActivityScoreLeaderboard;
  onMemberClick?: (playerTag: string) => void;
}) {
  const { entries, window } = leaderboard;

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className="glass rounded-2xl p-5 mb-5"
      aria-labelledby="score-leaderboard-title"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Observed clan support
          </p>
          <h3
            id="score-leaderboard-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Activity Score Leaderboard
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple bg-umbra-purple/10 px-2 py-1 rounded">
          {window}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          let rankColor = "text-umbra-purple";
          let badgeStyle = "bg-white/[.02] border border-white/5";

          if (entry.rank === 1) {
            rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
            badgeStyle = "bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20";
          } else if (entry.rank === 2) {
            rankColor = "text-slate-300";
            badgeStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border border-slate-400/20";
          } else if (entry.rank === 3) {
            rankColor = "text-orange-400";
            badgeStyle = "bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20";
          }

          return (
            <button
              key={entry.playerTag}
              onClick={() => onMemberClick?.(entry.playerTag)}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.07] ${badgeStyle}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`font-mono text-[13px] font-bold ${rankColor}`}>
                  #{entry.rank}
                </span>
                {entry.leagueTier?.iconUrls?.small && (
                  <Image
                    src={entry.leagueTier.iconUrls.small}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] shrink-0"
                    unoptimized
                  />
                )}
                <div className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-umbra-lilac">
                    {entry.name}
                  </span>
                  <span className="block truncate text-[10px] text-umbra-muted">
                    TH{entry.townHallLevel}
                    {entry.leagueTier?.name && ` · ${entry.leagueTier.name}`}
                    {entry.limitedData && " · limited"}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-mono text-[13px] font-semibold text-emerald-400">
                  {entry.totalScore.toFixed(1)}
                </span>
                <div className="mt-0.5 flex justify-end gap-0.5">
                  {entry.components.map((c) => (
                    <div
                      key={c.name}
                      title={`${c.name}: ${c.available ? c.points.toFixed(1) : "unavailable"}`}
                      className={`h-1 w-3 rounded-full ${
                        c.available ? "bg-umbra-purple" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

import Image from "next/image";
import type {
  ActivityScoreLeaderboard,
  MemberActivityScore,
} from "@/lib/view-models/dashboard";
import { Modal } from "@/components/ui/modal";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { entries, window } = leaderboard;

  if (entries.length === 0) {
    return null;
  }

  // Extract top 3 for the podium
  const top3 = entries.slice(0, 3);
  const rank1 = top3.find((e) => e.rank === 1);
  const rank2 = top3.find((e) => e.rank === 2);
  const rank3 = top3.find((e) => e.rank === 3);
  const rest = entries.slice(3);

  return (
    <section
      className="glass rounded-2xl p-5 mb-5"
      aria-labelledby="score-leaderboard-title"
    >
      <div className="flex items-center justify-between mb-6">
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
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-1 rounded drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]">
          {window === "all" ? "LIFETIME" : window}
        </span>
      </div>

      {/* True Podium (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
        {/* Rank 2 - Silver (Left) */}
        <div className="order-2 md:order-1">
          {rank2 && (
            <PodiumCard
              entry={rank2}
              heightClass="h-[72px]"
              onMemberClick={onMemberClick}
            />
          )}
        </div>

        {/* Rank 1 - Gold (Center, taller) */}
        <div className="order-1 md:order-2">
          {rank1 && (
            <PodiumCard
              entry={rank1}
              heightClass="h-[88px]"
              onMemberClick={onMemberClick}
            />
          )}
        </div>

        {/* Rank 3 - Bronze (Right) */}
        <div className="order-3 md:order-3">
          {rank3 && (
            <PodiumCard
              entry={rank3}
              heightClass="h-[72px]"
              onMemberClick={onMemberClick}
            />
          )}
        </div>
      </div>

      {/* Ranks 4+ (Hidden behind button) */}
      {rest.length > 0 && (
        <div className="mt-6 flex justify-center border-t border-white/5 pt-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="focus-ring rounded-lg border border-umbra-line bg-umbra-surface px-6 py-2.5 text-sm font-medium text-umbra-lilac transition hover:border-umbra-purple/50 hover:bg-white/[.02] hover:text-white"
          >
            View Full Leaderboard
          </button>
        </div>
      )}

      {/* Full Leaderboard Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabel="Full Activity Score Leaderboard"
        maxWidth="max-w-2xl"
      >
        <div className="mb-6">
          <h2 className="font-display text-xl text-umbra-lilac">
            Full Activity Score Leaderboard
          </h2>
          <p className="mt-1 text-sm text-umbra-muted">
            Ranks 4 through {entries.length} based on {window === "all" ? "lifetime" : window} data.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {rest.map((entry) => (
            <PodiumCard
              key={entry.playerTag}
              entry={entry}
              heightClass="h-[64px]"
              onMemberClick={(tag) => {
                setIsModalOpen(false);
                onMemberClick?.(tag);
              }}
            />
          ))}
        </div>
      </Modal>
    </section>
  );
}

function PodiumCard({
  entry,
  heightClass,
  onMemberClick,
}: {
  entry: MemberActivityScore;
  heightClass: string;
  onMemberClick?: (playerTag: string) => void;
}) {
  let rankColor = "text-umbra-purple";
  let badgeStyle = "bg-white/[.02] border border-white/5";

  if (entry.rank === 1) {
    rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
    badgeStyle =
      "bg-gradient-to-t from-amber-500/10 to-transparent border border-amber-500/20";
  } else if (entry.rank === 2) {
    rankColor = "text-slate-300";
    badgeStyle =
      "bg-gradient-to-t from-slate-400/10 to-transparent border border-slate-400/20";
  } else if (entry.rank === 3) {
    rankColor = "text-orange-400";
    badgeStyle =
      "bg-gradient-to-t from-orange-500/10 to-transparent border border-orange-500/20";
  }

  return (
    <button
      onClick={() => onMemberClick?.(entry.playerTag)}
      className={`flex w-full items-center justify-between rounded-xl px-3 transition-colors hover:bg-white/[.07] focus-ring ${badgeStyle} ${heightClass}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`font-mono text-[14px] font-bold w-6 text-center ${rankColor}`}>
          #{entry.rank}
        </span>
        {entry.leagueTier?.iconUrls?.small && (
          <Image
            src={entry.leagueTier.iconUrls.small}
            alt=""
            width={20}
            height={20}
            className="h-[20px] w-[20px] shrink-0"
            unoptimized
          />
        )}
        <div className="min-w-0 text-left">
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
        <span className="font-mono text-[14px] font-semibold text-emerald-400">
          {entry.totalScore.toFixed(1)}
        </span>
        <div className="mt-1 flex justify-end gap-1">
          {entry.components.map((c) => (
            <div
              key={c.name}
              title={`${c.name}: ${
                c.available ? c.points.toFixed(1) : "unavailable"
              }`}
              className={`h-1.5 w-3.5 rounded-full ${
                c.available ? "bg-umbra-purple" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

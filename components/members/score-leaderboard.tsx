"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  ActivityScoreLeaderboard,
  MemberActivityScore,
} from "@/lib/view-models/dashboard";
import { Modal } from "@/components/ui/modal";
import { IconChevronRight } from "@/components/ui/icons";

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

  return (
    <section
      className="lunar-card rounded-r-lg p-5 mb-5"
      aria-labelledby="score-leaderboard-title"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Observed clan support
          </p>
          <h3
            id="score-leaderboard-title"
            className="mt-1 font-display text-lg text-umbra-moonlight"
          >
            Activity Score Leaderboard
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-ghost focus-ring"
          >
            View Full List
            <IconChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="font-mono text-label font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-r-sm drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]">
            {window === "all" ? "LIFETIME" : window}
          </span>
        </div>
      </div>

      {/* True Podium (Top 3) */}
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex items-end justify-center gap-2 sm:gap-4 h-[200px]">
          {/* Rank 2 - Silver (Left) */}
          <div className="flex-1 max-w-[180px] order-2 sm:order-1">
            {rank2 && (
              <TruePodiumCard
                entry={rank2}
                heightClass="h-[170px]"
                onMemberClick={onMemberClick}
              />
            )}
          </div>

          {/* Rank 1 - Gold (Center, taller) */}
          <div className="flex-1 max-w-[200px] order-1 sm:order-2 z-10">
            {rank1 && (
              <TruePodiumCard
                entry={rank1}
                heightClass="h-[200px]"
                onMemberClick={onMemberClick}
              />
            )}
          </div>

          {/* Rank 3 - Bronze (Right) */}
          <div className="flex-1 max-w-[180px] order-3 sm:order-3">
            {rank3 && (
              <TruePodiumCard
                entry={rank3}
                heightClass="h-[150px]"
                onMemberClick={onMemberClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Full Leaderboard Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabel="Full Activity Score Leaderboard"
        maxWidth="max-w-2xl"
      >
        <div className="mb-6">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Observed clan support
          </p>
          <h2 className="mt-1 font-display text-xl text-umbra-moonlight">
            Full Activity Score Leaderboard
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.playerTag}
              entry={entry}
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

function TruePodiumCard({
  entry,
  heightClass,
  onMemberClick,
}: {
  entry: MemberActivityScore;
  heightClass: string;
  onMemberClick?: (playerTag: string) => void;
}) {
  let rankColor = "text-umbra-purple";
  let badgeStyle = "border-t border-umbra-line bg-umbra-ink/40";

  if (entry.rank === 1) {
    rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
    badgeStyle =
      "bg-gradient-to-t from-amber-500/10 to-transparent border-t border-amber-500/30";
  } else if (entry.rank === 2) {
    rankColor = "text-slate-300";
    badgeStyle =
      "bg-gradient-to-t from-slate-400/10 to-transparent border-t border-slate-400/30";
  } else if (entry.rank === 3) {
    rankColor = "text-orange-300";
    badgeStyle =
      "bg-gradient-to-t from-orange-500/10 to-transparent border-t border-orange-500/30";
  }

  return (
    <button
      onClick={() => onMemberClick?.(entry.playerTag)}
      className={`focus-ring flex w-full flex-col items-center justify-between rounded-t-lg px-2 py-3 transition-colors hover:bg-umbra-purple/[.06] ${badgeStyle} ${heightClass}`}
    >
      <div className="flex flex-col items-center gap-1 w-full">
        <span className={`font-mono text-base font-black ${rankColor}`}>
          #{entry.rank}
        </span>
        {entry.leagueTier?.iconUrls?.small && (
          <Image
            src={entry.leagueTier.iconUrls.small}
            alt=""
            width={20}
            height={20}
            className="h-[20px] w-[20px] shrink-0 drop-shadow-[0_0_8px_rgba(182,120,255,0.3)]"
            unoptimized
          />
        )}
        <div className="w-full px-1">
          <span className="block truncate text-center text-xs font-bold text-umbra-lilac w-full">
            {entry.name}
          </span>
          <span className="block truncate text-center text-micro text-umbra-faint">
            TH{entry.townHallLevel}
          </span>
        </div>
      </div>

      <div className="text-center w-full mt-1 pt-1.5 border-t border-umbra-line-soft">
        <span className="block font-mono text-sm font-semibold text-emerald-400">
          {entry.totalScore.toFixed(1)}
        </span>
        <div className="mt-1 flex justify-center gap-1">
          {entry.components.map((c) => (
            <div
              key={c.name}
              title={`${c.name}: ${
                c.available ? c.points.toFixed(1) : "unavailable"
              }`}
              className={`h-1 w-3 rounded-full ${
                c.available ? "bg-umbra-purple" : "bg-umbra-line"
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

function LeaderboardRow({
  entry,
  onMemberClick,
}: {
  entry: MemberActivityScore;
  onMemberClick?: (playerTag: string) => void;
}) {
  let rankColor = "text-umbra-purple";
  let badgeStyle = "border-umbra-line bg-umbra-ink/40";

  if (entry.rank === 1) {
    rankColor = "text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]";
    badgeStyle =
      "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent";
  } else if (entry.rank === 2) {
    rankColor = "text-slate-300";
    badgeStyle =
      "border-slate-400/25 bg-gradient-to-r from-slate-400/10 to-transparent";
  } else if (entry.rank === 3) {
    rankColor = "text-orange-300";
    badgeStyle =
      "border-orange-500/25 bg-gradient-to-r from-orange-500/10 to-transparent";
  }

  return (
    <button
      onClick={() => onMemberClick?.(entry.playerTag)}
      className={`data-li focus-ring flex w-full items-center justify-between !rounded-r-md !px-4 !py-3 text-left ${badgeStyle}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`font-mono text-sm font-bold w-6 text-center ${rankColor}`}>
          #{entry.rank}
        </span>
        {entry.leagueTier?.iconUrls?.small && (
          <Image
            src={entry.leagueTier.iconUrls.small}
            alt=""
            width={24}
            height={24}
            className="h-[24px] w-[24px] shrink-0"
            unoptimized
          />
        )}
        <div className="min-w-0 text-left">
          <span className="block truncate text-sm font-medium text-umbra-lilac">
            {entry.name}
          </span>
          <span className="block truncate text-2xs text-umbra-faint">
            TH{entry.townHallLevel}
            {entry.leagueTier?.name && ` · ${entry.leagueTier.name}`}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {entry.totalScore.toFixed(1)}
        </span>
        <div className="mt-1 flex justify-end gap-1">
          {entry.components.map((c) => (
            <div
              key={c.name}
              title={`${c.name}: ${
                c.available ? c.points.toFixed(1) : "unavailable"
              }`}
              className={`h-1.5 w-4 rounded-full ${
                c.available ? "bg-umbra-purple" : "bg-umbra-line"
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

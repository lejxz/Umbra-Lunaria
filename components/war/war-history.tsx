"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { WarHistoryEntry } from "@/lib/view-models/war";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconWarEmpty, IconChevronRight } from "@/components/ui/icons";

/**
 * War history list — regular + CWL wars, most-recent first (concept/07 §"War
 * history").
 *
 * Improved layout:
 *   - A win/loss/tie summary header (record over the displayed history).
 *   - Tighter card rows: result pill, opponent badge + name, type + size +
 *     date meta, score line, destruction, and a View-details button.
 *   - Live-tracked wars get a "Details" button; backfill rows show "No detail".
 *
 * Private war logs surface an explicit notice. A tracking-start caveat reminds
 * that pre-tracker history is incomplete.
 */
export function WarHistory({
  history,
  warLogPublic,
  trackingStart,
  onViewDetail,
}: {
  history: WarHistoryEntry[];
  warLogPublic: boolean | null;
  trackingStart: Date | null;
  onViewDetail: (warId: number) => void;
}) {
  // Win/loss/tie record over the displayed history.
  const record = useMemo(() => {
    let wins = 0, losses = 0, ties = 0;
    for (const w of history) {
      if (w.result === "win") wins++;
      else if (w.result === "loss") losses++;
      else if (w.result === "tie") ties++;
    }
    return { wins, losses, ties };
  }, [history]);

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="war-history-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          War history
        </p>
        <span className="text-2xs text-umbra-muted">{history.length} recorded</span>
      </div>
      <h3 id="war-history-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Past wars
      </h3>

      {/* Record summary */}
      {history.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <RecordChip label="W" value={record.wins} tone="emerald" />
          <RecordChip label="L" value={record.losses} tone="red" />
          <RecordChip label="T" value={record.ties} tone="amber" />
          <span className="ml-auto text-2xs text-umbra-muted">
            {record.wins + record.losses + record.ties > 0
              ? `${Math.round((record.wins / (record.wins + record.losses + record.ties)) * 100)}% win rate`
              : "—"}
          </span>
        </div>
      )}

      {warLogPublic === false && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-2xs text-amber-400">
          This clan&apos;s war log is private — history before tracking may be incomplete.
        </p>
      )}
      {warLogPublic === true && trackingStart && (
        <p className="mt-3 text-2xs text-umbra-muted">
          History before tracking began (<TimeAgo date={trackingStart} />) is incomplete.
        </p>
      )}

      <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <EmptyState
            title="No war history yet"
            description="Completed wars appear here once the tracker observes them, or after the public war log is backfilled."
            icon={<IconWarEmpty className="h-10 w-10" />}
          />
        ) : (
          history.map((w) => <WarHistoryRow key={w.warId} w={w} onViewDetail={onViewDetail} />)
        )}
      </div>
    </section>
  );
}

function RecordChip({ label, value, tone }: { label: string; value: number; tone: "emerald" | "red" | "amber" }) {
  const toneClass = {
    emerald: "border-emerald-400/30 text-emerald-400",
    red: "border-red-400/30 text-red-400",
    amber: "border-amber-400/30 text-amber-400",
  }[tone];
  return (
    <span className={`flex items-center gap-1 rounded-lg border bg-white/[.02] px-2 py-1 text-2xs font-semibold ${toneClass}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-display text-sm">{value}</span>
    </span>
  );
}

function WarHistoryRow({ w, onViewDetail }: { w: WarHistoryEntry; onViewDetail: (warId: number) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-umbra-line bg-white/[.02] px-3 py-2.5 transition hover:border-umbra-purple/30 hover:bg-white/[.04]">
      <ResultPill result={w.result} />

      {/* Opponent badge + name + meta */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {w.opponentBadgeUrls?.small ? (
          <div className="relative h-8 w-8 shrink-0">
            <Image
              src={w.opponentBadgeUrls.small}
              alt={`${w.opponentName ?? "Opponent"} badge`}
              fill
              className="object-contain grayscale"
            />
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-umbra-purple/10 text-umbra-purple/50">
            <IconWarEmpty className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-umbra-lilac" title={w.opponentName ?? ""}>
            vs {w.opponentName ?? "Unknown opponent"}
          </span>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-micro text-umbra-muted">
            <span className="rounded bg-white/5 px-1 text-umbra-purple/80">{w.warType === "cwl" ? "CWL" : "REG"}</span>
            {w.teamSize != null && <span>{w.teamSize}v{w.teamSize}</span>}
            {w.endTime ? <TimeAgo date={w.endTime} /> : <span className="text-amber-400">ongoing</span>}
          </div>
        </div>
      </div>

      {/* Score line */}
      <div className="flex shrink-0 items-center gap-1 font-display text-sm font-bold">
        <span className="text-amber-400">{w.ownStars ?? "—"}</span>
        <span className="text-2xs text-umbra-muted/50">–</span>
        <span className="text-umbra-muted">{w.opponentStars ?? "—"}</span>
      </div>

      {/* Destruction (hidden on narrow) */}
      <div className="hidden shrink-0 text-right font-mono text-micro text-umbra-muted sm:block">
        {w.ownDestructionPercentage != null && w.opponentDestructionPercentage != null ? (
          <span>
            <span className="text-umbra-lilac">{w.ownDestructionPercentage}</span>
            <span className="text-umbra-muted/40">/</span>
            <span>{w.opponentDestructionPercentage}</span>
            <span className="text-umbra-muted/50">%</span>
          </span>
        ) : (
          <span>—</span>
        )}
      </div>

      {/* Details button / no-detail tag */}
      <div className="shrink-0">
        {w.hasDetail ? (
          <button
            type="button"
            onClick={() => onViewDetail(w.warId)}
            className="focus-ring inline-flex items-center gap-1 rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/60 hover:bg-umbra-purple/20"
            aria-label={`View details for war vs ${w.opponentName ?? "opponent"}`}
          >
            Details
            <IconChevronRight className="h-3 w-3" aria-hidden />
          </button>
        ) : (
          <span
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-umbra-muted/40"
            title="No roster/attack detail available for this backfilled war"
          >
            —
          </span>
        )}
      </div>
    </div>
  );
}

function ResultPill({ result }: { result: "win" | "loss" | "tie" | null }) {
  if (result === "win")
    return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-2xs font-bold uppercase text-emerald-400">W</span>;
  if (result === "loss")
    return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-400/30 bg-red-400/10 text-2xs font-bold uppercase text-red-400">L</span>;
  if (result === "tie")
    return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-2xs font-bold uppercase text-amber-400">T</span>;
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-2xs font-bold uppercase text-umbra-muted/40">—</span>;
}

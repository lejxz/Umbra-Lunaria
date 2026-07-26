"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { WarHistoryEntry } from "@/lib/view-models/war";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconWarEmpty, IconChevronRight } from "@/components/ui/icons";

/**
 * War history list — regular + CWL wars, most-recent first (docs/concept/07 §"War
 * history").
 *
 * Improved layout:
 *   - A win/loss/tie summary header (record over the displayed history).
 *   - Tighter card rows: result pill, opponent badge + name, type + size +
 *     date meta, score line, destruction, and a View-details button.
 *   - Live-tracked wars get a "Details" button; backfill rows show "No detail".
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
    <section className="lunar-card flex flex-col" aria-labelledby="war-history-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          War history
        </p>
        <span className="text-2xs text-umbra-muted">{history.length} recorded</span>
      </div>
      <h3 id="war-history-title" className="mt-1 font-display text-lg text-umbra-moonlight">
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
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-2xs text-amber-300">
          This clan&apos;s war log is private — history before tracking may be incomplete.
        </p>
      )}
      {warLogPublic === true && trackingStart && (
        <p className="mt-3 text-2xs text-umbra-muted">
          History before tracking began (<TimeAgo date={trackingStart} />) is incomplete.
        </p>
      )}

      <div className="mt-4 data-container">
        <table className="w-full text-left text-sm">
          <thead className="data-thead">
            <tr>
              <th className="w-10 data-th">Result</th>
              <th className="data-th">Opponent</th>
              <th className="data-th">Type</th>
              <th className="data-th text-center">Score</th>
              <th className="hidden data-th text-right sm:table-cell">Destruction</th>
              <th className="data-th text-right">Action</th>
            </tr>
          </thead>
          <tbody className="data-tbody">
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8">
                  <EmptyState
                    title="No war history yet"
                    description="Completed wars appear here once the tracker observes them, or after the public war log is backfilled."
                    icon={<IconWarEmpty className="h-10 w-10" />}
                  />
                </td>
              </tr>
            ) : (
              history.map((w) => <WarHistoryRow key={w.warId} w={w} onViewDetail={onViewDetail} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecordChip({ label, value, tone }: { label: string; value: number; tone: "emerald" | "red" | "amber" }) {
  const toneClass = {
    emerald: "border-emerald-400/30 text-emerald-300",
    red: "border-red-400/30 text-red-300",
    amber: "border-amber-400/30 text-amber-300",
  }[tone];
  return (
    <span className={`lunar-tile flex items-center gap-1.5 !px-2 !py-1 text-2xs font-semibold ${toneClass}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-display text-sm">{value}</span>
    </span>
  );
}

function WarHistoryRow({ w, onViewDetail }: { w: WarHistoryEntry; onViewDetail: (warId: number) => void }) {
  return (
    <tr className="data-tr">
      {/* Result */}
      <td className="data-td">
        <ResultPill result={w.result} />
      </td>

      {/* Opponent badge + name */}
      <td className="data-td">
        <div className="flex items-center gap-2.5">
          {w.opponentBadgeUrls?.small ? (
            <div className="relative h-6 w-6 shrink-0">
              <Image
                src={w.opponentBadgeUrls.small}
                alt={`${w.opponentName ?? "Opponent"} badge`}
                fill
                className="object-contain grayscale"
              />
            </div>
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-umbra-purple/10 text-umbra-purple/50">
              <IconWarEmpty className="h-3 w-3" />
            </div>
          )}
          <span className="truncate font-medium text-umbra-lilac" title={w.opponentName ?? ""}>
            {w.opponentName ?? "Unknown opponent"}
          </span>
        </div>
      </td>

      {/* Type / Meta */}
      <td className="data-td">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-2xs text-umbra-muted">
            <span className="rounded bg-umbra-purple/15 px-1 text-umbra-purple">{w.warType === "cwl" ? "CWL" : "REG"}</span>
            {w.teamSize != null && <span className="ml-1.5">{w.teamSize}v{w.teamSize}</span>}
          </span>
          <span className="text-2xs text-umbra-faint">
            {w.endTime ? <TimeAgo date={w.endTime} /> : <span className="text-amber-400">ongoing</span>}
          </span>
        </div>
      </td>

      {/* Score line */}
      <td className="data-td text-center font-display text-sm font-bold">
        <span className="text-amber-400">{w.ownStars ?? "—"}</span>
        <span className="mx-1 text-2xs text-umbra-muted">–</span>
        <span className="text-umbra-muted">{w.opponentStars ?? "—"}</span>
      </td>

      {/* Destruction */}
      <td className="hidden data-td text-right font-mono text-2xs text-umbra-muted sm:table-cell">
        {w.ownDestructionPercentage != null && w.opponentDestructionPercentage != null ? (
          <span>
            <span className={w.ownDestructionPercentage === 100 ? "text-amber-400" : "text-umbra-lilac"}>{w.ownDestructionPercentage}</span>
            <span className="text-umbra-faint">/</span>
            <span>{w.opponentDestructionPercentage}</span>
            <span className="text-umbra-faint">%</span>
          </span>
        ) : (
          <span>—</span>
        )}
      </td>

      {/* Details button */}
      <td className="data-td text-right">
        {w.hasDetail ? (
          <button
            type="button"
            onClick={() => onViewDetail(w.warId)}
            className="focus-ring btn-ghost !px-3 !py-1 text-2xs font-semibold uppercase tracking-wider"
            aria-label={`View details for war vs ${w.opponentName ?? "opponent"}`}
          >
            Details
            <IconChevronRight className="h-3 w-3" aria-hidden />
          </button>
        ) : (
          <span
            className="badge muted"
            title="No roster/attack detail available for this backfilled war"
          >
            <span className="d" aria-hidden />
            —
          </span>
        )}
      </td>
    </tr>
  );
}

function ResultPill({ result }: { result: "win" | "loss" | "tie" | null }) {
  if (result === "win")
    return (
      <span
        className="badge good flex h-7 w-7 shrink-0 !justify-center !px-0"
        title="Win"
      >
        <span className="d" aria-hidden />
        W
      </span>
    );
  if (result === "loss")
    return (
      <span
        className="badge danger flex h-7 w-7 shrink-0 !justify-center !px-0"
        title="Loss"
      >
        <span className="d" aria-hidden />
        L
      </span>
    );
  if (result === "tie")
    return (
      <span
        className="badge warn flex h-7 w-7 shrink-0 !justify-center !px-0"
        title="Tie"
      >
        <span className="d" aria-hidden />
        T
      </span>
    );
  return (
    <span
      className="badge muted flex h-7 w-7 shrink-0 !justify-center !px-0"
      title="No result"
    >
      <span className="d" aria-hidden />
      —
    </span>
  );
}

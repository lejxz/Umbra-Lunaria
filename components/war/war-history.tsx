import type { WarHistoryEntry } from "@/lib/view-models/war";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconWarEmpty } from "@/components/ui/icons";

/**
 * War history list — regular + CWL wars, most-recent first (concept/07 §"War
 * history"). Each row shows type, opponent, result, size, stars, destruction,
 * and end date. Wars observed live by the tracker are marked "detailed" (a
 * snapshot exists); war-log backfill rows show result/destruction only.
 *
 * Private war logs surface an explicit notice rather than pretending history
 * exists. A tracking-start caveat reminds that pre-tracker history is
 * incomplete.
 */
export function WarHistory({
  history,
  warLogPublic,
  trackingStart,
}: {
  history: WarHistoryEntry[];
  warLogPublic: boolean | null;
  trackingStart: Date | null;
}) {
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

      {warLogPublic === false && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-2xs text-amber-400">
          This clan&apos;s war log is private — history before tracking may be incomplete. New
          rich records build from captured current wars.
        </p>
      )}
      {warLogPublic === true && trackingStart && (
        <p className="mt-3 text-2xs text-umbra-muted">
          History before tracking began (<TimeAgo date={trackingStart} />) is incomplete.
        </p>
      )}

      <div className="mt-4 max-h-[32rem] overflow-y-auto">
        {history.length === 0 ? (
          <EmptyState
            title="No war history yet"
            description="Completed wars appear here once the tracker observes them, or after the public war log is backfilled."
            icon={<IconWarEmpty className="h-10 w-10" />}
          />
        ) : (
          <ul className="divide-y divide-umbra-line/60">
            {history.map((w) => (
              <li
                key={w.warId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 py-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ResultDot result={w.result} />
                  <span className="truncate text-xs text-umbra-lilac">
                    {w.opponentName ?? "Unknown opponent"}
                  </span>
                  <Badge tone={w.warType === "cwl" ? "brand" : "muted"}>
                    {w.warType === "cwl" ? "CWL" : "Regular"}
                  </Badge>
                  {w.hasDetail && (
                    <Badge tone="success">detailed</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono text-2xs text-umbra-muted">
                  {w.teamSize != null && <span>{w.teamSize}v{w.teamSize}</span>}
                  <span className="text-amber-400">
                    ★{w.ownStars ?? "—"}–{w.opponentStars ?? "—"}
                  </span>
                  {(w.ownDestructionPercentage != null || w.opponentDestructionPercentage != null) && (
                    <span>
                      {w.ownDestructionPercentage ?? "—"}% / {w.opponentDestructionPercentage ?? "—"}%
                    </span>
                  )}
                  {w.endTime ? <TimeAgo date={w.endTime} /> : <span>ongoing</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ResultDot({ result }: { result: "win" | "loss" | "tie" | null }) {
  const tone =
    result === "win"
      ? "bg-emerald-400"
      : result === "loss"
        ? "bg-red-400"
        : result === "tie"
          ? "bg-amber-400"
          : "bg-umbra-muted/40";
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${tone}`}
      aria-label={result ?? "no result"}
      title={result ?? "ongoing / unavailable"}
    />
  );
}

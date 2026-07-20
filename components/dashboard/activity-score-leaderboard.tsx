import Image from "next/image";
import type { ActivityScoreLeaderboard } from "@/lib/view-models/dashboard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Member Activity Score leaderboard. A transparent, rolling 30-day measure
 * of observed clan support — not a claim about player skill. Shows rank,
 * score, component breakdown, tracking window, and limited-data state.
 * See concept/05-dashboard.md §5.
 */
export function ActivityScoreLeaderboard({
  leaderboard,
  onMemberClick,
}: {
  leaderboard: ActivityScoreLeaderboard;
  onMemberClick?: (playerTag: string) => void;
}) {
  const { entries, window, totalMembers } = leaderboard;

  return (
    <section
      className="glass rounded-2xl p-5"
      aria-labelledby="activity-score-title"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          Observed clan support
        </p>
        <Badge tone="muted">{window}</Badge>
      </div>
      <h3 id="activity-score-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Member Activity Score
      </h3>

      {entries.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No scores yet"
            description="Scores will appear once the tracker has enough donation, activity, and war data."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto">
            {entries.slice(0, 15).map((entry) => (
              <button
                key={entry.playerTag}
                onClick={() => onMemberClick?.(entry.playerTag)}
                className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/[.035] px-3 py-2.5 text-left transition hover:bg-white/[.06] focus-ring"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs text-umbra-purple">
                    {entry.rank.toString().padStart(2, "0")}
                  </span>
                  {entry.league?.iconUrls?.small && (
                    <Image
                      src={entry.league.iconUrls.small}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0"
                      unoptimized
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-umbra-lilac">
                      {entry.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-umbra-muted">
                      {entry.playerTag}
                    </p>
                    <p className="truncate text-xs text-umbra-muted">
                      {entry.townHallLevel ? `TH${entry.townHallLevel}` : ""}
                      {entry.league?.name && ` · ${entry.league.name}`}
                      {entry.limitedData && " · limited data"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold text-emerald-400">
                    {entry.totalScore.toFixed(1)}
                  </p>
                  <div className="mt-0.5 flex gap-0.5">
                    {entry.components.map((c) => (
                      <div
                        key={c.name}
                        title={`${c.name}: ${c.available ? c.points.toFixed(1) : "unavailable"}`}
                        className={`h-1.5 w-4 rounded-full ${
                          c.available ? "bg-umbra-purple" : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-umbra-muted">
            Transparent components reweight when tracked history is unavailable.
            {totalMembers > 15 && ` Showing top 15 of ${totalMembers}.`}
          </p>
        </>
      )}
    </section>
  );
}

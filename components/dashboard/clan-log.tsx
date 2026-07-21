import type { ClanLog as ClanLogData } from "@/lib/view-models/dashboard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Clan activity log. Renders a most-recent-first feed of joins, departures,
 * and rejoins with name, player tag, event type, and timestamp. Purged members
 * show a "data removed" state. See concept/05-dashboard.md §8.
 */
export function ClanLogPanel({
  log,
  onMemberClick,
}: {
  log: ClanLogData;
  onMemberClick?: (playerTag: string) => void;
}) {
  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="clan-log-title"
      style={{ height: "380px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          Roster history
        </p>
        <Badge tone="muted">{log.entries.length} recent</Badge>
      </div>
      <h3
        id="clan-log-title"
        className="mt-1 font-display text-lg text-umbra-lilac"
      >
        Clan log
      </h3>

      {log.entries.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <EmptyState
            title="No membership events yet"
            description="Joins, departures, and rejoins will appear here once the tracker observes them."
          />
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto">
          {log.entries.map((entry) => {
            const tone =
              entry.eventType === "join"
                ? "success"
                : entry.eventType === "leave"
                  ? "danger"
                  : "brand";

            return (
              <button
                key={entry.id}
                onClick={() =>
                  !entry.isPurged && onMemberClick?.(entry.playerTag)
                }
                disabled={entry.isPurged}
                className={`flex w-full items-center justify-between gap-2.5 rounded-lg bg-white/[.035] px-3 py-2 text-left transition ${
                  entry.isPurged
                    ? "cursor-default opacity-60"
                    : "hover:bg-white/[.06] focus-ring"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-umbra-lilac">
                    {entry.name}
                    {entry.isPurged && (
                      <span className="ml-2 text-xs text-umbra-muted">
                        · data removed
                      </span>
                    )}
                  </p>
                  <p className="truncate font-mono text-[10px] text-umbra-muted">
                    {entry.playerTag} ·{" "}
                    {new Date(entry.eventTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "Asia/Manila",
                    })}
                  </p>
                </div>
                <Badge tone={tone}>{entry.eventType}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

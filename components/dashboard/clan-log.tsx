import type { ClanLog as ClanLogData, ClanLogEntry } from "@/lib/view-models/dashboard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IconUserPlus,
  IconUserMinus,
  IconUserCheck,
  IconArrowUp,
} from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Clan activity log. Renders a most-recent-first feed of joins, departures,
 * rejoins, TH upgrades, and renames with name, player tag, event type, and
 * timestamp. Purged members show a "data removed" state. See docs/concept/05-dashboard.md §8.
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
      className="panel border-t-2 border-t-umbra-purple/30 transition hover:border-umbra-line/40 flex flex-col p-5 h-[450px]"
      aria-labelledby="clan-log-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Eyebrow accent="purple">Roster history</Eyebrow>
        <Badge tone="muted">{log.entries.length} recent</Badge>
      </div>
      <h3
        id="clan-log-title"
        className="mt-1 font-display text-lg text-umbra-lilac"
      >
        Clan Log
      </h3>

      {log.entries.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <EmptyState
            title="No membership events yet"
            description="Joins, departures, and rejoins will appear here once the tracker observes them."
          />
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-2">
          {log.entries.map((entry) => {
            const visuals = getEventVisuals(entry);
            const labelText = getBadgeLabel(entry);

            return (
              <button
                key={entry.id}
                onClick={() =>
                  !entry.isPurged && onMemberClick?.(entry.playerTag)
                }
                disabled={entry.isPurged}
                className={`flex w-full items-center justify-between gap-2.5 tile px-3 py-2 text-left even:bg-white/[.015] ${
                  entry.isPurged
                    ? "cursor-default opacity-60"
                    : "hover-subtle focus-ring"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-black/20">
                    <visuals.Icon className={`h-[14px] w-[14px] ${visuals.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-umbra-lilac">
                      {visuals.title}
                      {entry.isPurged && (
                        <span className="ml-2 text-xs text-umbra-muted">
                          · data removed
                        </span>
                      )}
                    </p>
                    <p className="truncate text-2xs text-umbra-muted">
                      <span className="font-mono">{entry.playerTag}</span> ·{" "}
                      {visuals.subtext}
                    </p>
                  </div>
                </div>
                <Badge tone={visuals.tone}>{labelText}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers — keep the icon/tone/label logic for each event type in one place.
// ---------------------------------------------------------------------------

type IconComponent = (props: { className?: string }) => React.ReactElement;

interface EventVisual {
  Icon: IconComponent;
  color: string;
  tone: "success" | "danger" | "warning" | "brand" | "muted";
  title: string;
  subtext: string;
}

function getEventVisuals(entry: ClanLogEntry): EventVisual {
  const dateLabel = new Date(entry.eventTime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

  switch (entry.eventType) {
    case "join":
      return {
        Icon: IconUserPlus,
        color: "text-emerald-400",
        tone: "success",
        title: entry.name,
        subtext: dateLabel,
      };
    case "leave":
      return {
        Icon: IconUserMinus,
        color: "text-red-400",
        tone: "danger",
        title: entry.name,
        subtext: dateLabel,
      };
    case "rejoin":
      return {
        Icon: IconUserCheck,
        color: "text-amber-400",
        tone: "brand",
        title: entry.name,
        subtext: dateLabel,
      };
    case "thUpgrade": {
      const meta = entry.metadata ?? {};
      const rushed = meta.rushedPercent ?? null;
      // Color-code by rushed percent — higher percent means a more rushed
      // upgrade that the leadership should pay attention to.
      let color = "text-emerald-400";
      let tone: EventVisual["tone"] = "success";
      if (rushed !== null && rushed > 60) {
        color = "text-red-400";
        tone = "danger";
      } else if (rushed !== null && rushed >= 30) {
        color = "text-amber-400";
        tone = "warning";
      }
      const subtext =
        rushed === null || rushed === undefined
          ? dateLabel
          : `${Math.round(rushed)}% rushed · ${dateLabel}`;
      return {
        Icon: IconArrowUp,
        color,
        tone,
        title: entry.name,
        subtext,
      };
    }
    case "rename": {
      const meta = entry.metadata ?? {};
      const oldName = meta.oldName ?? entry.name;
      const newName = meta.newName ?? entry.name;
      return {
        Icon: IconUserCheck,
        color: "text-umbra-purple",
        tone: "brand",
        title: `${oldName} → ${newName}`,
        subtext: `renamed · ${dateLabel}`,
      };
    }
    default:
      return {
        Icon: IconUserCheck,
        color: "text-umbra-muted",
        tone: "muted",
        title: entry.name,
        subtext: dateLabel,
      };
  }
}

function getBadgeLabel(entry: ClanLogEntry): string {
  switch (entry.eventType) {
    case "join":
      return "joined";
    case "leave":
      return "left";
    case "rejoin":
      return "rejoined";
    case "thUpgrade": {
      const meta = entry.metadata ?? {};
      if (meta.oldTH !== undefined && meta.newTH !== undefined) {
        return `TH${meta.oldTH}→TH${meta.newTH}`;
      }
      return "TH upgrade";
    }
    case "rename":
      return "renamed";
    default:
      return entry.eventType;
  }
}

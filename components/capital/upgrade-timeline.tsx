"use client";

import { useMemo } from "react";
import type { DistrictUpgradeHistory } from "@/lib/view-models/capital";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconCapital, IconChevronRight } from "@/components/ui/icons";

/**
 * District upgrade timeline — chronological events diffed from daily
 * district-snapshot captures (concept/08 §"District upgrade history"). Each
 * event is a completed level increase: "Barbarian Camp reached level 4".
 *
 * A district filter narrows the timeline. States:
 *   - Cold start (one snapshot per district): explains history begins after
 *     the next observed change.
 *   - No snapshots at all: empty state.
 *   - Events present: chronological list, newest-first, on a timeline rail.
 */
export function UpgradeTimeline({
  history,
  filter,
  onFilterChange,
}: {
  history: DistrictUpgradeHistory;
  filter: string;
  onFilterChange: (district: string) => void;
}) {
  const filteredEvents = useMemo(() => {
    if (filter === "all") return history.events;
    return history.events.filter((e) => e.districtName === filter);
  }, [history.events, filter]);

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="upgrade-timeline-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Upgrade history · tracked
        </p>
        {history.events.length > 0 && (
          <span className="rounded-full border border-umbra-purple/30 bg-umbra-purple/10 px-2 py-0.5 text-micro font-semibold text-umbra-purple">
            {history.events.length} {history.events.length === 1 ? "upgrade" : "upgrades"}
          </span>
        )}
      </div>
      <h3 id="upgrade-timeline-title" className="mt-1 font-display text-lg text-umbra-lilac">
        District upgrade timeline
      </h3>

      {/* District filter */}
      {history.districtNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => onFilterChange("all")} label="All" />
          {history.districtNames.map((name) => (
            <FilterChip
              key={name}
              active={filter === name}
              onClick={() => onFilterChange(name)}
              label={name}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        {history.isColdStart ? (
          <EmptyState
            title={history.events.length === 0 ? "Tracking just started" : "No upgrades observed yet"}
            description={
              history.trackingStart
                ? `District levels were first captured ${formatRelative(history.trackingStart)}. Upgrade events will appear here after the next daily batch observes a level increase.`
                : "Upgrade history will begin after the next daily batch observes a level increase."
            }
            icon={<IconCapital className="h-10 w-10" />}
          />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="No upgrades for this district"
            description="No level increases have been observed for the selected district."
            icon={<IconCapital className="h-10 w-10" />}
          />
        ) : (
          <ol className="relative space-y-2 border-l border-umbra-line pl-4">
            {filteredEvents.map((e, i) => (
              <li key={`${e.districtName}-${e.observedAt.getTime()}-${i}`} className="relative">
                <span className="absolute -left-[1.4rem] top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/20" />
                <div className="rounded-lg border border-umbra-line/60 bg-white/[.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-umbra-lilac">
                      {e.districtName}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-2xs">
                      <span className="text-umbra-muted">Lv {e.fromLevel}</span>
                      <IconChevronRight className="h-3 w-3 text-umbra-muted/60" aria-hidden />
                      <span className="text-emerald-400">Lv {e.toLevel}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-micro text-umbra-muted/70">
                    <TimeAgo date={e.observedAt} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

    </section>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider transition ${
        active
          ? "border-umbra-purple/50 bg-umbra-purple/15 text-umbra-lilac"
          : "border-umbra-line bg-white/[.02] text-umbra-muted hover:border-umbra-purple/30 hover:text-umbra-lilac"
      }`}
    >
      {label}
    </button>
  );
}

function formatRelative(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

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
    <section className="glass flex flex-col overflow-hidden rounded-2xl p-6 sm:p-8" aria-labelledby="upgrade-timeline-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Upgrade history · tracked
        </p>
        {history.events.length > 0 && (
          <span className="rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-3 py-1 font-mono text-label text-umbra-lilac shadow-[0_0_10px_rgba(152,107,255,0.2)]">
            {history.events.length} {history.events.length === 1 ? "upgrade" : "upgrades"}
          </span>
        )}
      </div>
      <h3 id="upgrade-timeline-title" className="mt-1 font-display text-2xl font-medium tracking-wide text-umbra-lilac sm:text-3xl">
        District upgrade timeline
      </h3>

      {/* District filter */}
      {history.districtNames.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
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
          <ol className="relative ml-2 space-y-4 border-l-2 border-umbra-line/40 pl-6 pb-2">
            {filteredEvents.map((e, i) => (
              <li key={`${e.districtName}-${e.observedAt.getTime()}-${i}`} className="group relative">
                {/* Glowing Dot */}
                <span className="absolute -left-[1.82rem] top-3 h-3 w-3 rounded-full border-2 border-umbra-ink bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] ring-2 ring-emerald-500/30 transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_16px_rgba(16,185,129,1)]" />
                
                <div className="rounded-xl border border-umbra-line/40 bg-white/[.01] px-5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-umbra-purple/40 hover:bg-white/[.03] hover:shadow-glow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                    <span className="truncate text-base font-medium tracking-wide text-umbra-lilac">
                      {e.districtName}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 font-mono text-xs">
                      <span className="text-umbra-muted transition-colors group-hover:text-umbra-muted/80">Lv {e.fromLevel}</span>
                      <IconChevronRight className="h-3.5 w-3.5 text-umbra-purple/70 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      <span className="font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">Lv {e.toLevel}</span>
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-label text-umbra-muted/70">
                    <TimeAgo date={e.observedAt} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {history.trackingStart && !history.isColdStart && (
        <p className="mt-5 text-center text-label text-umbra-muted/60">
          Tracking began {formatRelative(history.trackingStart)}. Upgrades before
          this date are not recorded.
        </p>
      )}
    </section>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring relative overflow-hidden rounded-full border px-4 py-1.5 font-mono text-label uppercase tracking-wider transition-all duration-300 ${
        active
          ? "border-umbra-purple/60 text-white shadow-[0_0_12px_rgba(152,107,255,0.4)]"
          : "border-umbra-line/60 bg-white/[.02] text-umbra-muted hover:border-umbra-purple/40 hover:bg-white/[.05] hover:text-umbra-lilac"
      }`}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-umbra-purple/40 to-umbra-purple/10" />
      )}
      <span className="relative z-10">{label}</span>
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

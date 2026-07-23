import type { CapitalOverview } from "@/lib/view-models/capital";
import { UnavailableValue } from "@/components/ui/state-primitives";
import { TimeAgo } from "@/components/ui/time-ago";

/**
 * Capital overview card — the current API facts (concept/08 §"Current Capital
 * overview"): Hall level, points, league, district count, latest capture time.
 * Shows a cold-start state when the clan row has no districts payload yet.
 */
export function CapitalOverviewCard({ overview }: { overview: CapitalOverview }) {
  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="capital-overview-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Clan capital · current
        </p>
        {overview.lastCaptureAt && (
          <span className="text-2xs text-umbra-muted">
            Captured <TimeAgo date={overview.lastCaptureAt} />
          </span>
        )}
      </div>
      <h3 id="capital-overview-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Capital overview
      </h3>

      {/* 3 core stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat
          label="Hall level"
          value={overview.capitalHallLevel ?? <UnavailableValue />}
        />
        <MiniStat
          label="Capital pts"
          value={overview.capitalPoints ?? <UnavailableValue />}
        />
        <MiniStat
          label="Districts"
          value={overview.districtCount ?? <UnavailableValue />}
        />
      </div>

      {/* League */}
      <div className="mt-3 flex flex-1 items-center justify-center rounded-xl bg-white/[.035] p-3">
        <div className="text-center">
          <p className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
            Capital league
          </p>
          <p className="mt-1 font-display text-lg font-bold text-umbra-lilac">
            {overview.capitalLeague?.name ?? <UnavailableValue />}
          </p>
        </div>
      </div>

      {/* Unavailable: live upgrade cost/progress (concept/08 §"Explicitly unavailable") */}
      <p className="mt-3 text-center text-2xs text-umbra-muted/60">
        Live upgrade cost &amp; progress are not provided by the API.
      </p>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[.035] p-2.5 text-center">
      <p className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
    </div>
  );
}

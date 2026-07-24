import type { CapitalOverview } from "@/lib/view-models/capital";
import { UnavailableValue } from "@/components/ui/state-primitives";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconCapital } from "@/components/ui/icons";

/**
 * Capital overview card — the current API facts (concept/08 §"Current Capital
 * overview"). Hero-style layout: the Capital Hall level is the centerpiece
 * (it's the single most-asked question about a clan's Capital), flanked by
 * points + district count, with the league as a badge and the freshness line.
 *
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

      {/* Hero: Capital Hall level centerpiece + side stats */}
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-4 sm:grid-cols-[auto_1fr_auto]">
        {/* Hall level — the centerpiece */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-umbra-purple/20 bg-umbra-purple/5 px-5 py-3">
          <IconCapital className="h-7 w-7 text-umbra-purple/70" aria-hidden />
          <p className="mt-1 font-mono text-micro uppercase tracking-wider text-umbra-muted">
            Hall
          </p>
          <p className="font-display text-3xl font-bold leading-none text-umbra-lilac">
            {overview.capitalHallLevel ?? <UnavailableValue />}
          </p>
        </div>

        {/* Points + districts stacked */}
        <div className="flex flex-col justify-center gap-2">
          <div className="flex items-baseline justify-between rounded-lg bg-white/[.035] px-3 py-1.5">
            <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
              Capital points
            </span>
            <span className="font-display text-lg font-bold text-white">
              {overview.capitalPoints ?? <UnavailableValue />}
            </span>
          </div>
          <div className="flex items-baseline justify-between rounded-lg bg-white/[.035] px-3 py-1.5">
            <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
              Districts
            </span>
            <span className="font-display text-lg font-bold text-white">
              {overview.districtCount ?? <UnavailableValue />}
            </span>
          </div>
        </div>

        {/* League badge — right column on sm+ */}
        <div className="col-span-2 flex items-center justify-center rounded-xl bg-white/[.035] px-4 py-2 sm:col-span-1 sm:flex-col">
          <p className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
            League
          </p>
          <p className="sm:mt-1 ml-2 sm:ml-0 font-display text-base font-bold text-umbra-lilac">
            {overview.capitalLeague?.name ?? <UnavailableValue />}
          </p>
        </div>
      </div>

      {/* Unavailable: live upgrade cost/progress (concept/08 §"Explicitly unavailable") */}
      <p className="mt-3 text-center text-2xs text-umbra-muted/50">
        Live upgrade cost &amp; progress are not provided by the API.
      </p>
    </section>
  );
}

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
    <section className="glass relative flex flex-col overflow-hidden rounded-2xl p-6 sm:p-8" aria-labelledby="capital-overview-title">
      {/* Background glow for hero effect */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-umbra-purple/20 blur-[100px]" />
      
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
              Clan capital · current
            </p>
            <h3 id="capital-overview-title" className="mt-1 font-display text-2xl font-medium tracking-wide text-umbra-lilac sm:text-3xl">
              Capital overview
            </h3>
          </div>
          {overview.lastCaptureAt && (
            <span className="hidden sm:inline-block rounded-full border border-umbra-line/40 bg-white/[.02] px-3 py-1 font-mono text-label text-umbra-muted">
              Captured <TimeAgo date={overview.lastCaptureAt} />
            </span>
          )}
        </div>

        {/* Hero: Capital Hall level centerpiece + side stats */}
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-4 sm:grid-cols-[auto_1fr_auto]">
          {/* Hall level — the centerpiece */}
          <div className="group relative flex flex-col items-center justify-center rounded-2xl border border-umbra-purple/30 bg-gradient-to-br from-umbra-purple/10 to-transparent px-8 py-6 shadow-glow transition-all duration-300 hover:-translate-y-1 hover:border-umbra-purple/60 hover:shadow-[0_0_20px_rgba(152,107,255,0.3)]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <IconCapital className="relative z-10 h-10 w-10 text-umbra-purple/90 drop-shadow-[0_0_10px_rgba(152,107,255,0.5)]" aria-hidden />
            <p className="relative z-10 mt-3 font-mono text-xs uppercase tracking-widest text-umbra-muted transition-colors group-hover:text-umbra-lilac">
              Capital Hall
            </p>
            <p className="relative z-10 mt-1 bg-gradient-to-b from-white to-white/70 bg-clip-text font-display text-5xl font-bold leading-none text-transparent drop-shadow-lg sm:text-6xl">
              {overview.capitalHallLevel ?? <UnavailableValue />}
            </p>
          </div>

          {/* Points + districts stacked */}
          <div className="flex flex-col justify-center gap-3">
            <div className="group flex items-baseline justify-between rounded-xl border border-umbra-line/40 bg-white/[.02] px-4 py-3 transition-all duration-300 hover:border-umbra-line/80 hover:bg-white/[.04]">
              <span className="font-mono text-label uppercase tracking-wider text-umbra-muted transition-colors group-hover:text-umbra-lilac/80">
                Capital points
              </span>
              <span className="font-display text-xl font-bold text-white drop-shadow-md">
                {overview.capitalPoints ?? <UnavailableValue />}
              </span>
            </div>
            <div className="group flex items-baseline justify-between rounded-xl border border-umbra-line/40 bg-white/[.02] px-4 py-3 transition-all duration-300 hover:border-umbra-line/80 hover:bg-white/[.04]">
              <span className="font-mono text-label uppercase tracking-wider text-umbra-muted transition-colors group-hover:text-umbra-lilac/80">
                Districts
              </span>
              <span className="font-display text-xl font-bold text-white drop-shadow-md">
                {overview.districtCount ?? <UnavailableValue />}
              </span>
            </div>
          </div>

          {/* League badge — right column on sm+ */}
          <div className="col-span-2 flex items-center justify-center rounded-xl border border-umbra-line/40 bg-white/[.02] px-6 py-4 transition-all duration-300 hover:border-umbra-line/80 hover:bg-white/[.04] sm:col-span-1 sm:flex-col">
            <p className="font-mono text-label uppercase tracking-wider text-umbra-muted">
              League
            </p>
            <p className="ml-3 font-display text-xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-purple-400 drop-shadow-md sm:ml-0 sm:mt-2">
              {overview.capitalLeague?.name ?? <UnavailableValue />}
            </p>
          </div>
        </div>

        {/* Unavailable: live upgrade cost/progress (concept/08 §"Explicitly unavailable") */}
        <p className="text-center text-label text-umbra-muted/50 mt-1">
          Live upgrade cost &amp; progress are not provided by the API.
        </p>
      </div>
    </section>
  );
}

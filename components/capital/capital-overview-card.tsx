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
      <div className="mt-4 flex flex-col items-center justify-center gap-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-umbra-purple/10 border border-umbra-purple/20">
            <IconCapital className="h-7 w-7 text-umbra-purple/80" aria-hidden />
          </div>
          <div>
            <h4 className="font-display text-2xl font-semibold text-umbra-lilac">
              Capital Peak Level {overview.capitalHallLevel ?? <UnavailableValue />}
            </h4>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-umbra-muted">
              {overview.capitalLeague?.name ?? "Unranked"} League
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-xl bg-white/5 p-1">
          <TotalChip label="Capital Points" value={overview.capitalPoints} />
          <div className="h-4 w-px bg-white/10 mx-1" />
          <TotalChip label="Districts" value={overview.districtCount} />
        </div>
      </div>

    </section>
  );
}

/** Compact inline total — label + value on one line, small */
function TotalChip({
  label,
  value,
}: {
  label: string;
  value: number | string | null;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="font-display text-xs font-bold text-white">
        {value ?? <UnavailableValue />}
      </span>
    </div>
  );
}

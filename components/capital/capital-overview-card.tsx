import type { CapitalOverview } from "@/lib/view-models/capital";
import { UnavailableValue } from "@/components/ui/state-primitives";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconCapital } from "@/components/ui/icons";

/**
 * Capital overview card — the current API facts (docs/concept/08 §"Current Capital
 * overview"). Hero-style layout: the Capital Hall level is the centerpiece
 * (it's the single most-asked question about a clan's Capital), flanked by
 * points + district count, with the league as a badge and the freshness line.
 *
 * Shows a cold-start state when the clan row has no districts payload yet.
 */
export function CapitalOverviewCard({ overview }: { overview: CapitalOverview }) {
  return (
    <section
      className="glass flex h-full flex-col rounded-2xl p-5"
      aria-labelledby="capital-overview-title"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-label font-semibold uppercase tracking-[.16em] text-umbra-purple">
          Clan capital · current
        </p>
        {overview.lastCaptureAt && (
          <span className="font-mono text-2xs uppercase tracking-wider text-umbra-faint">
            Captured <TimeAgo date={overview.lastCaptureAt} />
          </span>
        )}
      </div>
      <h3
        id="capital-overview-title"
        className="mt-1 font-display text-lg text-umbra-moonlight"
      >
        Capital overview
      </h3>

      {/* Hero: Capital Hall level centerpiece + side stats */}
      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-umbra-line bg-umbra-purple/[.06] text-umbra-purple shadow-glow-sm">
            <IconCapital className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h4 className="font-display text-2xl font-semibold text-umbra-moonlight">
              Capital Peak Level {overview.capitalHallLevel ?? <UnavailableValue />}
            </h4>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-umbra-muted">
              {overview.capitalLeague?.name ?? "Unranked"} League
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-r-md border border-umbra-line bg-umbra-surface/40 p-1">
          <TotalChip label="Capital Points" value={overview.capitalPoints} />
          <div className="h-4 w-px bg-umbra-line-soft" />
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
      <span className="font-mono text-micro uppercase tracking-wider text-umbra-faint">
        {label}
      </span>
      <span className="font-mono text-xs font-semibold text-umbra-moonlight">
        {value ?? <UnavailableValue />}
      </span>
    </div>
  );
}

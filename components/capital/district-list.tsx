import type { CapitalDistrict } from "@/lib/view-models/capital";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCapital } from "@/components/ui/icons";

/**
 * District list — the full current district reference (concept/08 §"Current
 * Capital overview" #4). Positioned last on the page because district levels
 * change infrequently (a level-up is a multi-day event), so this is the
 * least-urgent section.
 *
 * Compact two-column grid. Districts sorted by level (descending) so the
 * highest-level districts — the ones closest to a milestone — surface first.
 * A cold-start state is shown when no districts payload exists yet.
 */
export function DistrictList({
  districts,
  hasDistricts,
}: {
  districts: CapitalDistrict[];
  hasDistricts: boolean;
}) {
  // Sort by level descending (highest first), then by name for stability.
  const sorted = [...districts].sort(
    (a, b) => b.districtHallLevel - a.districtHallLevel || a.name.localeCompare(b.name),
  );

  return (
    <section className="glass flex flex-col overflow-hidden rounded-2xl p-6 sm:p-8" aria-labelledby="district-list-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Districts · reference
        </p>
        {hasDistricts && (
          <span className="rounded-full border border-umbra-line/40 bg-white/[.02] px-3 py-1 font-mono text-label text-umbra-muted">
            {districts.length} districts
          </span>
        )}
      </div>
      <h3 id="district-list-title" className="mt-1 font-display text-2xl font-medium tracking-wide text-umbra-lilac sm:text-3xl">
        District list
      </h3>

      {!hasDistricts ? (
        <div className="mt-4">
          <EmptyState
            title="No district data yet"
            description="Districts appear here after the first daily batch captures the clan's Capital state."
            icon={<IconCapital className="h-10 w-10" />}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {sorted.map((d) => (
            <li
              key={d.name}
              className="group flex items-center justify-between rounded-xl border border-umbra-line/40 bg-white/[.015] px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-umbra-purple/40 hover:bg-white/[.03] hover:shadow-glow"
            >
              <span className="truncate text-sm font-medium tracking-wide text-umbra-lilac transition-colors group-hover:text-white" title={d.name}>
                {d.name}
              </span>
              <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-umbra-purple">
                <span className="text-umbra-muted transition-colors group-hover:text-umbra-purple/70">Lv</span>{" "}
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-purple-400 drop-shadow-sm transition-all duration-300 group-hover:text-white">{d.districtHallLevel}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-center text-label text-umbra-muted/50">
        District levels update infrequently — a level-up is a multi-day Capital
        Gold effort. See the upgrade timeline above for observed changes.
      </p>
    </section>
  );
}

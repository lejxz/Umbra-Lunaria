import type { CapitalDistrict } from "@/lib/view-models/capital";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCapital } from "@/components/ui/icons";

/**
 * District list — the full current district reference (docs/concept/08 §"Current
 * Capital overview" #4). Positioned last on the page because district levels
 * change infrequently (a level-up is a multi-day event), so this is the
 * least-urgent section.
 *
 * Compact two-column grid of `.data-li` rows. Districts sorted by level
 * (descending) so the highest-level districts — the ones closest to a
 * milestone — surface first. A cold-start state is shown when no districts
 * payload exists yet.
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
    <section
      className="glass flex h-full flex-col rounded-2xl p-5"
      aria-labelledby="district-list-title"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-label font-semibold uppercase tracking-[.16em] text-umbra-purple">
          Districts · reference
        </p>
        {hasDistricts && (
          <span className="font-mono text-2xs uppercase tracking-wider text-umbra-faint">
            {districts.length} districts
          </span>
        )}
      </div>
      <h3 id="district-list-title" className="mt-1 font-display text-lg text-umbra-moonlight">
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
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {sorted.map((d) => (
            <li
              key={d.name}
              className="data-li flex items-center justify-between px-4 py-2.5"
            >
              <span className="truncate text-sm text-umbra-lilac" title={d.name}>
                {d.name}
              </span>
              <span className="shrink-0 font-mono text-xs font-semibold text-umbra-purple">
                Lv {d.districtHallLevel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

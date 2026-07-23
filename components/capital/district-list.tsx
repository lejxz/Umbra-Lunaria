import type { CapitalDistrict } from "@/lib/view-models/capital";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCapital } from "@/components/ui/icons";

/**
 * District list — the full current district view (concept/08 §"Current Capital
 * overview" #4: "District names and current district hall levels"). The
 * dashboard shows a compact version; this is the full list.
 *
 * Districts are sorted by name. Each row shows the district name + its hall
 * level. A cold-start state is shown when no districts payload exists yet.
 */
export function DistrictList({
  districts,
  hasDistricts,
}: {
  districts: CapitalDistrict[];
  hasDistricts: boolean;
}) {
  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="district-list-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Districts · current levels
        </p>
        {hasDistricts && (
          <span className="text-2xs text-umbra-muted">{districts.length} districts</span>
        )}
      </div>
      <h3 id="district-list-title" className="mt-1 font-display text-lg text-umbra-lilac">
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
          {districts.map((d) => (
            <li
              key={d.name}
              className="flex items-center justify-between rounded-xl border border-umbra-line bg-white/[.02] px-3 py-2"
            >
              <span className="truncate text-xs text-umbra-lilac" title={d.name}>
                {d.name}
              </span>
              <span className="shrink-0 rounded-full border border-umbra-purple/30 bg-umbra-purple/10 px-2 py-0.5 text-2xs font-semibold text-umbra-purple">
                Lv {d.districtHallLevel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { CapitalSummaryView } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Clan Capital summary card — compact version.
 * Shows Hall level, Capital points, district count, and Capital league.
 * See docs/concept/05-dashboard.md §3.
 */
export function CapitalSummaryCard({
  capital,
}: {
  capital: CapitalSummaryView;
}) {
  return (
    <section
      className="lunar-card lunar-hover flex h-full flex-col p-5"
      aria-labelledby="capital-title"
    >
      <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
        Clan capital
      </p>
      <h3
        id="capital-title"
        className="mt-1 font-display text-lg text-umbra-moonlight"
      >
        Capital overview
      </h3>

      {/* 3 core stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat
          label="Hall level"
          value={capital.capitalHallLevel ?? <UnavailableValue />}
        />
        <MiniStat
          label="Capital pts"
          value={capital.capitalPoints ?? <UnavailableValue />}
        />
        <MiniStat
          label="Districts"
          value={capital.districtCount ?? <UnavailableValue />}
        />
      </div>

      {/* League — centered, fills remaining space */}
      <div className="lunar-tile mt-3 flex flex-1 items-center justify-center !p-3">
        <div className="text-center">
          <p className="font-mono text-micro uppercase tracking-wider text-umbra-faint">
            Capital league
          </p>
          <p className="mt-1 font-display text-lg font-bold text-umbra-moonlight">
            {capital.capitalLeague?.name ?? <UnavailableValue />}
          </p>
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="lunar-tile !p-2.5 text-center">
      <p className="font-mono text-micro uppercase tracking-wider text-umbra-faint">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold text-umbra-moonlight">{value}</p>
    </div>
  );
}

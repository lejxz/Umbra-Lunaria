import Link from "next/link";
import type { CapitalSummaryView } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Clan Capital summary card — compact version.
 * Shows Hall level, Capital points, district count, and Capital league.
 * See concept/05-dashboard.md §3.
 */
export function CapitalSummaryCard({
  capital,
}: {
  capital: CapitalSummaryView;
}) {
  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="capital-title"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          Clan capital
        </p>
        <Link
          href="/capital"
          className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted transition hover:text-umbra-lilac"
        >
          Capital →
        </Link>
      </div>
      <h3
        id="capital-title"
        className="mt-1 font-display text-lg text-umbra-lilac"
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
      <div className="mt-3 flex flex-1 items-center justify-center rounded-xl bg-white/[.035] p-3">
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            Capital league
          </p>
          <p className="mt-1 font-display text-lg font-bold text-umbra-lilac">
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
    <div className="rounded-lg bg-white/[.035] p-2.5 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
    </div>
  );
}

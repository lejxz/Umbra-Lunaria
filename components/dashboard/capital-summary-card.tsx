import Link from "next/link";
import type { CapitalSummaryView } from "@/lib/view-models/dashboard";
import { Badge, UnavailableValue } from "@/components/ui";

/**
 * Clan Capital summary card. Shows Capital Hall level, Capital points,
 * Capital league, district count, and the latest district snapshot. See
 * concept/05-dashboard.md §3.
 */
export function CapitalSummaryCard({
  capital,
}: {
  capital: CapitalSummaryView;
}) {
  return (
    <section className="glass rounded-2xl p-5" aria-labelledby="capital-title">
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
      <h3 id="capital-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Capital overview
      </h3>

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

      {capital.capitalLeague && (
        <div className="mt-3">
          <Badge tone="muted">{capital.capitalLeague.name}</Badge>
        </div>
      )}

      {/* District list */}
      {capital.districts && capital.districts.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {capital.districts.slice(0, 8).map((d) => (
            <div
              key={d.name}
              className="rounded-lg bg-white/[.035] px-3 py-2"
            >
              <p className="truncate text-xs text-umbra-muted">{d.name}</p>
              <p className="mt-0.5 text-sm font-semibold text-umbra-lilac">
                Lv {d.districtHallLevel}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-umbra-muted">
          District data pending first daily batch
        </p>
      )}
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
      <p className="mt-1 font-display text-xl font-bold text-white">{value}</p>
    </div>
  );
}

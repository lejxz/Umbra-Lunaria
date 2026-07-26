import type { WarRecordView } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * All-time war record card. Shows API-provided wins, ties, losses, current
 * win streak, and computed win rate. Compact layout — no empty space.
 * See docs/concept/05-dashboard.md §2.
 */
export function WarRecordCard({ record }: { record: WarRecordView }) {
  const winRatePct =
    record.winRate !== null ? `${(record.winRate * 100).toFixed(0)}%` : null;

  return (
    <section
      className="lunar-card lunar-hover flex h-full flex-col p-5"
      aria-labelledby="war-record-title"
    >
      <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
        All-time record
      </p>
      <h3
        id="war-record-title"
        className="mt-1 font-display text-lg text-umbra-moonlight"
      >
        War record
      </h3>

      {/* W / T / L / Streak — 4 compact stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Wins" value={record.wins} tone="success" />
        <Stat label="Ties" value={record.ties} tone="muted" />
        <Stat label="Losses" value={record.losses} tone="danger" />
        <Stat label="Streak" value={record.winStreak} tone="brand" />
      </div>

      {/* Win rate — centered, prominent */}
      <div className="lunar-tile mt-3 flex flex-1 items-center justify-center !p-3">
        <div className="text-center">
          <p className="font-mono text-micro uppercase tracking-wider text-umbra-faint">
            Win rate
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-umbra-moonlight">
            {winRatePct ?? <UnavailableValue />}
          </p>
          {record.winRate === null && (
            <p className="mt-1 text-label text-umbra-faint">
              Requires W/T/L from API
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "success" | "muted" | "danger" | "brand";
}) {
  const color =
    tone === "success"
      ? "text-emerald-400"
      : tone === "danger"
        ? "text-red-400"
        : tone === "brand"
          ? "text-umbra-purple"
          : "text-umbra-muted";

  return (
    <div className="lunar-tile !p-2.5 text-center">
      <p className="font-mono text-micro uppercase tracking-wider text-umbra-faint">
        {label}
      </p>
      <p className={`mt-1 font-display text-lg font-bold ${color}`}>
        {value ?? <UnavailableValue />}
      </p>
    </div>
  );
}

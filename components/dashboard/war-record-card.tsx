import Link from "next/link";
import type { WarRecordView } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * All-time war record card. Shows API-provided wins, ties, losses, and current
 * win streak. Win rate is computed only when all three totals are available and
 * the denominator is positive — otherwise it renders Unavailable. See
 * concept/05-dashboard.md §2.
 */
export function WarRecordCard({ record }: { record: WarRecordView }) {
  const winRatePct =
    record.winRate !== null ? `${(record.winRate * 100).toFixed(0)}%` : null;

  return (
    <section className="glass rounded-2xl p-5" aria-labelledby="war-record-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          All-time record
        </p>
        <Link
          href="/war"
          className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted transition hover:text-umbra-lilac"
        >
          War center →
        </Link>
      </div>
      <h3 id="war-record-title" className="mt-1 font-display text-lg text-umbra-lilac">
        War record
      </h3>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Wins" value={record.wins} tone="success" />
        <Stat label="Ties" value={record.ties} tone="muted" />
        <Stat label="Losses" value={record.losses} tone="danger" />
        <Stat label="Streak" value={record.winStreak} tone="brand" />
      </div>

      <div className="mt-4 rounded-xl bg-white/[.035] p-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
          Win rate
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-white">
          {winRatePct ?? <UnavailableValue />}
        </p>
        {record.winRate === null && (
          <p className="mt-1 text-xs text-umbra-muted">
            Requires wins, ties, and losses from the API
          </p>
        )}
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
    <div className="rounded-lg bg-white/[.035] p-2.5 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className={`mt-1 font-display text-xl font-bold ${color}`}>
        {value ?? <UnavailableValue />}
      </p>
    </div>
  );
}

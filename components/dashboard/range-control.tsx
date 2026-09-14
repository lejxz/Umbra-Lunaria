"use client";

import { useCallback } from "react";

/**
 * Custom date-range control — shared by the dashboard's custom-window panels
 * (donation analytics since Phase 3.2, membership timeline since Phase 4).
 *
 * Purely presentational: the owning panel keeps the range state and the
 * fetch; this control renders the two date inputs, quick chips, the
 * active-range pill, and inline errors — one look everywhere.
 *
 * Day keys are clan-timezone CALENDAR DAYS ("YYYY-MM-DD"), same contract as
 * lib/time/windows.ts computeCustomWindow.
 */

const TZ = "Asia/Manila"; // clan timezone — day keys for inputs & chips

/** "YYYY-MM-DD" for an instant in the clan timezone (client-side Intl). */
export function dayKeyInTz(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** First day of the month `offsetMonths` from now (0 = this month). */
export function firstOfMonth(offsetMonths: number): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // Noon UTC keeps the clan-TZ date stable for any real timezone.
  return dayKeyInTz(new Date(Date.UTC(y, m + offsetMonths, 1, 12, 0, 0)));
}

/** Last day of the month `offsetMonths` from now (0 = this month). */
export function lastOfMonth(offsetMonths: number): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return dayKeyInTz(new Date(Date.UTC(y, m + offsetMonths + 1, 0, 12, 0, 0)));
}

/** Day key `days` days before today (inclusive span of `days` days). */
export function daysAgoKey(days: number): string {
  const now = new Date();
  return dayKeyInTz(new Date(now.getTime() - days * 86_400_000));
}

/** "Jul 1 – Jul 31" from two ISO day keys (the active-range pill). */
export function formatRange(from: string, to: string): string {
  const fmt = (day: string) => {
    const d = new Date(`${day}T12:00:00Z`);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: TZ,
    });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

/** The ready pill's payload — the resolved range currently on screen. */
export interface AppliedRange {
  from: string;
  to: string;
  dayCount: number;
}

export function RangeControl({
  fromInput,
  toInput,
  todayKey,
  onFromChange,
  onToChange,
  onApply,
  onClear,
  status,
  applied,
  error,
}: {
  fromInput: string;
  toInput: string;
  todayKey: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Validate + fetch the [fromInput, toInput] range (parent owns the
   *  fetch). Chip clicks pass their day keys explicitly — React state
   *  updates are async, so a chip-selected range can't rely on the inputs'
   *  state having landed yet. */
  onApply: (from?: string, to?: string) => void;
  /** Deselect the custom range and return to the preset tabs. */
  onClear: () => void;
  status: "idle" | "loading" | "ready" | "error";
  applied: AppliedRange | null;
  error: string | null;
}) {
  const chips = [
    { label: "This month", from: firstOfMonth(0), to: todayKey },
    { label: "Last month", from: firstOfMonth(-1), to: lastOfMonth(-1) },
    { label: "Last 90d", from: daysAgoKey(89), to: todayKey },
  ];

  // Selecting a chip fills the inputs AND applies — one intent, one action.
  const applyChip = useCallback(
    (from: string, to: string) => {
      onFromChange(from);
      onToChange(to);
      onApply(from, to);
    },
    [onFromChange, onToChange, onApply],
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={fromInput}
          max={todayKey}
          onChange={(e) => onFromChange(e.target.value)}
          aria-label="Range start (clan day)"
          className="focus-ring rounded-lg border border-umbra-line/50 bg-white/[.03] px-2 py-1 font-mono text-2xs text-umbra-lilac [color-scheme:dark]"
        />
        <span className="text-umbra-muted/50">→</span>
        <input
          type="date"
          value={toInput}
          max={todayKey}
          onChange={(e) => onToChange(e.target.value)}
          aria-label="Range end (clan day)"
          className="focus-ring rounded-lg border border-umbra-line/50 bg-white/[.03] px-2 py-1 font-mono text-2xs text-umbra-lilac [color-scheme:dark]"
        />
        <button
          type="button"
          disabled={!fromInput || !toInput || status === "loading"}
          onClick={() => onApply()}
          className="focus-ring rounded-lg border border-umbra-purple/40 bg-umbra-purple/10 px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "loading" ? "Loading…" : "Apply"}
        </button>
      </div>

      {/* Quick ranges */}
      <div className="flex items-center gap-1">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => applyChip(chip.from, chip.to)}
            className="focus-ring rounded-full border border-umbra-line bg-white/[.03] px-2 py-0.5 font-mono text-micro uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/40 hover:text-umbra-lilac"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Active custom range pill */}
      {status === "ready" && applied && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-2.5 py-0.5 font-mono text-micro font-semibold uppercase tracking-wider text-umbra-purple">
          {formatRange(applied.from, applied.to)} · {applied.dayCount}d
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear custom range"
            className="ml-0.5 text-umbra-purple/70 transition hover:text-umbra-lilac"
          >
            ✕
          </button>
        </span>
      )}
      {status === "error" && error && (
        <span className="text-2xs text-red-400">{error}</span>
      )}
    </div>
  );
}

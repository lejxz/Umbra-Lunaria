import type { ReactNode } from "react";
import { LoaderCircle, RotateCw, TriangleAlert } from "lucide-react";

/**
 * State primitives — the small display atoms used across the dashboard,
 * member detail sheet, and any surface that has to communicate a value with a
 * source, a loading indicator, an error, or an explicit "this is unavailable"
 * state. See concept/05-dashboard.md §Interaction and state rules:
 *
 *   3. Missing values use an em dash or an explicit unavailable label, never a
 *      fake zero.
 *
 * All primitives are server components (no client interactivity required).
 */

type MetricSource = "api" | "tracked" | "derived";

const sourceMeta: Record<MetricSource, { label: string; tone: string }> = {
  api: {
    label: "API",
    tone: "border-umbra-purple/30 bg-umbra-purple/15 text-umbra-purple",
  },
  tracked: {
    label: "Tracked",
    tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  },
  derived: {
    label: "Derived",
    tone: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  },
};

/**
 * MetricState — a labeled metric with an optional source badge. Use this
 * anywhere the dashboard surfaces a single number that came from the CoC API
 * ("api"), was reconstructed from snapshots ("tracked"), or was computed from
 * other fields ("derived"). The source badge keeps the user honest about what
 * they are looking at — see concept/05-dashboard.md §2 (win-rate is derived).
 */
export function MetricState({
  label,
  value,
  source,
}: {
  label: string;
  value: ReactNode;
  source?: MetricSource;
}) {
  const meta = source ? sourceMeta[source] : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-umbra-muted">
          {label}
        </span>
        {meta && (
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.tone}`}
            title={`Source: ${meta.label}`}
          >
            {meta.label}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-umbra-lilac">{value}</div>
    </div>
  );
}

/**
 * LoadingState — a spinner + optional label, styled for the dark moonlit
 * surface. Use as a panel placeholder while a server fetch is in flight.
 */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-umbra-line bg-umbra-surface/60 px-5 py-4 text-umbra-muted"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-umbra-purple" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/**
 * ErrorState — an inline error message with an optional retry button. Use for
 * non-fatal fetch failures where the parent panel can keep rendering but a
 * single source is degraded.
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-400/5 px-5 py-4 text-umbra-lilac"
      role="alert"
      aria-live="assertive"
    >
      <TriangleAlert
        className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
        aria-hidden
      />
      <div className="flex-1">
        <p className="text-sm leading-5 text-umbra-lilac">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full border border-umbra-line bg-umbra-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/50 hover:text-umbra-lilac"
          >
            <RotateCw className="h-3 w-3" aria-hidden />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * UnavailableValue — the "never fake a zero" primitive from
 * concept/05-dashboard.md §3. Renders an em dash and an optional muted label
 * so a missing CoC API value reads clearly as "unknown" rather than 0.
 */
export function UnavailableValue({ label = "Unavailable" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 text-umbra-muted"
      title={label}
      aria-label={label}
    >
      <span aria-hidden className="text-lg leading-none">—</span>
      <span className="font-mono text-[10px] uppercase tracking-wider">
        {label}
      </span>
    </span>
  );
}

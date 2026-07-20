/**
 * Pure war-record view-model assembly.
 *
 * `getWarRecord` takes a (possibly null) `DashboardClan` and returns the
 * `WarRecordView` shape that the dashboard renders. The only non-trivial
 * logic is the win-rate computation, which is delegated to `computeWinRate`
 * so the "never fake a zero" rule (concept/00-overview.md "Product contract")
 * is enforced — `winRate` is `null` when any of wins/ties/losses is `null`
 * (private war log / missing API field) or when the denominator is 0 (no
 * wars recorded yet).
 *
 * Extracted from `lib/db/queries.ts` (Step 1.1.C) so it can be unit-tested
 * without a DATABASE_URL. `queries.ts` re-exports it for API stability —
 * callers should keep importing from `@/lib/db/queries`.
 *
 * Pure: no DB, no React, no I/O. Inputs in, view model out.
 */

import type { DashboardClan, WarRecordView } from "@/lib/view-models/dashboard";
import { computeWinRate } from "@/lib/scoring/war-metrics";

/**
 * Build a `WarRecordView` from a `DashboardClan` (or null).
 *
 * Returns a fully-null view when `clan` is null — the dashboard renders an
 * explicit `Unavailable` state for every field in that case.
 */
export function getWarRecord(clan: DashboardClan | null): WarRecordView {
  return {
    wins: clan?.warWins ?? null,
    ties: clan?.warTies ?? null,
    losses: clan?.warLosses ?? null,
    winStreak: clan?.warWinStreak ?? null,
    winRate: computeWinRate(
      clan?.warWins ?? null,
      clan?.warTies ?? null,
      clan?.warLosses ?? null,
    ),
  };
}

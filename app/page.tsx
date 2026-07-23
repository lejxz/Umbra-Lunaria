import { getDashboard } from "@/lib/db/queries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ErrorState } from "@/components/ui/state-primitives";

/**
 * Dashboard page — the clan's command center.
 *
 * This is a server component. It calls getDashboard() (which runs ~20 parallel
 * DB queries) and passes the typed DashboardData to the client DashboardShell.
 * The shell manages 24h/7d/30d tab state and the member-detail sheet locally,
 * so tab switches are instant with no API calls or page reloads.
 *
 * ISR caching (concept/04 §"Page-view caching"): the page revalidates every
 * 300s (5 min, matching the poll cadence). Between revalidations, Vercel
 * serves the cached HTML from the edge — 0 DB queries, 0 Neon CU. Only the
 * background revalidation triggers a DB hit. The war refresh button and the
 * ingest route both call revalidatePath("/") to bust the cache immediately
 * after a fresh capture.
 *
 * See concept/05-dashboard.md for the full specification and
 * concept/12 Step 1.2 for the implementation plan.
 */
export const revalidate = 300; // 5 min — matches poll cadence

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboard();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
        <header className="mb-8">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Command center / overview
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-lilac sm:text-4xl">
            The clan observatory
          </h1>
        </header>
        <ErrorState
          message="The dashboard couldn&apos;t load."
        />
        <p className="mt-4 max-w-xl text-sm text-umbra-muted">
          {message}. This usually means the database isn&apos;t reachable or the
          ingest hasn&apos;t populated the clan data yet. Try again in a few minutes,
          or trigger a manual poll from GitHub Actions.
        </p>
      </div>
    );
  }

  return <DashboardShell data={data} />;
}

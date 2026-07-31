import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import { HallOfFameShell } from "@/components/hall-of-fame/hall-of-fame-shell";
import { getHallOfFamePage } from "@/lib/db/hall-of-fame-queries";

/**
 * Hall of Fame — all-time clan records.
 *
 * Two sections:
 *   1. All-Time Legends — the 5 cached award leaderboards from
 *      hall_of_fame_records (computed by the daily batch).
 *   2. Live Records — record categories computed on-demand from raw tables
 *      (raid gold, raid medals, war attacks, perfect attendance, fastest
 *      3-star, longest tenure).
 *
 * Server component: all reads happen here. The client shell owns the
 * member-detail-sheet state. ISR-cached at 5 min — matches the dashboard and
 * the other read-only pages.
 *
 * See docs/concept/05-dashboard.md §"Hall of Fame" + docs/concept/12.
 */
export const revalidate = 3600; // 1 hr — records change daily at most

export default async function HallOfFamePage() {
  let data;
  try {
    data = await getHallOfFamePage();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold section="Hall of Fame" title="Hall of Fame">
        <ErrorState message="The Hall of Fame couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  return <HallOfFameShell data={data} />;
}

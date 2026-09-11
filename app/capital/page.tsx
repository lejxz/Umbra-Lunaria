import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import { CapitalShell } from "@/components/capital/capital-shell";
import { getCapitalPage } from "@/lib/db/capital-queries";

/**
 * Clan Capital page — current overview, district list, district upgrade
 * timeline, raid-weekend countdown timer, and raid-weekend history.
 * See docs/concept/08.
 *
 * ISR caching: the exported revalidate is 1h (capital changes weekly). Note
 * that the raid timer's fetch inside getCapitalPage() uses its own
 * `revalidate: 300`, and Next takes the minimum fetch-level revalidate as
 * the route's effective period — so this page effectively revalidates at
 * 5 min while the timer is the only live-updating section.
 */
export const revalidate = 3600; // 1 hr — capital changes weekly

export default async function CapitalPage() {
  let data;
  try {
    data = await getCapitalPage();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold section="Capital" title="Clan capital">
        <ErrorState message="The capital page couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold section="Capital" title="Clan capital">
      <CapitalShell data={data} serverNow={Date.now()} />
    </PageScaffold>
  );
}

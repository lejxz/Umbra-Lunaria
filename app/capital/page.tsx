import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import { CapitalShell } from "@/components/capital/capital-shell";
import { getCapitalPage } from "@/lib/db/capital-queries";

/**
 * Clan Capital page — current overview, district list, district upgrade
 * timeline, and a truthful raid-weekend pending state. See concept/08.
 *
 * Server component: all reads happen here (concept/01 "No browser route calls
 * Supercell directly"). The client shell owns the district-filter state.
 */
export default async function CapitalPage() {
  let data;
  try {
    data = await getCapitalPage();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold
        section="Clan capital"
        title="Capital"
        description="Track district growth and raid-weekend contribution over time."
        eyebrow="district observatory"
      >
        <ErrorState message="The capital page couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      section="Clan capital"
      title="Capital"
      description="Track district growth and raid-weekend contribution over time."
      eyebrow="district observatory"
    >
      <CapitalShell data={data} />
    </PageScaffold>
  );
}

import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import { StrategyShell } from "@/components/strategy/strategy-shell";
import { getStrategyPage } from "@/lib/db/strategy-queries";

/**
 * War Strategy — suggested participants + member review list.
 *
 * Pure read-only ranking. No admin, no writes. Uses existing data from
 * members, war_participants, war_attacks, member_snapshots, and the
 * precomputed rushedPercent column.
 *
 * See docs/concept/07-clan-war.md + the strategy page design.
 */
export const revalidate = 600; // 10 min — strategy recomputes on poll but stale is fine

export default async function StrategyPage() {
  let data;
  try {
    data = await getStrategyPage();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold section="Strategy" title="War Strategy">
        <ErrorState message="The strategy page couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  return <StrategyShell data={data} />;
}

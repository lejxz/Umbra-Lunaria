import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import { PlannerShell } from "@/components/planning/planner-shell";
import { getPlanningContext } from "@/lib/planning/planning-context";

/**
 * War planning — administrator-controlled manual roster builder.
 *
 * Server component: fetches the planning context (available members + any
 * active preparation-day war for opponent scouting) and passes it to the
 * client shell, which owns draft state locally. Persistence (save/finalize)
 * is wired to /api/rosters (Step 2.2).
 *
 * See concept/09-war-planning-and-auto-select.md and concept/12 Steps 2.1–2.2.
 */
export const revalidate = 300; // 5-min ISR — matches dashboard/members/capital.

export default async function PlanningPage() {
  let context;
  try {
    context = await getPlanningContext();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold section="Planning" title="War planning">
        <ErrorState message="The planner couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  return <PlannerShell context={context} />;
}

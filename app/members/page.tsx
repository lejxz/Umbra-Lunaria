import { getMemberRoster } from "@/lib/db/member-queries";
import { getMemberActivityScore } from "@/lib/db/queries";
import { MembersShell } from "@/components/members/members-shell";
import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";

/**
 * Members page — Activity Score leaderboard + full clan roster with
 * sortable table, filters, and member detail sheet.
 * See docs/concept/06-members.md.
 *
 * fix A-3 (docs/2026-09-11-priority-fixes.md): this page used to embed the
 * full MemberDetailView for every roster member — a ~50× getMemberDetail
 * fan-out where each call re-ran the full-roster activity-score computation
 * (~51 full-roster scans, 300+ queries, multi-MB payload per render).
 * Member details are now fetched on click via GET /api/members/[tag] —
 * exactly the pattern the dashboard already uses — so the server render is
 * just roster + one activity-score leaderboard (which is withCache'd).
 */
export const revalidate = 3600; // 1 hr — roster/TH/role only change on the daily batch

export default async function MembersPage() {
  let roster;
  try {
    roster = await getMemberRoster();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold
        section="Members"
        title="Members"
      >
        <ErrorState message="The roster couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  const activityScore = await getMemberActivityScore("all");

  return (
    <PageScaffold
      section="Members"
      title="Members"
    >
      <MembersShell
        roster={roster}
        activityScore={activityScore}
      />
    </PageScaffold>
  );
}

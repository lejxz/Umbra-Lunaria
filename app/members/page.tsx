import { getMemberRoster, getMemberDetail } from "@/lib/db/member-queries";
import { MembersRoster } from "@/components/members/members-roster";
import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import type { MemberDetailView } from "@/lib/view-models/members";

/**
 * Members page — full clan roster with sortable table, filters, and
 * member detail sheet. See concept/06-members.md.
 */
export default async function MembersPage() {
  let roster;
  try {
    roster = await getMemberRoster();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold
        section="Roster"
        title="Members"
        description="A clear read on activity, contribution, and war readiness."
        eyebrow="member browser"
      >
        <ErrorState message="The roster couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  // Fetch member details for all retained members (in parallel)
  const detailEntries = await Promise.all(
    roster.entries.map(async (m) => {
      const detail = await getMemberDetail(m.playerTag);
      return [m.playerTag, detail] as const;
    }),
  );

  const memberDetails: Record<string, MemberDetailView> = {};
  for (const [tag, detail] of detailEntries) {
    if (detail) memberDetails[tag] = detail;
  }

  return (
    <PageScaffold
      section="Roster"
      title="Members"
      description="A clear read on activity, contribution, and war readiness."
      eyebrow="member browser"
    >
      <MembersRoster roster={roster} memberDetails={memberDetails} />
    </PageScaffold>
  );
}

import { PageScaffold } from "@/components/page-scaffold";
import { ErrorState } from "@/components/ui/state-primitives";
import { WarShell } from "@/components/war/war-shell";
import { getWarCenter, getWarClanIdentity } from "@/lib/db/war-queries";

/**
 * War Center — current-war hero, roster + attack status, preparation scouting,
 * and war history. See concept/07-clan-war.md.
 *
 * Server component: all reads happen here (concept/01 "No browser route calls
 * Supercell directly"). The client shell owns the member-detail-sheet state and
 * the refresh control. Stale-capture, private-war-log, no-active-war, and
 * refresh-error states are rendered inline by the section components.
 */
export default async function WarPage() {
  let data;
  try {
    data = await getWarCenter();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <PageScaffold
        section="War"
        title="Clan war"
      >
        <ErrorState message="The war center couldn&apos;t load." />
        <p className="mt-4 text-sm text-umbra-muted">{message}</p>
      </PageScaffold>
    );
  }

  const clanIdentity = await getWarClanIdentity().catch(() => null);

  return (
    <PageScaffold
      section="War"
      title="Clan war"
    >
      <WarShell
        data={data}
        clanBadgeUrls={clanIdentity?.badgeUrls ?? null}
        clanName={clanIdentity?.name ?? null}
      />
    </PageScaffold>
  );
}

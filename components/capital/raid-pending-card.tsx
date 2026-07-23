import { EmptyState } from "@/components/ui/empty-state";
import { IconCapital } from "@/components/ui/icons";

/**
 * Raid-weekend pending state (concept/08 §"Raid-weekend history"). Phase 3.1
 * adds completed-season ingestion (`capitalraidseasons` + `capital_contributions`).
 * Until then, this card truthfully says raid history is coming — it does NOT
 * fabricate a leaderboard from lifetime player totals.
 *
 * When `available` is true (Phase 3.1+), this card will be replaced by the
 * full raid-history view.
 */
export function RaidPendingCard({ available }: { available: boolean }) {
  if (available) {
    // Future: Phase 3.1 renders the raid-history view here.
    return null;
  }

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="raid-pending-title">
      <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
        Raid weekends · pending
      </p>
      <h3 id="raid-pending-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Raid-weekend history
      </h3>
      <div className="mt-4">
        <EmptyState
          title="Raid history coming soon"
          description="Completed raid-weekend results, the per-member contribution leaderboard, and participation rates will appear here once raid-season ingestion is active. This page does not fabricate a leaderboard from lifetime player totals."
          icon={<IconCapital className="h-10 w-10" />}
        />
      </div>
      <p className="mt-3 rounded-lg border border-umbra-line bg-white/[.02] px-3 py-2 text-2xs text-umbra-muted">
        The player profile&apos;s <code className="text-umbra-lilac">clanCapitalContributions</code>{" "}
        is a lifetime total — it is shown in member detail, but it is not a
        substitute for a season leaderboard.
      </p>
    </section>
  );
}

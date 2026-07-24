import { EmptyState } from "@/components/ui/empty-state";
import { IconCapital } from "@/components/ui/icons";

/**
 * Raid-weekend history card (concept/08 §"Raid-weekend history"). Phase 3.1
 * adds completed-season ingestion (`capitalraidseasons` + `capital_contributions`).
 *
 * Positioned directly after the overview because raid weekends are the
 * high-value seasonal content users expect to see. Until Phase 3.1 lands,
 * this card truthfully says raid history is coming — it does NOT fabricate a
 * leaderboard from lifetime player totals.
 *
 * When `available` is true (Phase 3.1+), this card will be replaced by the
 * full raid-history view (completed seasons, contribution leaderboard,
 * participation rate, zero-attack list).
 */
export function RaidPendingCard({ available }: { available: boolean }) {
  if (available) {
    // Future: Phase 3.1 renders the raid-history view here.
    return null;
  }

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="raid-history-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Raid weekends
        </p>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-micro font-semibold uppercase tracking-wider text-amber-400">
          Pending
        </span>
      </div>
      <h3 id="raid-history-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Raid-weekend history
      </h3>

      <div className="mt-4 flex flex-1 items-center justify-center py-6">
        <EmptyState
          icon={<IconCapital className="h-10 w-10 text-umbra-purple/40" />}
          title="Coming soon"
          description="Completed raid-weekend results, the per-member contribution leaderboard, and participation rates will appear here once raid-season ingestion is active."
        />
      </div>

      <p className="mt-3 text-2xs text-umbra-muted/60">
        The player profile&apos;s{" "}
        <code className="text-umbra-lilac">clanCapitalContributions</code> is a
        lifetime total — shown in member detail, but not a season leaderboard.
      </p>
    </section>
  );
}

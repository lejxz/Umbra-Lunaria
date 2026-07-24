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
    <section className="glass relative flex flex-col overflow-hidden rounded-2xl p-6 sm:p-8" aria-labelledby="raid-history-title">
      {/* Background glow for the pending state */}
      <div className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-amber-500/10 blur-[80px]" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Raid weekends
          </p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-micro font-semibold uppercase tracking-wider text-amber-400">
              Pending Sync
            </span>
          </div>
        </div>
        <h3 id="raid-history-title" className="mt-1 font-display text-2xl font-medium tracking-wide text-umbra-lilac sm:text-3xl">
          Raid-weekend history
        </h3>

        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent px-6 py-12 text-center transition-colors hover:border-amber-500/50 hover:from-amber-500/10">
          <div className="mb-4 flex justify-center text-amber-500/40 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <IconCapital className="h-14 w-14" aria-hidden />
          </div>
          <p className="font-display text-xl font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
            Awaiting Deployment
          </p>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-umbra-muted">
            Completed raid-weekend results, the per-member contribution leaderboard,
            and participation rates will appear here once raid-season ingestion is active.
          </p>
        </div>

        <p className="mt-4 text-center text-label text-umbra-muted/50">
          The player profile's <code className="rounded bg-white/5 px-1 py-0.5 text-umbra-lilac">clanCapitalContributions</code> is a lifetime total, not a season leaderboard.
        </p>
      </div>
    </section>
  );
}

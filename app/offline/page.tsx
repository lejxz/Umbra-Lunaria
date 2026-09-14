import Link from "next/link";

/**
 * Offline shell — the service worker's final fallback for HTML navigations
 * when the network is unreachable and the requested page was never cached
 * (docs/2026-09-11-implementation-plan.md, Phase 5).
 *
 * This page is fully static (no dynamic APIs, no revalidate): it is
 * precached by public/sw.js at install time, so it must render without a
 * database. The root layout's poll-status fetch runs at build time only —
 * which is exactly the honest thing to show offline: build-time "last
 * visit" data, with the disclaimer below.
 *
 * Data honesty contract: the SW never caches /api/*, and HTML is
 * network-first — a client only lands here (or on a cached page) when the
 * network is genuinely down. This page states that plainly instead of
 * pretending to be current.
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Offline
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-lilac sm:text-4xl">
          You are offline — showing your last visit
        </h1>
      </header>

      <section className="glass rounded-2xl p-6 sm:p-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-umbra-muted"
            />
            <div>
              <p className="font-medium text-umbra-lilac">
                The clan dashboard can&apos;t reach the network right now.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-umbra-muted">
                Pages you visited while online may still open from this device —
                what you see is the version from your last visit, not live
                data. Anything you never opened needs a connection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-umbra-muted"
            />
            <div>
              <p className="font-medium text-umbra-lilac">
                Live values are never served offline.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-umbra-muted">
                The offline shell deliberately does not cache API responses:
                war states, activity and freshness counters are only shown
                when they can actually be checked against the server. No
                stale numbers pretending to be current.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/"
              className="rounded-full border border-umbra-line px-4 py-2 font-mono text-label uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/50 hover:text-umbra-lilac"
            >
              Try the dashboard
            </Link>
            {/* Plain anchor (not next/link): a same-URL navigation is a full
                reload in every browser, which re-runs the SW's network-first
                fetch — and keeps this page zero-JS, server-rendered static. */}
            <a
              href="/offline"
              className="rounded-full border border-umbra-line px-4 py-2 font-mono text-label uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/50 hover:text-umbra-lilac"
            >
              Retry connection
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

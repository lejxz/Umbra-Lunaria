import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clans } from "@/lib/db/schema";
import { clanConfig } from "@/config/clan.config";

/**
 * GET /api/health — data-freshness watchdog endpoint.
 *
 * Born from the 2026-10-01 outage (docs/2026-10-02-ingest-outage-watchdog.md):
 * during a Supabase us-east-1 latency incident the third-party cron service's
 * polls failed for hours while the deployment looked perfectly healthy — the
 * nightly smoke checks ISR pages, which serve cached content regardless of
 * ingest health, and cron-job.org failure emails are easy to miss. Nothing in
 * the system answered the one question that matters: "when did data last
 * actually flow?"
 *
 * This endpoint answers it. It reads the same source the ingest route writes
 * on every successful light poll — `clans.last_polled_at` — and reports how
 * old the newest data is:
 *
 *   - HTTP 200 `{ ok: true, stale: false, ... }` — fresh (poll age ≤ 30 min,
 *     i.e. the 5-minute light poll has missed at most 6 runs)
 *   - HTTP 503 `{ ok: false, stale: true, ... }` — STALE: ingest has not
 *     succeeded within the threshold, or the database is unreachable
 *
 * The 503-on-stale contract means ANY plain HTTP monitor (uptime checkers,
 * the `watchdog.yml` GitHub Actions workflow, a browser) detects ingest death
 * without knowing anything about the pipeline. The response is intentionally
 * public: it exposes only poll timestamps, never counts, tags, or secrets.
 *
 * Consumed by .github/workflows/watchdog.yml every 30 minutes.
 */

export const dynamic = "force-dynamic";

/** Light poll runs every 5 min; 30 min = 6 consecutive missed polls. */
const STALE_AFTER_SECONDS = 30 * 60;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  try {
    const [clan] = await db
      .select({
        lastPolledAt: clans.lastPolledAt,
        lastDailyBatchAt: clans.lastDailyBatchAt,
      })
      .from(clans)
      .where(eq(clans.clanTag, clanConfig.clanTag))
      .limit(1);

    if (!clan || !clan.lastPolledAt) {
      return NextResponse.json(
        {
          ok: false,
          stale: true,
          reason: "no successful poll has ever been recorded for this clan",
          staleAfterSeconds: STALE_AFTER_SECONDS,
        },
        { status: 503, headers: NO_STORE },
      );
    }

    const ageSeconds = Math.max(
      0,
      Math.floor((Date.now() - clan.lastPolledAt.getTime()) / 1000),
    );
    const stale = ageSeconds > STALE_AFTER_SECONDS;

    return NextResponse.json(
      {
        ok: !stale,
        stale,
        ageSeconds,
        staleAfterSeconds: STALE_AFTER_SECONDS,
        lastPolledAt: clan.lastPolledAt.toISOString(),
        lastDailyBatchAt: clan.lastDailyBatchAt
          ? clan.lastDailyBatchAt.toISOString()
          : null,
      },
      { status: stale ? 503 : 200, headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stale: true,
        reason:
          error instanceof Error
            ? `database unreachable: ${error.message}`
            : "database unreachable",
        staleAfterSeconds: STALE_AFTER_SECONDS,
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

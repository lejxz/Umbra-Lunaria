import { NextRequest, NextResponse } from "next/server";
import { getCustomAnalytics } from "@/lib/db/queries";

/**
 * GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Custom date-range donation analytics (Phase 3.2 — F11): totals, a daily
 * timeline, and the donor/receiver leaderboards over a user-chosen day range.
 * "How did we do last CWL / last month / since the tracker started" resolve
 * to a single request.
 *
 * `from`/`to` are clan-timezone CALENDAR DAYS (strict ISO "YYYY-MM-DD"):
 * validated in lib/time/windows.ts computeCustomWindow — from ≤ to, `to`
 * not in the future, span ≤ 366 days, boundaries aligned to clan-TZ
 * midnights. The window covers the FULL last day.
 *
 * Dynamic by design (no ISR cost); results are withCache'd per resolved day
 * pair for 5 minutes server-side, so range-scanning abuse collapses to one
 * query per pair per TTL window.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query parameters `from` and `to` (YYYY-MM-DD) are required." },
      { status: 400 },
    );
  }

  try {
    const result = await getCustomAnalytics(from, to);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

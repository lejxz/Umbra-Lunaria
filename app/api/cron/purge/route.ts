import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { computeCheckpoints } from "@/lib/ingest/checkpoints";
import { runPurge } from "@/lib/ingest/run-purge";

/**
 * GET /api/cron/purge
 * Triggered by Vercel Cron once a day (vercel.json, `0 18 * * *` = 02:00 AM
 * Asia/Manila). Runs 2 hours after the daily batch (00:00 PHT on the
 * third-party cron service) to guarantee checkpoints are computed before
 * pruning.
 *
 * As a safety net, this route ALSO re-computes checkpoints before pruning —
 * in case the daily batch failed or was delayed.
 *
 * CRON_SECRET must be set as a Vercel environment variable.
 *
 * The purge's DB passes live in lib/ingest/run-purge.ts (extracted 2026-09-14
 * so the SQL is integration-testable against a disposable Postgres — see
 * tests/integration/db.test.ts). In order:
 *
 * 0. Safety checkpoint: re-compute cumulative totals from ALL snapshots
 *    (in case the daily batch didn't run). Pruning is ABORTED when this
 *    fails — old snapshots are the only source of lifetime totals, and
 *    pruning without checkpoints would corrupt HoF.
 *
 * 1. Departed-member purge: delete members whose purge_at has passed + their
 *    snapshots + unit levels. membership_events kept (immutable log).
 *
 * 2. Intra-day snapshot pruning (>7 days): the delta-chain +
 *    activity-evidence preserving rule (fix B-2 + Phase 1 rule 5 — the SQL
 *    translation of the pure, fuzz-tested lib/ingest/purge-retention.ts).
 *
 * 3. Capital district snapshot pruning (>90 days).
 *
 * 4. Old backfill war pruning (>365 days, no snapshot).
 *
 * 5. warSnapshot JSONB nulling (>90 days, warEnded).
 *
 * 6. Departed-member snapshot safety net (>30 days departed).
 *
 * 7. DB size monitoring (best-effort).
 *
 * NOT pruned (by design):
 *   - membership_events: immutable log, tiny.
 *   - war_attacks: small, referenced by HoF Vanguard + attack distribution.
 *   - war_participants: small, referenced by member war history.
 *   - hall_of_fame_records: 5 rows per award, overwritten not accumulated.
 *   - cwl_seasons: ~12/year, tiny.
 *   - Daily last-of-day snapshots AND activity-flagged snapshots: kept
 *     forever — together they preserve the donation-delta chain AND the
 *     day-grain activity evidence (war attacks, donations, XP gains) through
 *     and beyond the 30-day heatmap window. The checkpoint columns on members
 *     cover the lifetime totals that would have been computed from the
 *     deleted intra-day snapshots.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── 0. Safety checkpoint re-computation ──
  try {
    await computeCheckpoints();
  } catch {
    // If checkpoint fails, DON'T prune — old snapshots are the only source
    // of lifetime totals. Pruning without checkpoints would corrupt HoF.
    return NextResponse.json(
      { ok: false, error: "checkpoint computation failed — pruning aborted" },
      { status: 500 },
    );
  }

  // ── Passes 1–7 (lib/ingest/run-purge.ts) ──
  const now = new Date();
  let result;
  try {
    result = await runPurge(now);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown purge error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  // Bust only the dashboard page — not the entire layout. The purge runs daily
  // and other pages have 1-hr ISR which is fine for pruned data. (docs log 116)
  revalidatePath("/");

  return NextResponse.json({ ok: true, ...result });
}

/**
 * scripts/db-freshness.ts — ingest outage diagnosis (read-only).
 * docs/2026-10-02-ingest-outage-watchdog.md.
 *
 * Answers "is data flowing, and if it stopped, when?" directly from the
 * database — no Vercel logs or cron-service dashboard needed:
 *
 *   1. Current freshness — clans.last_polled_at vs. now (the same source
 *      /api/health reads).
 *   2. Light-poll cadence per hour over the window — an outage shows up as
 *      hours below the healthy baseline (polls-per-hour × roster size, plus
 *      the daily-batch hour's extra run).
 *   3. Daily-capture presence per day (career + capital district snapshots)
 *      — whether the daily batch ran and captured.
 *   4. War sync recency.
 *
 * Usage:
 *   DATABASE_URL=postgres://... bun run scripts/db-freshness.ts [days]
 *
 * Read-only and safe to run at any time. The DATABASE_URL is supplied via
 * the environment, never hardcoded (same variable `lib/db` reads). The day
 * window defaults to 4 and is clamped to 1–90.
 */

import { sql } from "drizzle-orm";
import { db } from "../lib/db";

const requestedDays = Number(process.argv[2] ?? "4");
if (!Number.isFinite(requestedDays) || requestedDays < 1 || requestedDays > 90) {
  throw new Error("days argument must be a number between 1 and 90");
}
const window = sql.raw(`interval '${Math.floor(requestedDays)} days'`);

function ts(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? "(null)" : String(value);
}

function printRows(rows: Record<string, unknown>[]) {
  const first = rows[0];
  if (!first) {
    console.log("  (no rows)");
    return;
  }
  const keys = Object.keys(first);
  for (const row of rows) {
    console.log("  " + keys.map((k) => `${k}=${ts(row[k])}`).join(" | "));
  }
}

async function run(label: string, query: ReturnType<typeof sql>) {
  console.log(`\n### ${label}`);
  const result = await db.execute(query);
  printRows((result.rows ?? []) as Record<string, unknown>[]);
}

await run(
  "DB clock + clan poll freshness",
  sql`SELECT now() AS dbnow,
        (SELECT max(last_polled_at) FROM clans) AS last_polled,
        (SELECT max(last_daily_batch_at) FROM clans) AS last_daily_batch`,
);

await run(
  "member_snapshots: hourly cadence (healthy hours = 12 polls × roster)",
  sql`SELECT date_trunc('hour', captured_at) AS hour,
        count(*) AS rows,
        count(DISTINCT player_tag) AS members
      FROM member_snapshots
      WHERE captured_at > now() - ${window}
      GROUP BY 1 ORDER BY 1`,
);

await run(
  "member_snapshots: totals",
  sql`SELECT max(captured_at) AS max_captured,
        count(*) AS total_rows,
        count(DISTINCT player_tag) AS distinct_members
      FROM member_snapshots`,
);

await run(
  "career snapshots: daily capture presence",
  sql`SELECT date(captured_at) AS day,
        count(*) AS rows,
        count(DISTINCT player_tag) AS members
      FROM member_career_snapshots
      WHERE captured_at > now() - ${window}
      GROUP BY 1 ORDER BY 1`,
);

await run(
  "capital district snapshots: daily capture presence",
  sql`SELECT date(captured_at) AS day, count(*) AS rows
      FROM capital_district_snapshots
      WHERE captured_at > now() - ${window}
      GROUP BY 1 ORDER BY 1`,
);

await run(
  "wars: sync recency",
  sql`SELECT max(end_time) AS max_end,
        max(last_synced_at) AS max_synced,
        count(*) AS total_wars
      FROM wars`,
);

process.exit(0);

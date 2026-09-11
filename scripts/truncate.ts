/**
 * DANGER — dev/recovery tool: drops the hall_of_fame_records table.
 *
 * Guards (docs/2026-09-11-priority-fixes.md, fix A-2):
 *   1. Refuses to run when NODE_ENV=production.
 *   2. Requires an explicit `--confirm-drop-hof` acknowledgement flag.
 *
 * Note: this is no longer irreversible — the 0002_hall_of_fame migration
 * (now recorded in the journal) recreates the table, and the daily batch's
 * records-updater repopulates it. But a careless drop still takes the HoF
 * page dark until the next daily batch, so the guards stay.
 */
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to drop hall_of_fame_records: NODE_ENV=production.",
  );
  process.exit(1);
}

if (!process.argv.includes("--confirm-drop-hof")) {
  console.error(
    "This script DROPs hall_of_fame_records.\n" +
      "Pass --confirm-drop-hof to proceed (dev/recovery only).\n" +
      "The table is recreated by drizzle migration 0002 and repopulated by\n" +
      "the daily batch — but the HoF page is dark until that runs.",
  );
  process.exit(1);
}

await db.execute(sql`DROP TABLE IF EXISTS hall_of_fame_records CASCADE`);
console.log(
  "Dropped hall_of_fame_records. Run `bun run db:migrate` to recreate it, " +
    "then `bun run scripts/seed-hof.ts` (or wait for the daily batch) to repopulate.",
);
process.exit(0);

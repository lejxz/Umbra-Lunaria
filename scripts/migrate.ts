/**
 * HTTP-based Drizzle migration runner.
 *
 * `drizzle-kit migrate` uses the `@neondatabase/serverless` connection POOL,
 * which speaks websockets — blocked in some sandboxes. This script uses the
 * `neon()` HTTP client (plain fetch) via `drizzle-orm/neon-http/migrator`,
 * which works everywhere the runtime can do HTTPS. It applies every migration
 * in `./drizzle` idempotently (Drizzle tracks applied migrations in the
 * `__drizzle_migrations` journal table).
 *
 * Run with: `bun run db:migrate` (or `db:push`, which is aliased to the same
 * script so the sandbox dev-tooling's `bun run db:push` step succeeds).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolveDatabaseUrl } from "../lib/env";

async function main() {
  const url = resolveDatabaseUrl();
  const sql = postgres(url, { prepare: false });
  const db = drizzle(sql);

  console.log("→ applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
}

main().catch((err) => {
  console.error("✗ migration failed:", err);
  process.exit(1);
});

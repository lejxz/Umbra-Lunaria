/**
 * Drizzle migration runner using `pg` (node-postgres) + Supabase.
 *
 * Applies every migration in `./drizzle` idempotently (Drizzle tracks applied
 * migrations in the `__drizzle_migrations` journal table). Uses a `pg` Pool
 * with SSL — matches the runtime driver in `lib/db/index.ts`.
 *
 * Run with: `bun run db:migrate` (or `db:push`, aliased to the same script).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "../lib/env";

async function main() {
  const url = resolveDatabaseUrl();
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log("→ applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  await pool.end();
}

main().catch((err) => {
  console.error("✗ migration failed:", err);
  process.exit(1);
});

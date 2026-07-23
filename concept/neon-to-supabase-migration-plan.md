# Neon → Supabase Migration Plan

Status: **completed — 2026-07-23.** All steps have been executed. See the notes below for what changed from the original plan (primarily: a custom `scripts/dump_neon.ts` + `scripts/restore_supabase.ts` pair was used instead of `pg_dump`/`psql` because raw pg tools are blocked in the sandbox environment). The driver was changed to `pg` (node-postgres) via `drizzle-orm/node-postgres` rather than `postgres-js` due to Next.js static build worker compatibility. Polling cadence was also changed from 15 min to 5 min as part of this update.

## Why this is a small change, not a rewrite

Drizzle's query builder (`lib/db/schema.ts`, `lib/db/queries.ts`, every route handler calling `db.select()`/`db.insert()`) is driver-agnostic. None of it references Neon by name. The only thing that actually knows about Neon is the connection layer in one file, `lib/db/index.ts`. `drizzle.config.ts` is already generic too — it just wants a `postgresql://` connection string, not anything Neon-specific.

## Current state (verified, not assumed)

`lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { resolveDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

const connectionString = resolveDatabaseUrl();
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
```

`package.json` dependencies (DB-related): `@neondatabase/serverless ^0.10.0`, `drizzle-orm ^0.44.0`.

`lib/env.ts`'s `resolveDatabaseUrl()` — generic, works with any Postgres URL, has an unrelated sandbox-environment workaround baked in. **No changes needed here.**

`drizzle.config.ts` — already generic (`dialect: "postgresql"`, uses `resolveDatabaseUrl()`). **No changes needed here.**

## Step 1 — Create the Supabase project (external, you do this)

1. New project at supabase.com, note the region (pick one close to Vercel's deployment region to keep latency reasonable).
2. Project Settings → Database → Connection string. Supabase gives you two relevant ones:
   - **Direct connection** (port `5432`) — not what we want; a normal Postgres connection doesn't multiplex well across many concurrent, short-lived Vercel serverless invocations and will exhaust Supabase's connection cap under load.
   - **Transaction pooler** (port `6543`, via PgBouncer) — this is the one to use. Supabase's own docs recommend this exact setup for serverless/edge deployments, so this isn't a workaround, it's the intended path.
3. Copy the pooler connection string. It looks like:
   `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

## Step 2 — Code changes

**`package.json`:**
```diff
- "@neondatabase/serverless": "^0.10.0",
+ "postgres": "^3.4.0",
```
(`postgres` is the package `drizzle-orm/postgres-js` expects — the standard, most common pairing in Drizzle's own docs.)

**`lib/db/index.ts`:**
```diff
- import { drizzle } from "drizzle-orm/neon-http";
- import { neon } from "@neondatabase/serverless";
+ import { drizzle } from "drizzle-orm/postgres-js";
+ import postgres from "postgres";
  import { resolveDatabaseUrl } from "@/lib/env";
  import * as schema from "./schema";

  const connectionString = resolveDatabaseUrl();
- const sql = neon(connectionString);
+ // prepare: false is required for PgBouncer transaction-pooling mode —
+ // prepared statements don't survive across pooled connections.
+ const sql = postgres(connectionString, { prepare: false });

  export const db = drizzle(sql, { schema });
```

That's the entire code diff. `drizzle.config.ts`, `lib/env.ts`, `lib/db/schema.ts`, `lib/db/queries.ts`, and every route handler stay untouched.

## Step 3 — Migrate the schema

Since `drizzle.config.ts` already just points at whatever `DATABASE_URL` resolves to:
```bash
DATABASE_URL="<supabase pooler connection string>" npm run db:migrate
```
This recreates every table from the existing migration files in `drizzle/` against the new Supabase database. Schema only — no data yet.

## Step 4 — Migrate the data

Given the database currently holds only test data (5 members, no real production history yet), this step is low-stakes right now — worth doing this migration *before* real clan history accumulates, not after. Two options depending on how much is actually worth carrying over at this point:

- **Trivial option (recommended given current data volume):** don't bother copying old test rows at all. Let the next scheduled poll populate Supabase fresh.
- **Full option (if there's real data worth keeping by the time this runs):** `pg_dump` from Neon, `psql` restore into Supabase:
  ```bash
  pg_dump "<neon connection string>" --data-only --no-owner --no-privileges > neon_data.sql
  psql "<supabase direct connection string>" < neon_data.sql
  ```
  (Use the *direct* connection for `psql`/`pg_dump`, not the pooler — bulk operations don't need pooling and some pooler modes don't support every command these tools use.)

## Step 5 — Swap environment variables

- **Vercel:** Project → Settings → Environment Variables → update `DATABASE_URL` to the Supabase pooler string. Production and Preview both.
- **Local `.env.local`:** same swap, for anyone developing locally.
- **`.env.example`:** update the comment — currently says *"auto-populated once you add the Neon integration in Vercel"*, which will be wrong. Replace with a note pointing at Supabase project setup instead.
- **Nothing to change on cron-job.org.** Both cron jobs call `/api/ingest` on Vercel — they have no awareness of what's behind that route, so they're unaffected by this migration entirely.

## Step 6 — Verify before trusting it

1. `npm run build` locally with the new `DATABASE_URL` set — confirms the driver swap compiles and the migration step succeeds against the real Supabase instance.
2. Deploy to Vercel, trigger `/api/ingest` manually (same PowerShell `Invoke-WebRequest` approach used to verify the original Neon setup), confirm `"ok":true` and a real `membersPolled` count.
3. Check Supabase's Table Editor — confirm rows actually landed in `members`/`member_snapshots`.
4. Let one real cron-job.org scheduled run go through untouched, then check again — confirms the *automated* path works, not just a manual test.
5. Watch Supabase's usage dashboard for a day or two to confirm the project isn't unexpectedly approaching any limit.

## Step 7 — Update the concept docs

These currently describe Neon specifically and will be stale after migration — update as part of the same change, not as an afterthought:

- `concept/01-tech-stack.md` — the database row in the stack table.
- `concept/03-data-model-and-database.md` — the "Retention and pruning" section currently states Neon's specific free-tier numbers (512 MB storage, 100 CU-hours/month) as the reason pruning exists; needs Supabase's numbers instead, and the reasoning shifts from "avoid CU-hour consumption" to "stay under 500 MB storage" since compute is no longer the constraint.
- `concept/11-config-specification.md` — setup instructions currently say "Neon" wherever database provisioning is described.
- `README.md` — the Vercel/database setup section.

## Rollback plan

Keep the Neon project intact and un-deleted for at least a week after cutover — don't delete it as part of this migration. If something goes wrong post-migration, reverting is: swap `DATABASE_URL` back in Vercel, redeploy. No code revert needed, since the code diff is a driver swap, not a one-way change — reverting `lib/db/index.ts` and `package.json` back to the `neon-http` versions restores the old path exactly.

## What's explicitly out of scope for this migration

- No change to any application logic, query shape, or feature behavior.
- No change to the polling architecture (cron-job.org setup untouched).
- No change to `INGEST_SECRET`/`CRON_SECRET` — those protect the routes, not the database, and Supabase migration doesn't touch route auth at all.

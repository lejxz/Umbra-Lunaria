-- 0006 — Idempotency for capital raid-season ingestion.
-- A unique index on start_time lets the ingest upsert completed raid seasons
-- safely (onConflictDoUpdate on startTime). See concept/08-clan-capital.md
-- and concept/12 Step 3.1. Idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "capital_raid_seasons_start_time_idx"
  ON "capital_raid_seasons" ("start_time");

-- 0007 — Partial unique index for regular wars + cleanup of existing duplicates.
--
-- Root cause of the duplication: /currentwar and /warlog return different
-- endTime values for the same war (scheduled vs actual), so the backfill
-- dedup used to miss live-tracked rows and insert duplicates. The application-
-- level dedup is now fuzzy (±30 min) in lib/ingest/war-sync.ts, but this
-- migration adds a DB-level safety net + cleans up any existing duplicates.
--
-- See concept/07 + docs/2026-07-24-log-065-war-dedup-fix-and-ui-improvements.md.

-- Step 1: Clean up existing duplicates. A backfill-only row (start_time IS
-- NULL, war_snapshot IS NULL) is a duplicate of a live-tracked row (start_time
-- IS NOT NULL) when they share the same opponent_tag AND their end_times are
-- within ±1 day (same war, slightly different scheduled vs actual end times).
-- We keep the live-tracked row (it has the roster snapshot + attacks) and
-- delete the backfill-only duplicate.
DELETE FROM wars
WHERE war_type = 'regular'
  AND start_time IS NULL
  AND war_snapshot IS NULL
  AND EXISTS (
    SELECT 1 FROM wars w2
    WHERE w2.war_type = 'regular'
      AND w2.start_time IS NOT NULL
      AND w2.opponent_tag = wars.opponent_tag
      AND w2.end_time IS NOT NULL
      AND wars.end_time IS NOT NULL
      AND ABS(EXTRACT(EPOCH FROM (w2.end_time - wars.end_time))) < 86400
  );

-- Step 2: Create the partial unique index. Partial (WHERE start_time IS NOT
-- NULL AND war_type = 'regular') so backfill rows (start_time = NULL) are
-- unaffected — NULL ≠ NULL in SQL, so multiple backfill rows for different
-- wars don't conflict. This prevents syncCurrentWar from ever creating a
-- duplicate regular war with the same (opponent_tag, start_time).
CREATE UNIQUE INDEX IF NOT EXISTS "wars_regular_opponent_start_unique_idx"
  ON "wars" ("opponent_tag", "start_time")
  WHERE "war_type" = 'regular' AND "start_time" IS NOT NULL;

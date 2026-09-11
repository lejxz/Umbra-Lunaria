ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "own_clan_tag" text;
--> statement-breakpoint
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "involves_own_clan" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
-- Backfill (fix A-4): other clans' CWL wars are the rows synced as lightweight
-- standings rows — war_type='cwl' AND no stored snapshot. Regular wars and our
-- own CWL wars (which always store a snapshot) involve our clan.
UPDATE "wars"
SET "involves_own_clan" = false
WHERE "war_type" = 'cwl' AND "war_snapshot" IS NULL;
--> statement-breakpoint
-- Backfill the own-side tag for every war that involves our clan. The tag
-- matches config/clan.config.ts clanTag (single-clan deployment).
UPDATE "wars"
SET "own_clan_tag" = '#2JPCYP98L'
WHERE "involves_own_clan" = true AND "own_clan_tag" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wars_involves_own_clan_idx" ON "wars" USING btree ("involves_own_clan");
--> statement-breakpoint
-- Belt-and-braces HoF reconciliation. The journal now includes 0002 (which
-- recreates hall_of_fame_records correctly on fresh databases), but because
-- 0002's journal timestamp predates the last-applied migration on existing
-- deployments, the migrator will skip it there — these idempotent statements
-- converge any pre-existing table to schema.ts (rank column + composite
-- unique) without a hand-alter.
ALTER TABLE "hall_of_fame_records" ADD COLUMN IF NOT EXISTS "rank" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hall_of_fame_records_award_key_rank_unique'
  ) THEN
    ALTER TABLE "hall_of_fame_records"
      ADD CONSTRAINT "hall_of_fame_records_award_key_rank_unique"
      UNIQUE ("award_key", "rank");
  END IF;
END $$;
--> statement-breakpoint
-- Drop the pre-fix single-award unique constraint if it is still present
-- (deployments that applied the original, rank-less 0002 by hand).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hall_of_fame_records_award_key_unique'
  ) AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hall_of_fame_records_award_key_rank_unique'
  ) THEN
    ALTER TABLE "hall_of_fame_records"
      DROP CONSTRAINT "hall_of_fame_records_award_key_unique";
  END IF;
END $$;

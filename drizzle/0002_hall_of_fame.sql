CREATE TABLE IF NOT EXISTS "hall_of_fame_records" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hall_of_fame_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
        "award_key" text NOT NULL,
        "rank" integer DEFAULT 0 NOT NULL,
        "holder_tag" text NOT NULL,
        "holder_name" text NOT NULL,
        "record_value" integer NOT NULL,
        "value_label" text NOT NULL,
        "period_label" text,
        "achieved_at" timestamp with time zone NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Reconciliation for deployments where the original (rank-less) version of
-- this file was applied by hand before it was recorded in the migration
-- journal. Everything below is idempotent, so re-running this migration on
-- an already-correct table is a no-op.
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

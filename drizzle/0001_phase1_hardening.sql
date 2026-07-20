-- Phase 1.0.C schema hardening migration.
-- See concept/03-data-model-and-database.md + concept/12 Step 1.0.C.
--
-- This migration is intentionally additive and non-destructive: it adds new
-- columns, tables, and indexes without dropping existing data. Column renames
-- are handled as add-new + drop-old only where the old column is empty.
--
-- Run with: psql $DATABASE_URL -f drizzle/0001_phase1_hardening.sql
-- Or: npx drizzle-kit migrate (once the journal entry is added).

-- ===========================================================================
-- 1. clans — expand cached identity fields
-- ===========================================================================
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "is_family_friendly" boolean;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "badge_urls" jsonb;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "clan_points" integer;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "clan_builder_base_points" integer;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "clan_capital_points" integer;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "member_count" integer;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "location" jsonb;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "chat_language" jsonb;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "war_league" jsonb;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "capital_league" jsonb;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "is_war_log_public" boolean;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "districts_payload" jsonb;
ALTER TABLE "clans" ADD COLUMN IF NOT EXISTS "last_daily_batch_at" timestamp with time zone;

-- Migrate badge_url (text) → badge_urls (jsonb). The old column is kept for
-- backward compat until a later cleanup migration confirms nothing reads it.
UPDATE "clans"
  SET "badge_urls" = CASE
    WHEN "badge_url" IS NOT NULL THEN jsonb_build_object('large', "badge_url")
    ELSE NULL
  END
  WHERE "badge_url" IS NOT NULL AND "badge_urls" IS NULL;

-- The old `labels` column was jsonb and remains jsonb — no change needed.
-- The old `location` column was text; we now store the full object. The
-- ALTER above added the jsonb version. To avoid a type conflict, we rename
-- the old text column first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clans' AND column_name = 'location'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE "clans" RENAME COLUMN "location" TO "location_text_old";
  END IF;
END $$;

-- ===========================================================================
-- 2. members — expand profile fields
-- ===========================================================================
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "town_hall_weapon_level" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "exp_level" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "trophies" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "best_trophies" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "league" jsonb;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "league_tier" jsonb;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "clan_rank" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "previous_clan_rank" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "builder_hall_level" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "builder_base_trophies" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "best_builder_base_trophies" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "builder_base_league" jsonb;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "war_stars" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "attack_wins" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "defense_wins" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "clan_capital_contributions" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "current_donations" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "current_donations_received" integer;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "last_detail_capture_at" timestamp with time zone;

-- ===========================================================================
-- 3. membership_events — immutable join/leave/rejoin log
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "membership_events" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "player_tag" text NOT NULL,
  "name_at_event" text NOT NULL,
  "event_type" text NOT NULL,
  "event_time" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "membership_events_player_tag_idx" ON "membership_events" ("player_tag");
CREATE INDEX IF NOT EXISTS "membership_events_event_time_idx" ON "membership_events" ("event_time");

-- ===========================================================================
-- 4. member_snapshots — add indexes + builder_base_trophies column
-- ===========================================================================
ALTER TABLE "member_snapshots" ADD COLUMN IF NOT EXISTS "builder_base_trophies" integer;
CREATE INDEX IF NOT EXISTS "member_snapshots_player_tag_captured_at_idx"
  ON "member_snapshots" ("player_tag", "captured_at");
CREATE INDEX IF NOT EXISTS "member_snapshots_captured_at_idx"
  ON "member_snapshots" ("captured_at");

-- ===========================================================================
-- 5. wars — add stable identity, destruction, result, freshness fields
-- ===========================================================================
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "war_tag" text;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "opponent_badge_urls" jsonb;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "opponent_clan_level" integer;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "own_destruction_percentage" integer;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "opponent_destruction_percentage" integer;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "own_attacks" integer;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "opponent_attacks" integer;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "preparation_start_time" timestamp with time zone;
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS "wars_war_tag_idx" ON "wars" ("war_tag") WHERE "war_tag" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "wars_opponent_tag_start_time_idx"
  ON "wars" ("opponent_tag", "start_time");
CREATE INDEX IF NOT EXISTS "wars_state_idx" ON "wars" ("state");
CREATE INDEX IF NOT EXISTS "wars_end_time_idx" ON "wars" ("end_time");

-- ===========================================================================
-- 6. war_attacks — add duration column + idempotency unique index
-- ===========================================================================
ALTER TABLE "war_attacks" ADD COLUMN IF NOT EXISTS "duration" integer;
CREATE UNIQUE INDEX IF NOT EXISTS "war_attacks_war_attacker_order_idx"
  ON "war_attacks" ("war_id", "attacker_tag", "attack_order");
CREATE INDEX IF NOT EXISTS "war_attacks_war_id_idx" ON "war_attacks" ("war_id");
CREATE INDEX IF NOT EXISTS "war_attacks_attacker_tag_idx" ON "war_attacks" ("attacker_tag");

-- ===========================================================================
-- 7. war_participants — add map_position + index
-- ===========================================================================
ALTER TABLE "war_participants" ADD COLUMN IF NOT EXISTS "map_position" integer;
CREATE INDEX IF NOT EXISTS "war_participants_player_tag_idx" ON "war_participants" ("player_tag");

-- ===========================================================================
-- 8. capital_district_snapshots — add index
-- ===========================================================================
CREATE INDEX IF NOT EXISTS "capital_district_snapshots_name_captured_at_idx"
  ON "capital_district_snapshots" ("district_name", "captured_at");

-- ===========================================================================
-- 9. capital_raid_seasons — add new fields
-- ===========================================================================
ALTER TABLE "capital_raid_seasons" ADD COLUMN IF NOT EXISTS "raids_completed" integer;
ALTER TABLE "capital_raid_seasons" ADD COLUMN IF NOT EXISTS "total_attacks" integer;

-- ===========================================================================
-- 10. capital_contributions — add new fields
-- ===========================================================================
ALTER TABLE "capital_contributions" ADD COLUMN IF NOT EXISTS "attack_limit" integer;
ALTER TABLE "capital_contributions" ADD COLUMN IF NOT EXISTS "bonus_attack_limit" integer;
ALTER TABLE "capital_contributions" ADD COLUMN IF NOT EXISTS "raid_weekend_medals" integer;

-- ===========================================================================
-- 11. war_rosters — add audit fields
-- ===========================================================================
ALTER TABLE "war_rosters" ADD COLUMN IF NOT EXISTS "config_version" text;
ALTER TABLE "war_rosters" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "war_rosters" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "war_rosters" ADD COLUMN IF NOT EXISTS "finalized_at" timestamp with time zone;

-- ===========================================================================
-- 12. war_roster_slots — add indexes
-- ===========================================================================
CREATE INDEX IF NOT EXISTS "war_roster_slots_roster_id_idx" ON "war_roster_slots" ("roster_id");
CREATE UNIQUE INDEX IF NOT EXISTS "war_roster_slots_roster_position_idx"
  ON "war_roster_slots" ("roster_id", "map_position");

-- ===========================================================================
-- 13. runtime_settings — Phase 2 schema, ready now
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "runtime_settings" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "key" text NOT NULL UNIQUE,
  "value" jsonb NOT NULL,
  "validation_version" integer NOT NULL DEFAULT 1,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" text
);

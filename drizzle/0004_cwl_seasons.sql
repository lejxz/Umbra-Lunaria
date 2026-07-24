-- 0004 — CWL league seasons. Stores the full CocCwlLeagueGroup response
-- (8 clans, 7 rounds, season name, state) so the War Center can render a
-- league standings table + day-by-day round tabs. See concept/07 §"Clan War
-- League". Idempotent.
CREATE TABLE IF NOT EXISTS "cwl_seasons" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "season" text NOT NULL UNIQUE,
  "state" text NOT NULL,
  "league_group" jsonb NOT NULL,
  "captured_at" timestamp with time zone NOT NULL
);

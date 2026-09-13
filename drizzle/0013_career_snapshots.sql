-- Phase 3.1 — career snapshots over time (docs/2026-09-11-implementation-plan.md §3.1).
-- One row per retained member per daily batch, written BEFORE members.career_stats
-- is overwritten. Diffs between two captures yield "war stars +12 this month",
-- "attack wins +34", per-achievement deltas — and the same diff marks day-grain
-- activity (implementation-plan §1.5 item 7: career/capital deltas are day-exact
-- login evidence the 5-minute poll cannot see).
--
-- Retention: keep all rows (~20 MB/year at the current roster size). The purge
-- route does NOT prune this table — see docs/concept/03-data-model-and-database.md
-- §"Retention and pruning" for the escape hatch if growth ever matters.
CREATE TABLE IF NOT EXISTS "member_career_snapshots" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "player_tag" text NOT NULL REFERENCES "members"("player_tag"),
  "captured_at" timestamptz NOT NULL,
  "war_stars" integer,
  "attack_wins" integer,
  "defense_wins" integer,
  "clan_capital_contributions" integer,
  "exp_level" integer,
  "career_stats" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_career_snapshots_tag_captured_idx"
  ON "member_career_snapshots" ("player_tag", "captured_at");

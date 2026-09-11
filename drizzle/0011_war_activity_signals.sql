-- Phase 1 activity signals (docs/2026-09-11-implementation-plan.md §1.5):
-- war attacks + XP level now feed member activity evidence.
ALTER TABLE "member_snapshots" ADD COLUMN IF NOT EXISTS "exp_level" integer;
--> statement-breakpoint
-- Per-poll war-evidence query: attacks by (attacker_tag ∈ live roster) with
-- attacked_at in (prior snapshot, now]. Also serves the one-shot backfill
-- (scripts/backfill-war-activity.ts) and any time-range attack query.
CREATE INDEX IF NOT EXISTS "war_attacks_attacked_at_idx" ON "war_attacks" USING btree ("attacked_at");

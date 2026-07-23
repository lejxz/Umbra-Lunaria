-- 0005 — Checkpoint columns on members for safe snapshot pruning.
-- Stores cumulative lifetime totals computed from ALL member_snapshots
-- before pruning, so HoF awards (Philanthropist, Dedicated, Unsleeping)
-- and 30d-window donation queries can use the checkpoint as a baseline
-- instead of reading pruned snapshots. See concept/03 §"Retention and pruning".
-- Idempotent.
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "cumulative_donations_given" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "cumulative_donations_received" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "cumulative_login_days" integer DEFAULT 0;

-- 0009 — Drop dead war_planning tables (war_rosters + war_roster_slots).
-- These were created by the Phase 2 planning feature which was removed
-- (see docs/2026-07-24-log-080-remove-war-planning-and-admin.md). The tables
-- are empty (no rows ever persisted) but consume ~32 KB of catalog overhead.
-- Dropping them keeps the schema clean + reclaims the overhead.
-- Idempotent.
DROP TABLE IF EXISTS "war_roster_slots";
--> statement-breakpoint
DROP TABLE IF EXISTS "war_rosters";

-- 0008 — Metadata on membership events + rushed_percent on members.
--
-- 1. membership_events.metadata — nullable JSONB for event-specific data:
--    - TH upgrade: { "oldTH": 13, "newTH": 14 }
--    - Rename: { "oldName": "OldName", "newName": "NewName" }
--    - join/leave/rejoin: null (no extra data needed)
--
-- 2. members.rushed_percent — nullable double precision, computed during the
--    daily batch from unit_levels via computeRushed(). Having it as a column
--    avoids recomputing it in every query that needs it (attention queue,
--    clan log, roster). Null when no unit cap data is available.
--
-- Idempotent.
ALTER TABLE "membership_events" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "rushed_percent" double precision;

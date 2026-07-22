-- 0003 — War Center snapshot column.
-- Stores the full CocCurrentWar response (both clans, rosters, attacks) so the
-- War Center page can render the opponent roster and a names-attached attack
-- log. Opponent members are not in `members` (war_participants has a FK to it),
-- so the snapshot is the only place their identity is preserved for the UI.
-- See concept/07-clan-war.md + concept/12 Step 1.4.A. Idempotent.
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "war_snapshot" jsonb;

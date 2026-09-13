-- Phase 2.3 — war log v2 enrichment (docs/2026-09-11-implementation-plan.md §2.3):
-- XP earned per war, from the /warlog payload (clan.expEarned — field already
-- typed in lib/coc-client/client.ts). exp_per_attack is the derived
-- expEarned / attacks-used ratio, written at backfill time so the history list
-- can show war XP without recomputing.
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "exp_earned" integer;
--> statement-breakpoint
ALTER TABLE "wars" ADD COLUMN IF NOT EXISTS "exp_per_attack" real;

# Log 073 — Safe Snapshot Pruning with Checkpoint Columns

**Date:** 2026-07-23
**Time:** 08:15 AM (+08:00)

## Summary of Session
Implemented safe snapshot pruning with checkpoint columns. Added `cumulative_donations_given`, `cumulative_donations_received`, `cumulative_login_days` columns to `members` (migration 0005). The daily batch computes checkpoints from ALL snapshots before HoF; the purge route re-computes them as a safety net, then prunes intra-day snapshots >7 days (keeping last-per-day), capital snapshots >90 days, and backfill wars >365 days. Updated HoF to use checkpoints instead of re-reading all snapshots. Updated the Activity Score "all" window to use the checkpoint.

## Work Completed

### Migration 0005 — checkpoint columns (`drizzle/0005_member_checkpoints.sql`)
Three new integer columns on `members` (default 0). Applied to Neon.

### Checkpoint computation (`lib/ingest/checkpoints.ts`, new)
`computeCheckpoints()` — fetches ALL snapshots for retained members, computes:
- `cumulative_donations_given` = reset-aware lifetime donation delta (via `calculateDonationDelta`)
- `cumulative_donations_received` = same for received
- `cumulative_login_days` = distinct calendar days with `loginDayFlag = true`
Stores on the `members` table.

### Daily batch update (`app/api/ingest/route.ts`)
Added checkpoint computation step before `checkHallOfFameRecords()`. Runs during the daily batch (00:00 PHT, 2 hours before the purge).

### Purge route rewrite (`app/api/cron/purge/route.ts`)
Five passes in order:
0. **Safety checkpoint** — re-computes checkpoints (in case daily batch failed). If this fails, pruning is ABORTED (old snapshots are the only source of lifetime totals).
1. **Departed-member purge** (existing) — delete members past retention + their snapshots + unit levels.
2. **Intra-day snapshot pruning** — delete snapshots >7 days old, keep LAST per member per day (not first — last has highest donation counter, preserving delta chain). Uses `DISTINCT ON (player_tag, date_trunc('day', captured_at)) ... ORDER BY captured_at DESC`.
3. **Capital district snapshot pruning** — delete >90 days.
4. **Old backfill war pruning** — delete wars >365 days with no snapshot, `war_type='regular'`.

### HoF records-updater update (`lib/db/records-updater.ts`)
- **Philanthropist**: uses `cumulativeDonationsGiven` directly (was: re-read all snapshots + `calculateDonationWindow`).
- **Dedicated**: still computes the streak from daily snapshots (which survive pruning). Falls back to `cumulativeLoginDays` checkpoint if no snapshots have `loginDayFlag`.
- **Unsleeping**: uses `cumulativeDonationsGiven` + `cumulativeLoginDays` (was: re-read all snapshots).
- Removed unused `calculateDonationWindow` + `computeWindow` imports.

### Activity Score "all" window (`lib/db/queries.ts`)
`getMemberActivityScore("all")` now uses `member.cumulativeDonationsGiven` directly instead of computing from all snapshots. The 24h/7d/30d windows still use snapshots (they're within the 7-day full-resolution zone, or have daily snapshots for days 8-30 which preserve the delta chain).

Updated `getRetainedMembers()` to include the three checkpoint columns in its select.

### Concept/03 update
Added "Retention and pruning" section documenting: checkpoint columns, pruning schedule (4 passes), what's NOT pruned (and why), and the cron architecture (third-party for light poll + daily batch, Vercel Cron for purge, 2-hour gap for ordering safety).

## Safety verification (exhaustive audit)

| Table | Pruned? | Affected consumers | Safe? |
|---|---|---|---|
| `member_snapshots` >7d intra-day | Yes (keep last/day) | HoF (uses checkpoint), 30d donation (daily chain preserved), activity timeline (daily buckets) | ✅ |
| `member_snapshots` >90d | Yes (delete all) | HoF (checkpoint covers), Activity Score "all" (checkpoint) | ✅ |
| `war_attacks` | NO | HoF Vanguard, attack distribution donut | ✅ (not pruned) |
| `war_participants` | NO | Member war history (all-time) | ✅ (not pruned) |
| `wars` (backfill >365d) | Yes | History list (LIMIT 50), trend chart (LIMIT 20) | ✅ (within limits) |
| `capital_district_snapshots` >90d | Yes | Upgrade timeline (diffs) | ✅ (old events acceptable loss) |
| `membership_events` | NO | Clan log | ✅ (not pruned) |
| `cwl_seasons` | NO | CWL league view | ✅ (not pruned) |

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.

## Next Action
Pruning implementation complete. The system is safe at any clan size — `member_snapshots` stays bounded (~13,500 rows for 50 members after pruning vs ~876,000 without). Continue to Step 1.6 — Phase 1 integration and release gate.

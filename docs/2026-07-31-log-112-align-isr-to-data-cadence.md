# Log 112 — Align ISR Windows to Data Change Cadence

**Date:** 2026-07-31
**Time:** 02:26 PM (+08:00)

## Summary of Session
Adjusted the `/members` and `/strategy` ISR windows to match the actual data
change cadence. The batch poll (which updates roster, TH levels, roles, unit
progression, rushed %) runs once daily — not every 10 minutes. Both pages
were revalidating 10× more often than needed.

## Background: Poll Cadence
- **Light poll** (every 5 min): donations, activity flags, join/leave events,
  current war state. Does NOT update roster/TH/role/progression.
- **Daily batch** (once daily ~06:00 PHT): full player-detail fetches — TH
  levels, roles, unit progression, rushed %, capital raid seasons, HoF records.

## Work Completed

### `/members`: 600s (10 min) → 3600s (1 hr)
The members page shows the roster (names, TH levels, roles, war preference,
donations). Roster/TH/role only change on the daily batch. Donations update
every 5 min, but the roster view doesn't need to reflect that immediately —
the member detail sheet (fetched on click) has the latest. 1 hour is fine.

### `/strategy`: 600s (10 min) → 3600s (1 hr)
The strategy page shows composite scores, rushed %, war participation — all
computed from the daily batch. Nothing on this page changes between batches.
1 hour is more than sufficient.

## Final ISR Settings (All Pages)
| Page | Revalidate | Rationale |
|---|---|---|
| `/` (dashboard) | 900s (15 min) | Donations/activity update every 5 min; 15-min staleness is acceptable |
| `/members` | 3600s (1 hr) | Roster changes on daily batch |
| `/war` | 300s (5 min) | War state is time-sensitive during active wars |
| `/capital` | 3600s (1 hr) | Capital changes weekly |
| `/hall-of-fame` | 3600s (1 hr) | Records change daily at most |
| `/strategy` | 3600s (1 hr) | Recomputes on daily batch |

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass

## Next Action
Monitor egress. With 4 of 6 pages now at 1-hour ISR, the non-dashboard egress
is negligible. The dashboard (15-min ISR) is the only regular DB reader.

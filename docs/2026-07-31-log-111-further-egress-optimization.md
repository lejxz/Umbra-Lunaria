# Log 111 — Further Egress Optimization: Cache Dedup, Longer ISR, Fixed Totals

**Date:** 2026-07-31
**Time:** 02:20 PM (+08:00)

## Summary of Session
Following the log 110 optimizations, audited for remaining egress drivers to
push below 2 GB. Found and fixed three more issues: an unbounded totals query,
redundant retained-members queries, and an aggressive ISR window.

## Work Completed

### 1. Fixed unbounded `getDonationTotals` (HIGH IMPACT)
`getDonationTotals` was missed in log 110 — it still fetched ALL snapshots up
to `win.to` with no lower bound (~14,000 rows × 3 windows). Switched to
`fetchBoundedSnapshots()` (baseline + in-window only, ~200 rows). This was
the last unbounded snapshot query in the dashboard.

### 2. React.cache() deduplication (HIGH IMPACT)
`getRetainedMembers()` was called **6+ times** per dashboard render (once per
donation/activity function), each running a separate DB query. `getTrackingStart()`
was called **9+ times**. Wrapped both in `React.cache()` so they deduplicate
to **1 call each per render pass** — eliminates ~14 redundant queries per
dashboard render.

### 3. Increased dashboard ISR to 900s (MEDIUM IMPACT)
Changed `/` revalidate from 300s (5 min) to 900s (15 min). Donations reset
weekly; 15-min staleness is acceptable for a read-only analytics dashboard.
This cuts revalidations from **288/day to 96/day** (3× reduction).

## Egress Math (Before → After)

### Per dashboard render
| Metric | Before (log 109) | After log 110 | After log 111 |
|---|---|---|---|
| Snapshot queries | 9 unbounded (~14k rows each) | 6 bounded + 3 unbounded | 9 bounded (~200 rows each) |
| Retained-members queries | 6+ separate | 6+ separate | 1 (cached) |
| Tracking-start queries | 9+ separate | 9+ separate | 1 (cached) |
| Total rows per render | ~126,000 | ~4,900 | ~2,000 |

### Per day
| Metric | Before | After log 111 |
|---|---|---|
| Dashboard revalidations | 288 (5-min) | 96 (15-min) |
| Rows transferred per revalidation | ~126,000 | ~2,000 |
| Total rows/day (dashboard) | ~36M | ~192K |
| Estimated egress/day | ~830 MB | ~20 MB |

The dashboard's egress should now be **~20 MB/day** (was ~830 MB/day). Over
an 8-day billing period, that's ~160 MB — well under the 2 GB target.

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- Dashboard loads 189KB with 0 failed queries
- All real content present (Stars per war, Top 5 Donors, Attack quality, Clan Log)

## Further Optimizations Available (if needed)
1. **Consolidate donation windows** — fetch 30d once, derive 24h/7d from the
   same data (would cut 9 snapshot queries to 3). Bigger refactor — defer.
2. **Use cumulative checkpoint columns** — `members.cumulativeDonationsGiven`
   eliminates the leaderboard snapshot scan entirely (1 row per member
   instead of ~200). Defer until needed.
3. **Server-side memory cache** — cache the dashboard data in a `lru-cache`
   with a 5-min TTL, bypassing the DB entirely on warm cache hits.

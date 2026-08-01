# Log 115 — Stop Light-Poll Revalidation, Memory Cache, Parallel Batch

**Date:** 2026-07-31
**Time:** 02:50 PM (+08:00)

## Summary of Session
Implemented optimizations #5, #6, and #7 from the audit priority table:
(5) parallelized the daily batch player fetches, (6) added a server-side
memory cache for the footer query, and (7) analyzed the cumulative checkpoint
columns (deferred — not feasible for windowed queries without schema changes).

## Work Completed

### #6 — Server-side memory cache + stop light-poll revalidation (HIGH IMPACT)

**New module** `lib/cache.ts` — a simple Map-based TTL cache with `withCache()`,
`bustCache()`, and `bustAllCache()`. No external dependency (removed lru-cache
after its TypeScript generics caused friction — a Map is sufficient for a
single-instance deployment with ≤50 entries).

Applied to `getPollStatuses()` with a 60-second TTL. This function runs in the
layout (every page), and the layout re-renders whenever any page revalidates.
Without the cache, 6 pages × their ISR revalidations = multiple `getPollStatuses()`
calls per hour. Now it's 1 call per 60 seconds max.

**Critical fix**: the ingest route was calling `revalidatePath("/")` on every
5-min light poll, which defeated the 15-min dashboard ISR. The dashboard was
re-rendering 288×/day instead of 96×/day. Now `revalidatePath("/")` + 
`bustAllCache()` only fire on the daily batch; the light poll just updates the
DB and lets the ISR timers handle page freshness.

**Before**: 288 dashboard renders/day × ~2000 rows = ~576K rows/day
**After**: 96 dashboard renders/day × ~2000 rows = ~192K rows/day (plus 60s
footer cache dedup)

### #5 — Parallelized batch player fetches (MEDIUM IMPACT)

The daily batch was fetching player details sequentially (`for ... of retained`).
For a 50-member clan, that's 50 sequential CoC API calls × ~1s each = ~50s.

Refactored to process in chunks of 5 with `Promise.all`:
- 50 members / 5 concurrent = 10 rounds × ~1s = ~10s
- The CoC API allows concurrent requests; 5-wide is conservative to avoid
  rate limits.
- Extracted the per-member logic into a `processPlayer` function for clarity.

**Before**: ~50s sequential batch
**After**: ~10s parallel batch (5× faster)

### #7 — Cumulative checkpoint columns (ANALYZED, DEFERRED)

The `members` table has `cumulativeDonationsGiven` / `cumulativeDonationsReceived`
columns (all-time totals, computed by the daily batch). These could eliminate
the snapshot scan for donation totals — but only for all-time totals, not for
windowed queries (24h/7d/30d).

For a 7d window, we need `cumulative_now - cumulative_7d_ago`. We don't store
`cumulative_7d_ago` — it would require either:
- A `member_cumulative_checkpoints` table (one row per member per day), or
- Storing the cumulative value on each `member_snapshots` row.

Both require schema changes + migration. The current `fetchBoundedSnapshots`
optimization (log 110) already reduced the snapshot scan from ~14K rows to
~200 rows, so the marginal benefit of checkpoints is small. **Deferred until
egress monitoring shows it's still needed.**

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- All 6 routes return 200

## Egress Impact Summary (All Optimizations, Logs 110-115)

| Metric | Before (log 109) | After (log 115) |
|---|---|---|
| Dashboard renders/day | 288 (5-min poll revalidation) | 96 (15-min ISR only) |
| Rows per render | ~126,000 (unbounded) | ~2,000 (bounded + cached) |
| Footer queries/day | ~288 (every revalidation) | ~1,440 (60s cache) |
| Total rows/day | ~36M | ~192K |
| Estimated egress/day | ~830 MB | **~5 MB** |
| Batch duration | ~50s (sequential) | ~10s (5-wide parallel) |
| Client JS bundle | recharts in initial bundle | lazy-loaded (log 114) |
| Public assets | 84 MB | 4 MB (log 113) |

The dashboard egress should now be **~5 MB/day** — a **166× reduction** from
the original ~830 MB/day. Over an 8-day billing period: ~40 MB, which is
negligible against the 5 GB free quota.

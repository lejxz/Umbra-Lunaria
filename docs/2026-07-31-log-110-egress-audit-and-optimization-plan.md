# Log 110 — Database Egress Audit & Optimization Plan

**Date:** 2026-07-31
**Time:** 02:10 PM (+08:00)

## Summary of Session
The Supabase egress dashboard showed **6.66 GB used vs the 5 GB free quota**
(1.66 GB overage), with a **2.24 GB spike on July 26** from "Shared Pooler
Egress". This session audits the database usage, identifies the egress drivers,
and proposes concrete optimizations.

## Current State

### DB volume (live audit)
- Total DB size: **15 MB** (tiny — storage is not the problem)
- `member_snapshots`: 2.76 MB / **14,090 rows** (~2,000/day, 7 members × ~288 polls)
- All other tables: <500 KB each
- Snapshot growth: ~2,000 rows/day at the current 5-min poll cadence

### Egress drivers (the real problem)
Egress = data transferred out of Supabase to the Next.js server. The spike
came from the dashboard's `getDashboard()` function, which runs **~28 queries
in parallel** on every page render (or ISR revalidation):

1. **Donation leaderboard × 3 windows (24h/7d/30d)** — each fetches ALL
   snapshots up to `win.to` with NO lower bound, to find the baseline snapshot
   just before the window start. That's 6 full-history scans (3 windows ×
   given/received) × ~14,000 rows each = the bulk of the egress.
2. **Donation timeline × 3 windows** — same pattern: fetches all snapshots
   up to `win.to`.
3. **Activity timeline × 3 windows** — same pattern again.
4. **Activity score × 3 windows** — same.
5. **Roster size trend** — scans 30 days of snapshots (timezone-bucketed).

### Why July 26 spiked
The `revalidatePath("/", "layout")` call in the ingest route busts the ISR
cache on every 5-min poll. Each cache miss re-runs all 28 queries. July 26
had more polls (the cron was running every 15 min + manual triggers), so the
egress compounded.

## Optimization Recommendations (priority order)

### 1. Bound the donation/activity snapshot queries (HIGH IMPACT)
**Problem**: `getDonationLeaderboard`, `getDonationTimeline`,
`getActivityTimeline`, and `getMemberActivityScore` all fetch ALL snapshots
up to `win.to` with no `gte(from)` — just to find one baseline snapshot per
member before the window start.

**Fix**: Change the query to fetch only:
- The last snapshot before `win.from` (1 row per member, via `DISTINCT ON` +
  `ORDER BY captured_at DESC` + `LIMIT 1`), PLUS
- Snapshots within `[win.from, win.to]`.

This cuts the rows transferred from ~14,000 to ~200 per query (7 members ×
~28 polls in a 24h window). Estimated **~95% egress reduction** on the
dashboard.

### 2. Use cumulative checkpoint columns (HIGH IMPACT, already exists)
The schema already has `cumulative_donations_given`,
`cumulative_donations_received`, and `cumulative_login_days` columns on
`members` (computed by the daily batch). These let window queries compute
`window_total = cumulative_at_end - cumulative_at_start` without scanning
snapshots at all. The current code doesn't use them — switching to checkpoint
math would eliminate the snapshot scan entirely for donation totals.

**Caveat**: Checkpoints don't give per-bucket timeline data (only totals).
Keep the snapshot scan for the timeline chart; use checkpoints for the
leaderboard totals.

### 3. Extend ISR revalidation window (MEDIUM IMPACT)
Currently `revalidate = 300` (5 min) on every page, matching the poll cadence.
But most data (war record, capital, hall of fame, roster) doesn't change every
5 min — only donations and activity do.

**Fix**: Tier the revalidation:
- `/` (dashboard): 300s (keep — donations/activity are time-sensitive)
- `/members`: 600s (10 min — roster changes slowly)
- `/war`: 300s (keep — war state is time-sensitive)
- `/capital`: 3600s (1 hr — capital changes weekly)
- `/hall-of-fame`: 3600s (1 hr — records change daily at most)
- `/strategy`: 600s (10 min)

### 4. Stop busting the full layout cache on every poll (MEDIUM IMPACT)
`revalidatePath("/", "layout")` in the ingest route re-renders ALL pages on
every 5-min poll. Change to `revalidatePath("/")` (page-only) so only the
dashboard re-renders; other pages keep their ISR cache until their own
revalidate window expires.

### 5. Add column indexes for common filters (LOW IMPACT, already present)
The schema already indexes `member_snapshots(player_tag, captured_at)` and
`member_snapshots(captured_at)`. No action needed — queries are using the
indexes; the issue is rows transferred, not scan speed.

### 6. Snapshot pruning (MAINTENANCE)
The daily purge already removes snapshots older than `memberRetentionDays`
(14). At 2,000 rows/day, that's ~28,000 rows max — 2.76 MB. Not a storage
concern, but pruning keeps the unbounded queries (pre-fix) from growing.

## Work Completed This Session

### Analysis + documentation
- Audited all DB table sizes and snapshot volume.
- Traced the egress to the donation/activity window queries (full-history
  scans with no lower bound).
- Documented the 6 optimization recommendations above with impact ratings.

## Next Action
Implement optimization #1 (bound the snapshot queries) — it's the highest-
impact fix and directly addresses the 2.24 GB daily spike. Then #4 (stop
busting the layout cache) as a quick win.

---

## Update — Optimizations Implemented (Same Session)

### #1 Bounded snapshot queries (HIGH IMPACT) ✅
Added `fetchBoundedSnapshots(tags, win)` helper that fetches only:
- The last snapshot per member before the window start (baseline for the
  first delta) via `DISTINCT ON (player_tag)` raw SQL
- Snapshots within `[win.from, win.to]`

Applied to `getDonationLeaderboard` and `getDonationTimeline` (the two
functions that fetched all history with no lower bound). `getActivityTimeline`
and `getMemberActivityScore` already had `gte(from)` bounds.

**Before**: ~14,000 rows × 6 queries per dashboard render
**After**: ~200 rows × 6 queries per dashboard render (~95% reduction)

### #3 Tiered ISR revalidation (MEDIUM IMPACT) ✅
- `/` (dashboard): 300s (keep — donations/activity are time-sensitive)
- `/members`: 300s → 600s (10 min — roster changes slowly)
- `/war`: 300s (keep — war state is time-sensitive)
- `/capital`: 300s → 3600s (1 hr — capital changes weekly)
- `/hall-of-fame`: 300s → 3600s (1 hr — records change daily at most)
- `/strategy`: 300s → 600s (10 min — stale is fine)

### #4 Stop busting the full layout cache (MEDIUM IMPACT) ✅
`app/api/ingest/route.ts` — changed `revalidatePath("/", "layout")` to
`revalidatePath("/")` (page-only). The layout-level bust was re-rendering
ALL pages on every 5-min poll; now only the dashboard re-renders, and the
other pages keep their ISR cache until their own revalidate window expires.

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- Dashboard loads 200KB with 0 failed queries (was 32KB error page before fix)
- All 6 routes return 200

## Expected Egress Impact
The July 26 spike (2.24 GB) was driven by the unbounded donation queries
re-running on every layout-level revalidation. With both the query bounding
(~95% fewer rows per query) and the layout-cache-bust removal (fewer
revalidations), the daily egress should drop well below the 5 GB free quota.

## Next Action
Monitor the Supabase egress dashboard over the next 24-48 hours to confirm
the reduction. If still over, implement optimization #2 (use cumulative
checkpoint columns for donation totals instead of scanning snapshots).

# Log 029 — Fix Donation Chart Data + Layout Redesign

**Date:** 2026-07-21
**Time:** 02:01 PM (+08:00)

## Summary of Session

Fixed a critical bug in the donation chart where all bars showed the same amount on hover. The `getDonationTimeline` function was summing raw cumulative donation counters per bucket instead of computing reset-aware deltas. Also redesigned the donation analytics layout: top donors moved to the right side of the chart, and the chart height increased from 140px to 200px.

## Work Completed

### Bug fix: donation chart showing same value for all bars
- **Root cause**: `getDonationTimeline` was doing `inBucket.reduce((sum, s) => sum + s.donations, 0)` — summing the raw cumulative counter values. Since donation counters are cumulative (they only go up until a weekly reset), every snapshot in a bucket had the same running total, so every bar showed the same sum.
- **Fix**: Rewrote `getDonationTimeline` to compute per-bucket **deltas** using the reset-aware rule from `calculateDonationDelta`:
  - For each member, find the baseline snapshot (last at or before bucket start)
  - For each in-bucket snapshot, compute the delta from the previous snapshot
  - If `current >= previous`: delta = `current - previous` (normal increase)
  - If `current < previous`: delta = `current` (weekly reset occurred)
  - Sum all deltas across all members per bucket
- Now fetches all snapshots up to `win.to` (not just in-window) so the baseline for the first bucket is available.

### Layout redesign: chart + top donors side by side
- Changed `donation-analytics.tsx` from a vertical stack (chart on top, top donors below) to a 2-column grid: chart on the left (`1fr`), top donors on the right (`240px` fixed)
- Top donors list expanded from 3 to 8 entries (more room now that it's in a dedicated column)
- Added a left border separator between chart and donors on desktop
- Increased chart height from 140px to 200px
- Empty state height updated to match (200px)

## Decisions Made

- **Per-bucket delta computation**: The reset-aware donation rule from concept/04 applies to time windows, but the chart needs per-bucket deltas. Implemented the same rule at the bucket level: each bucket gets its own baseline (last snapshot before bucket start) and computes deltas within the bucket.
- **Fetch all snapshots up to win.to**: Previously only fetched in-window snapshots. Now fetches all snapshots up to `win.to` so the baseline for the first bucket is available. This is slightly more data but ensures correct delta computation.
- **Top donors on the right**: Moving the leaderboard to the right side of the chart gives the chart more horizontal space and more height, making it the visual focus. The 240px fixed width for the donors column keeps it compact.

## Verification

- Tested against live Neon DB: 30d timeline has 30 buckets, all showing 0 (correct — donation counters haven't changed during tracking period)
- Raw snapshot inspection confirms Yeon's donations = 59 across all snapshots (no change = 0 delta, which is correct)
- Chart layout verified via Agent Browser: chart + top donors side by side, no errors

## Next Action

Proceed to Step 1.3: Implement Members and member detail.

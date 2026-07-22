# Log 053 — Next Poll Countdown Timer

**Date:** 2026-07-22
**Time:** 05:27 AM (+08:00)

## Summary of Session

Added a live countdown timer to the next expected poll in the data freshness footer. The timer counts down from the last poll time + 10 minutes, updating every second. Shows "overdue" in amber when the expected poll time has passed (GitHub Actions can be delayed under load).

## Changes

- Created `FreshnessFooter` component (replaces the old static chips):
  - Shows: Last poll, Daily batch, Tracking started, War synced timestamps
  - Shows: **Next poll countdown** (live, updates every second)
  - Countdown format: `M:SS` (e.g., `3:42`)
  - Color: green when >1 min remaining, amber when <1 min, amber "overdue" when past due
  - Uses `useEffect` with 1-second `setInterval` for the live countdown
- The poll interval is hardcoded at 10 minutes (matching the GitHub Actions cron)

## Why the web takes time to get updates

The dashboard is **server-rendered** (SSR) — when you load `/`, Next.js calls `getDashboard()` which reads from the Neon database. The data you see is from the **last successful poll**, not live data. The flow is:

1. GitHub Actions fires every ~10 min → calls `/api/ingest` → writes to Neon DB
2. You load the page → Next.js reads from DB → renders HTML
3. The page is static until you reload — there's no WebSocket or auto-refresh

This is intentional (keeps it simple and cheap — no persistent connections, no server-side polling). The countdown timer tells you when the next poll should bring fresh data.

## Can we go below 10 minutes?

GitHub Actions cron has a **minimum of 5 minutes**, but:
- GitHub doesn't guarantee exact timing — under load, workflows can be delayed 10-20+ min
- The `*/5` cron is technically possible but unreliable
- For true 5-minute polling, options are:
  - Vercel Cron (but the free tier is daily-only)
  - An external cron service (e.g., cron-job.org, EasyCron) calling `/api/ingest`
  - A dedicated server with a proper scheduler

The current `*/10` is the recommended sweet spot for GitHub Actions.

## Next Action

Proceed to Step 1.4: Implement War Center.

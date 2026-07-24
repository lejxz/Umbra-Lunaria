# Log 071 — ISR Caching + 30-min Poll Cadence

**Date:** 2026-07-23
**Time:** 05:35 AM (+08:00)

## Summary of Session
Implemented ISR (Incremental Static Regeneration) caching on the dashboard, members, and capital pages to eliminate Neon CU usage from page views. Changed the light-poll cadence from 15 min to 30 min. Updated all concept docs, README, config, and the load analysis to reflect both changes.

## Work Completed

### ISR caching (`app/page.tsx`, `app/members/page.tsx`, `app/capital/page.tsx`)
Added `export const revalidate = 900` (15 min) to three read-only pages:
- **Dashboard** (`/`) — 900s. The heaviest page (~25 DB queries). Between revalidations, Vercel serves the cached HTML from the edge — 0 DB, 0 CU. The ingest route already calls `revalidatePath("/", "layout")` after each poll, so the cache busts immediately after a fresh capture.
- **Members** (`/members`) — 900s. The roster is cached; member detail sheets are fetched client-side on click (not cached, still dynamic).
- **Capital** (`/capital`) — 900s. Capital data changes slowly (district levels take days to upgrade), so a 15-min cache is well within the data's natural freshness window.
- **War** (`/war`) — stays dynamic (no ISR). It has a manual refresh button + 45s TTL that must work in real time.

**CU impact:** page-view CU drops from ~10-20 CU-sec/day (every view hits the DB) to ~2 CU-sec/day (only the 15-min background revalidation hits the DB). A 5-10× reduction.

### 30-min poll cadence
Changed from 15 min to 30 min across:
- `config/clan.config.ts` — `pollIntervalMinutes: 30`
- `components/dashboard/dashboard-shell.tsx` — `POLL_INTERVAL_MINUTES = 30` + comment
- `concept/04` — polling schedule table + cron-job description
- `concept/11` — `pollIntervalMinutes` default + cron-job configuration table
- `concept/final-feature-list.md` — "approximately every 30 minutes"
- `README.md` — 3 references
- `app/api/ingest/route.ts` — comment
- `docs/2026-07-22-neon-vercel-free-tier-load-analysis.md` — recomputed all figures: 48 polls/day (was 96), ~42 CU/month (was ~84), ~58% headroom (was ~16%)

### Concept/04 — new "Page-view caching (ISR)" section
Added a new section documenting the ISR strategy: which pages are cached, which stay dynamic, why, and how `revalidatePath()` busts the cache after fresh captures.

## CU impact summary (30-min cadence + ISR)

| Source | Before (15 min, no ISR) | After (30 min + ISR) |
|---|---|---|
| Cron light polls | ~70 CU/month | ~35 CU/month |
| Page views | ~5-10 CU/month | ~1-2 CU/month |
| **Total** | **~75-80 CU/month** | **~36-37 CU/month** |

The combination of 30-min cadence + ISR drops the total from ~80 CU to ~37 CU — well under the 100 CU limit with ~63% headroom.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.

## Next Action
ISR + 30-min cadence implemented. The user also asked about CWL handling — the honest audit is in the chat response (CWL is partially handled: individual wars are ingested and shown in history, but there's no league-group view, no day-by-day tabs, no overall standings/rank display).

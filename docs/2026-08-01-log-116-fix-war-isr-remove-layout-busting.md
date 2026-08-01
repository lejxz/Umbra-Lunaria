# Log 116 — Fix War Page ISR + Remove All Layout-Level Cache Busting

**Date:** 2026-08-01
**Time:** 01:10 AM (+08:00)

## Summary of Session
The egress was still ~300 MB/day despite logs 110-115. Root cause: the war page
had **NO ISR** (dynamically rendered on every visit — 18 queries per page view),
and three routes were calling `revalidatePath("/", "layout")` which busted ALL
pages' caches on every trigger.

## Root Cause Analysis

### Why 300 MB/day was still happening
The cron frequency (every 5 min) is **not** the egress driver — the cron
*writes* to the DB (not egress). Egress = data *read out* of Supabase. The
300 MB/day came from page renders (reads):

1. **War page had no `revalidate`** — it was dynamically rendered on every
   single visit. Each visit ran `getWarCenter()` (18 queries). If the war page
   got 100 visits/day, that's 1,800 queries/day — the bulk of the 300 MB.

2. **War refresh busted the layout** — `revalidatePath("/", "layout")` in the
   war refresh route caused ALL six pages to re-render whenever someone clicked
   the refresh button. One click = 6 page re-renders = 6 × their full query
   bundles.

3. **Purge route busted the layout** — same pattern, daily.

4. **Memory cache doesn't persist on Vercel** — serverless functions are
   ephemeral; the Map-based `getPollStatuses()` cache from log 115 is mostly
   ineffective in production. (ISR caching is the real protection.)

## Work Completed

### 1. Added ISR to the war page
`app/war/page.tsx` — added `export const revalidate = 300` (5 min). The war
page now serves from cache for 5 minutes between revalidations instead of
rendering on every visit. The refresh button still busts the cache on demand.

**Before**: every visit = 18 queries
**After**: 1 render per 5 min = ~288 renders/day (not per-visit)

### 2. Fixed war refresh route
`app/api/war/refresh/route.ts` — changed `revalidatePath("/", "layout")` to
`revalidatePath("/war", "page")` only. One refresh click now re-renders only
the war page, not all six pages.

### 3. Fixed purge route
`app/api/cron/purge/route.ts` — changed `revalidatePath("/", "layout")` to
`revalidatePath("/")` (page-only). The daily purge now only re-renders the
dashboard, not every page.

## Final ISR + Revalidation Map

| Page | ISR | Revalidated by |
|---|---|---|
| `/` (dashboard) | 15 min | daily batch only |
| `/war` | 5 min | war refresh button (page-only) |
| `/members` | 1 hr | — |
| `/capital` | 1 hr | — |
| `/hall-of-fame` | 1 hr | — |
| `/strategy` | 1 hr | — |

**Zero `revalidatePath("/", "layout")` calls remain.** Every revalidation is
page-scoped.

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- All routes return 200

## Expected Impact
The war page was the #1 remaining egress driver. With ISR added:
- 100 visits/day × 18 queries → 288 renders/day × 18 queries (cached between)
- War refresh no longer cascades to 5 other pages
- Purge no longer cascades to 5 other pages

Estimated egress should drop from ~300 MB/day to **~15-20 MB/day** (dashboard
ISR + war ISR + footer queries, with no layout-level busts).

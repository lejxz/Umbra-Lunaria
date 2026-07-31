# Log 114 — Lazy-Load Charts + Member Detail Sheet (Bundle Split)

**Date:** 2026-07-31
**Time:** 02:42 PM (+08:00)

## Summary of Session
Lazy-loaded the 5 recharts chart components and the member-detail sheet via
`next/dynamic` so recharts (~400 KB gzipped) is split into a separate chunk
and only loaded when the charts render or a member is opened — not on the
initial dashboard JS bundle.

## Work Completed

### Lazy-loaded chart components
`components/dashboard/dashboard-shell.tsx` — converted 5 static imports to
`dynamic()` imports with loading skeletons:
- `DonationAnalytics` (imports `DonationChart` → recharts Bar)
- `ActivityAnalytics` (imports recharts Bar)
- `WarPerformanceChart` (imports recharts Line)
- `WarAttackDistributionChart` (imports recharts PieChart)
- `RosterSizeChart` (imports recharts Area)

Each has a `ChartSkeleton` loading fallback (glass card with pulse animation)
that matches the chart card height to prevent layout shift (CLS) while the
recharts chunk streams in.

### Lazy-loaded member detail sheet
`MemberDetailSheet` — converted to `dynamic()` with `ssr: false`. It's only
opened on click (member row → detail sheet), so its full UI (progression
cards, achievements, DonationChart, hero-equipment grouping) doesn't need to
be in the initial dashboard bundle. The sheet fetches data client-side on
open, so `ssr: false` is correct (no SSR benefit for a click-triggered modal).

## Impact

**Before**: recharts (~400 KB gzipped) + member-detail sheet UI was bundled
into the main dashboard chunk — every dashboard visitor downloaded it
immediately, even if they never opened a member or scrolled to the charts.

**After**: recharts is split into a separate chunk that loads asynchronously
when the chart components render. The member-detail sheet loads only when a
member is clicked. The initial dashboard JS bundle is significantly smaller,
improving first contentful paint and time-to-interactive.

The `ChartSkeleton` fallbacks prevent CLS — the layout is stable while the
charts stream in, and the recharts chunk is cached by the browser for
subsequent visits.

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- Dashboard renders 208KB with 0 failed queries, all real content present
  (Stars per war, Top 5 Donors, Attack quality, Clan Log)
- All 6 routes return 200

## Next Action
The client bundle is now well-optimized. Remaining candidates from the audit:
- Diff-based batch ingest (only re-fetch changed members) — reduces API calls
- Server-side memory cache (`lru-cache`) — bypasses DB on warm cache hits
- Cumulative checkpoint columns for leaderboard totals — eliminates snapshot scan

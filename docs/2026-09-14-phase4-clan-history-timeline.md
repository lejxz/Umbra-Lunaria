# Phase 4 — Clan History Timeline (F10)

**Date:** 2026-09-14
**Plan:** [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §"Phase 4 — Clan history timeline"
**Precedes this session:** a same-day UX fix — dashboard clan-log and attention-queue member rows opened the member sheet **in place** again instead of redirecting to `/members` (recorded below, §1).

## Summary of Session

Two pieces of work: (1) reverted the Phase 2.1 "redirect to /members" interaction on the dashboard's clan-log and attention-queue rows back to the dashboard-local `MemberDetailSheet` — the same interaction every other dashboard surface uses, and the only one that works for departed members; (2) executed Phase 4 / F10 in full: a clan-history timeline under the dashboard clan log — membership events per clan-TZ day (stacked bars: join / rejoin / leave / TH upgrade / rename) with capital-contribution density overlaid, a 30d/90d/all window select, and custom date ranges through the Phase 3.2 machinery.

## Work Completed

### 1. Dashboard member-click fix (user request)

**Problem.** Clicking a member in the dashboard's Clan Log (or the attention queues) performed a full navigation to `/members?tag=…`. Two flaws: it dumped the user off the dashboard mid-analysis (every other dashboard surface — donation/activity leaderboards — opens `MemberDetailSheet` in place), and for **departed-but-retained members** the target page's roster validation (`roster.entries.some(...)` in `members-shell.tsx`, current clan only) silently dropped the tag, so the user landed on a plain members page with nothing open.

**Fix.** `components/dashboard/clan-log.tsx` and `needs-attention.tsx` rows are now `<button>`s calling an `onMemberClick` prop; `dashboard-shell.tsx` passes `setSelectedMember`, opening the existing lazy-loaded dashboard `MemberDetailSheet` (fetches `/api/members/[tag]`, which serves any non-purged member — departed included). Purged clan-log rows stay disabled ("data removed"). `lib/member-links.ts` keeps documenting the `/members?tag=` URL contract (still implemented by `members-shell` for shareable links) — no component imports it now.

### 2. Phase 4 — the timeline itself

| Piece | File(s) | Notes |
|---|---|---|
| Pure aggregation | `lib/scoring/membership-timeline.ts` (new) | Merges SQL day×eventType rows into zero-filled points + window totals; day-key helpers are pure string calendar math (no `Date` parsing → no TZ drift). 16 unit tests in `tests/lib/membership-timeline.test.ts`. |
| View models | `lib/view-models/dashboard.ts` | `MembershipWindow`, `MembershipTimelinePoint`, `MembershipTimelineTotals`, `MembershipTimeline`; `CustomAnalyticsView` gains `membershipTimeline` (additive — existing consumers unaffected). |
| Query | `lib/db/queries.ts` | `getMembershipTimeline(window)` + shared `membershipTimelineForWindow(win)`. One grouped query over `membership_events` (`date_trunc('day', … AT TIME ZONE 'Asia/Manila')` — the Supabase-pooler-safe literal pattern from `getRosterSizeTrend`); `to_char(..., 'YYYY-MM-DD')` sidesteps pg naive-timestamp → JS Date TZ handling. Also wired into `getDashboard` (three precomputed windows) and `getCustomAnalytics` (inside the existing `withCache`). |
| Panel + chart | `components/dashboard/membership-timeline.tsx` (new) | Recharts `ComposedChart`: five stacked `Bar`s + `Area` overlay for capital contributors; header badge shows net roster change; 30d/90d/`all` `Tabs`; custom range via the shared control. Lazy-loaded in `dashboard-shell.tsx` (Row 5b, under the clan log) with the other recharts consumers. |
| Shared range control | `components/dashboard/range-control.tsx` (new) | The Phase 3.2 date-inputs + quick-chips + active-pill UI extracted from `donation-analytics.tsx` (which now imports it) — one look for every custom-window panel. Chip clicks pass their day keys straight to `onApply` (React state is async; same values-through pattern the donation panel already used). |
| Dashboard placement | `components/dashboard/dashboard-shell.tsx` | Full-width Row 5b directly under the clan-log row: the log answers "what happened", the timeline answers "how often, over time". |

## Decisions Made

- **One shared count axis.** Every series is "members that day" (events, distinct contributors), so the `Area` overlay sits on the *same* Y axis as the stacked bars — a secondary axis would imply a unit that doesn't exist. The summed gold amount (`capitalAmount`) is tooltip-only; its scale (production rows show single days >3.6M) would flatten the counts.
- **Zero-filled x-axis.** Days without events render as gaps, not dropped ticks — calendar spacing stays honest. "all" clamps its start to the first observed event day so a year-old tracker doesn't open with months of leading empty days.
- **Unknown event types are totals-only.** A future `event_type` shows up in totals without breaking the chart; bars stay on the five known types.
- **No migration.** `membership_events` is immutable and already carries everything, including the daily batch's `capitalContribution` delta events (`{amount, total}` metadata) — the plan's "immutable source is already the design guarantee."

## Verification

- `tsc --noEmit`, `eslint .` clean; `vitest run` 19 files / **264 tests** green (248 before + 16 new).
- `next build` + `scripts/assert-route-modes.sh`: all content routes still Static/ISR (`/` 15m unchanged — timeline data rides the existing dashboard revalidation, adding zero new fetches per tab switch), API routes dynamic.
- Read-only production smoke (script run once, not committed): 30d → 30 points (2 event days, 3 capital days); 90d → 90 points; **all → 57 points, starting 2026-07-20** (first event — the 45-leave reset is clearly visible in the data); custom `2026-08-01→2026-09-13` → 44 points, totals consistent with the overlapping preset slices. The Jul 20 mass-exodus and the raid-weekend contribution spikes render exactly as the chart is designed to show them.

## Next Action

Phase 5 — PWA/offline shell (hand-rolled `sw.js`, manifest, layout head tags, `clanConfig.features.pwa` kill switch), the last unexecuted phase of the roadmap.

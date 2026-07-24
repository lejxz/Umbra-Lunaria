# Log 067 — Dashboard Analytical Graphs (4 new charts)

**Date:** 2026-07-23
**Time:** 03:10 AM (+08:00)

## Summary of Session
Added four new analytical graphs to the dashboard: war performance trend (line chart), donation balance ratio (line overlay on the existing bar chart), roster size trend (area chart), and war attack distribution (donut chart). All four reuse existing DB data — no new ingestion, no new tables, no new API routes.

## Work Completed

### Data layer (`lib/db/queries.ts`)
Three new query functions, all wired into `getDashboard()`'s `Promise.all`:
- `getWarPerformanceTrend(limit=20)` — last 20 ended wars with stars, destruction, result. Returns oldest-first for left-to-right charting.
- `getRosterSizeTrend(days=30)` — distinct retained members per day from `member_snapshots`, grouped by `date_trunc('day', captured_at)`.
- `getWarAttackDistribution()` — count of attacks by star value (0-3) from `war_attacks`. Zero-filled so the donut always renders all segments.

### View models (`lib/view-models/dashboard.ts`)
Added `WarPerformanceTrend`, `WarPerformancePoint`, `RosterSizeTrend`, `RosterSizePoint`, `WarAttackDistribution`. Wired into `DashboardData`.

### Chart components

**1. War performance trend** (`components/dashboard/war-performance-chart.tsx`)
- LineChart: own stars (solid purple) vs opponent stars (dashed red, 50% opacity).
- Tooltip shows "vs [opponent]" as the label.
- Empty state when no war history.
- Placed in Row 2b (after the war record/current war/capital cards), 2/3 width.

**2. Donation balance ratio** (`components/dashboard/donation-chart.tsx` — modified)
- Converted from BarChart to ComposedChart (Bar + Line).
- Added a green ratio line (given/received) overlaid on the existing given/received bars.
- Second Y-axis (right side) for the ratio scale.
- Tooltip shows "N×" for the ratio.
- No new section — the ratio is an overlay on the existing donation analytics panel.

**3. Roster size trend** (`components/dashboard/roster-size-chart.tsx`)
- AreaChart with a purple gradient fill.
- Shows distinct member count per day over 30 days.
- Header shows current count.
- Empty state during cold start.
- Placed in Row 4b (after activity analytics), full width.

**4. War attack distribution** (`components/dashboard/war-attack-distribution.tsx`)
- Donut PieChart: 3★ (emerald), 2★ (amber), 1★ (red), 0★ (muted).
- Center label shows the 3★ rate percentage.
- Tooltip shows count + percentage per segment.
- Empty state when no attack data (backfilled wars have no attack detail — will populate as wars are live-tracked).
- Placed in Row 2b (next to the war performance trend), 1/3 width.

### Dashboard layout (`components/dashboard/dashboard-shell.tsx`)
- Row 2b (new): War performance trend (2/3) + Attack distribution donut (1/3) — after the war cards, before donations.
- Row 4b (new): Roster size trend (full width) — after activity analytics, before needs-attention.
- Donation ratio: overlay on existing Row 3 donation panel.

## Decisions Made
- **Reuse existing data, no new ingestion.** All 4 charts read from tables already populated by the existing cron polls (`wars`, `member_snapshots`, `war_attacks`). Zero new API calls, zero new CU consumption.
- **ComposedChart for the donation ratio.** Adding a second chart panel for the ratio would duplicate the 24h/7d/30d tab state. Overlaying a line on the existing bars reuses the same data + tabs — one panel, richer information.
- **Donut center label = 3★ rate.** The single most-asked attack-quality question is "what's our 3-star rate?" — putting it in the donut center answers it instantly without reading the legend.
- **War attack distribution empty state.** Currently 0 live-tracked attacks (the prep war has no attacks, backfilled wars have no detail). The donut shows an honest "No attack data yet" empty state rather than a fake 0% chart. It will populate automatically as wars are live-tracked.
- **Roster size per day, not per poll.** 96 polls/day × 5 members = 480 snapshot rows/day — too dense for a chart. Grouping by `date_trunc('day')` gives one clean point per day with the distinct member count.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.
- Agent Browser: dashboard renders all 4 new chart sections ("Stars per war", "Star distribution", "Roster growth", + the donation ratio overlay). No page/console errors.

## Next Action
Dashboard analytical graphs complete. The dashboard now has 6 charts total (donation bars + ratio line, activity bars, war performance line, roster size area, attack distribution donut). Next is Step 1.6 — Phase 1 integration and release gate.

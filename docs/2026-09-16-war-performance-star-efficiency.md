# War Performance — Star Efficiency Redesign

**Date:** 2026-09-16
**Time:** 02:15 PM (+08:00)

## Summary of Session
Rebuilt the dashboard's "War performance · last 20 / Stars per war" card. The raw-star line chart was answering the wrong question — it tracked lineup size, not performance — so it now plots normalized star efficiency with result encoding, a rolling trend, and the app-wide WindowPicker.

## Work Completed
- **Diagnosis**: the last 20 wars mix 5v5–40v40 lineups, so raw stars (15★ perfect 5v5 vs 120★ max 40v40) zigzag with war size. Recent 5v5 wars compressed into the bottom ~12% of the axis while April's big wars towered at the top. The old doc comment also promised win/loss dot coloring that was never implemented.
- `lib/war/star-efficiency.ts` (new) — pure normalization math: `maxStars`, `starEfficiency` (stars ÷ teamSize×3, one decimal), `rollingAverage` (trailing N, null-skipping), `summarizeWarPerformance` (W/T/L + avg efficiency).
- `WarPerformancePoint` extended with `warType`, `teamSize`, `opponentDestruction`; `CustomAnalyticsView` gained an additive `warPerformanceTrend` field.
- `getWarPerformanceTrend()` now returns **all** ended own-clan wars by default (limit optional); new `warPerformanceTrendForWindow()` powers the custom date range; both share `mapWarPerformanceRows()`.
- `GET /api/analytics` responses now include the war trend for the requested day range (cached 5 min like the rest of the view).
- `components/dashboard/war-performance.tsx` (replaces `war-performance-chart.tsx`) — the panel owns its card: WindowPicker (10 / 20 / all presets + themed calendar custom range, same control + endpoint as the donation and membership panels), W-T-L + avg-efficiency record badge, 0–100% Y axis, Us line with result-colored dots (emerald/red/muted — the WarRecordCard + attack-donut palette), dashed Them line, 3-war rolling average, hand-rolled legend row, and a custom tooltip (date, opponent, result, war size, raw stars ×/max, both destruction %, star margin).
- 14 unit tests in `tests/lib/star-efficiency.test.ts` pinning the normalization math against real values from the clan's history.

## Decisions Made
- **Efficiency over raw stars**: one honest 0–100 scale across war sizes; the tooltip keeps the visceral raw numbers ("15/15 ★ · 100%") so nothing is lost.
- **Count-based windows (10/20/all)** instead of date presets: wars are discrete, irregular events (two-month gaps), so "last N wars" is the natural window; the custom date range still covers calendar questions via end-time filtering.
- **All wars fetched server-side, windows sliced client-side** — same zero-fetch tab-switch contract as the donation/membership panels.
- Kept the angled date X-axis (works at 58 points with `minTickGap`); disabled line entry animations for instant window swaps.
- Legend hand-rolled instead of Recharts `<Legend>` for exact theme control at `text-[0.6rem]` mono.

## Next Action
Nothing blocking. Possible follow-ups: attack-usage rate (own attacks ÷ available), CWL badge differentiation once CWL wars sync, and a margin bar lane if the two-line read ever feels insufficient.

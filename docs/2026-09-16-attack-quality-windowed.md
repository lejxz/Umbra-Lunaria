# Attack Quality — Windowed Star Distribution + Tooltip Layering Fix

**Date:** 2026-09-16
**Time:** 04:10 PM (+08:00)

## Summary of Session
Rebuilt the "Attack quality / Star distribution" card as the second half of the
war-analytics row, and fixed the chart-tooltip layering bug reported alongside
it ("hover info is z-index problem with text and the card itself"). The old
all-time donut hid every number behind hover slices and had no window control;
the new card prints the distribution as tier rows over the same shared war
window as the performance panel, and its tooltips (and every other chart's)
now float above neighboring glass cards instead of being painted over by them.

## Work Completed
- **Diagnosis (z-index)**: `.glass` cards create stacking contexts via
  `backdrop-blur`, and Recharts renders tooltips *inside* their card's
  context — absolutely-positioned, but unable to escape a later-in-DOM sibling
  card. Any tooltip crossing its card's edge was overpainted by the neighbor
  card and its text.
- **Fix (globals.css)**: `.glass:has(.recharts-wrapper)` gets
  `position: relative`, and `:hover` lifts it to `z-index: 30` — the hovered
  card (the only one showing a tooltip) always wins the row. `:has()` keeps
  it opt-in per chart-bearing card with zero component churn; portals
  (WindowPicker popover, Modal) were already outside the cards and unaffected.
- **Diagnosis (card)**: the donut mixed all tracked history, forced hovering
  for exact counts, and ignored the window the neighboring panel showed —
  the same consistency problem the WindowPicker pass solved elsewhere.
- `lib/war/attack-quality.ts` (new, pure) — `summarizeAttackQuality`
  (distribution + avg stars/attack + avg destruction + 3★ rate),
  `threeStarRateDelta` (current vs preceding window of equal size, null when
  history is too short for a fair comparison), `attackTierRows` (per-tier
  count/share/avg-destruction, best → worst), `tierOf`.
- `WarAttackQualityPoint` per-war aggregate view model (own-attack rows only —
  the ingest writes `war_attacks` for own-clan attackers);
  `getWarAttackQualityTrend()` + `warAttackQualityTrendForWindow()` share one
  grouped SELECT (Postgres `FILTER` aggregates, inner join drops wars without
  attack detail); `CustomAnalyticsView` gained `warAttackQuality`;
  `getWarAttackDistribution()` and the all-time `WarAttackDistribution`
  view model retired.
- `components/dashboard/war-attack-quality.tsx` (replaces
  `war-attack-distribution.tsx`) — donut for shape (center: 3★ rate) +
  always-visible tier rows (color dot, count, share, mini bar) + 3★ delta
  chip vs prior window + passive window badge; custom themed tooltip (tier,
  count of total, share, avg destruction).
- `components/dashboard/war-analytics-row.tsx` (new) — owns ONE shared window
  for the row: the performance panel's existing WindowPicker slot drives both
  cards, one `/api/analytics` fetch feeds both datasets, and the narrow card
  shows a label instead of a second control. `WarPerformancePanel` is now
  purely presentational (`headerControl` slot).
- **Chart height bug found during live testing**: the perf card's
  `height:auto` section made `flex-1` + `height:100%` collapse to a 0-height
  ResponsiveContainer (percentages don't resolve against `min-height`). Fixed
  with `h-full` on the section — which also equalized the row's card heights.
- 12 unit tests in `tests/lib/attack-quality.test.ts` (aggregation math,
  delta sign + guards, tier rows, empty windows).

## Decisions Made
- **One window for the row, one picker**: both cards describe the same wars;
  duplicating a control in the 1/3-width card would fight for space and
  reintroduce the two-filter inconsistency. The wide card's picker keeps its
  standard placement; the narrow card carries a passive badge.
- **Inner join** (wars with ≥1 attack row): backfilled warlog wars have no
  attack detail and must not dilute the rates; a war where every attacker
  missed has no attack-quality data by definition.
- **Tier rows over donut-only**: the numbers are the story ("41×3★ of 48")
  and now read without a pointer; per-tier avg destruction says how close
  the 1★/2★ misses were.
- **Delta only for count presets** (10/20): "all" has no predecessor and a
  custom range's "before" would need a second fetch.
- Pre-existing (not fixed here, out of scope): Row 5's `h-[450px]`
  Attention/Log cards overflow horizontally at mobile widths.

## Revision — 2026-09-16 (same day, follow-up)
The stats footer (`8 wars · 48 atk · 2.9★ avg · 97% dest`) was removed at
the owner's request — the same production-copy principle as the 09-14 pass:
every number in it was already readable elsewhere (attack count = sum of the
tier-row counts, averages derive from the rows, war count is implied by the
window badge), so the line was meta text restating the chart. The footer now
renders only when a window-over-window comparison exists, holding just the
`3★ ±N% vs prior` chip (right-aligned). `summarizeAttackQuality` still
computes `wars`/`avgStars`/`avgDestruction` — they remain pinned by unit
tests and available for future cards.

## Next Action
Nothing blocking. Possible follow-ups: attack usage rate (attacks used ÷
teamSize × attacksPerMember) per window, per-member attack-quality
leaderboard, and the Row 5 mobile overflow fix noted above.

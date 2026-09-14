# Clan Pulse — Combined Activity × Roster Panel

**Date:** 2026-09-14
**Request:** "combine Activity Analytics and Roster growth and improve it (innovate on this one)"

## Summary

Replaced the two separate full-width dashboard rows — **Activity Analytics** (timeline chart + Top-5 score leaderboard, Rows 4) and **Roster growth** (30-day roster size area chart, Row 4b) — with a single **Clan Pulse — Activity & Roster** panel. The combination is not a layout merge: the panel derives what neither chart could say alone.

## The innovation

| Layer | What it does | Why it matters |
|---|---|---|
| **Per-bucket roster line** | Roster size per clan-TZ day, carry-forward aligned onto the activity buckets (step line on the same members axis as the bars) | Growth and activity finally share one time axis — a join wave or exodus is visible *at the moment it happened*, not on a separate chart below. |
| **Engagement rate line** | `active ÷ roster × 100` per bucket, on a 0–100% right axis (dashed — it's derived) | The normalization that separates *big* from *engaged*: a clan growing 30 → 45 while active goes 12 → 15 is **disengaging** (40% → 33%), which raw bars hide. This is the metric a leader actually needs. |
| **Verdict pill** | The growth × engagement 2×2: **Thriving** · **Growing, diluting** · **Tightening core** · **Fading** · **Steady / Steady roster / Steady engagement** · **Warming up** — with a plain-language tooltip one-liner | A one-glance diagnosis. Thresholds are relative and documented: roster is "flat" within `max(1, 5% of window-start roster)` (±1 matters in a 7-member clan, is noise at 50); engagement is "flat" within 5pp of second-half-vs-first-half trend. Cold start yields "Warming up", never a false "Steady". |
| **Stat chips** | `Active X/Y` · `Roster N (Δ colored)` · `Engagement R% avg (±Tpp)` | The whole story in one strip; deltas colored green/red. |
| **Top-5 leaderboard kept** | Member Activity Score podium, right column, same window state | One window state drives chart + leaderboard — no desync. |

## Implementation

| Piece | File(s) |
|---|---|
| Pure engine (align + stats + verdict) | `lib/scoring/clan-pulse.ts` — `buildClanPulse(activity, roster)`, `buildVerdict(delta, baseline, trend)`; no db/fetch/React |
| View models | `lib/view-models/dashboard.ts` — `ClanPulse`, `ClanPulsePoint`, `ClanPulseVerdict`, `PulseDirection`; `RosterSizePoint` gains `dayKey` |
| Query wiring | `lib/db/queries.ts` — `getRosterSizeTrend` returns `dayKey` via `to_char(..., 'YYYY-MM-DD')` (the Phase 4 naive-timestamp sidestep); `getDashboard` composes all 3 windows from the already-fetched timelines + the one roster query — **zero new queries** |
| Panel | `components/dashboard/clan-pulse.tsx` — ComposedChart (bars + 2 lines, dual axes), hand-rolled legend, verdict pill, chips, leaderboard |
| Shell | `components/dashboard/dashboard-shell.tsx` — Row 4 replaced, Row 4b removed |
| Deleted | `components/dashboard/activity-analytics.tsx`, `components/dashboard/roster-size-chart.tsx` |
| Tests | `tests/lib/clan-pulse.test.ts` — 16 tests: clan-TZ day alignment + carry-forward (incl. a 24h window crossing Manila midnight), null-vs-zero semantics, cold start, empty buckets, verdict matrix incl. relative thresholds and mixed-flat labels, two end-to-end scenarios (growing-but-diluting month; shrinking-but-engaged week) |

## Decisions

- **`rate` is null, never 0, before the first roster day** — "we don't know" must not render as "0% engaged".
- **Roster baseline = carry-forward value at the window's first bucket** (not "first point inside the window") — a 24h window that starts yesterday in UTC but today in Manila still gets a real baseline.
- **One roster query serves all 3 windows** — the pulse is pure composition in `getDashboard`, so ISR cost is unchanged (`/` stays 15m revalidate).
- **Odd-count trend split**: the middle bucket joins the first half (deterministic, pinned by test).
- **24h engagement averages hourly rates** — per-bucket rates are hourly fractions; the chip labels say `avg`, the tooltip gives per-bucket values. The `Active X/Y` chip (window distinct members ÷ retained roster) remains the "who was seen at all" number — two different, both-honest metrics.

## Verification

- `tsc --noEmit`, `eslint .` clean; `vitest run` 20 files / **280 tests** green (264 + 16 new).
- `next build` + `scripts/assert-route-modes.sh` — all six content routes Static/ISR with intended periods; `/` still 15m (pulse adds zero fetches).
- Live browser check (production build against the production DB): panel renders with real data; 24h/7d/30d tabs switch client-side with distinct, correct values (7d: Active 6/7 · 86%, Engagement 49% avg −2pp; 30d: Engagement +26pp rising → "Steady roster" verdict with rising-engagement nuance); chart renders bars + both lines; legend present; leaderboard click opens the dashboard-local member sheet with the URL unchanged.

## Next Action

CI/CD completion (the roadmap's final phase, follow-ups): disposable-Postgres integration job, nightly deployment smoke test, branch protection on `main` — see [`2026-09-14-ci-integration-and-smoke.md`](./2026-09-14-ci-integration-and-smoke.md).

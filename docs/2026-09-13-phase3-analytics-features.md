# Phase 3 Execution Log — Analytics Features

**Date:** 2026-09-13
**Scope:** [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §2 Phase 3 (3.1 career deltas, 3.2 custom date-range analytics, 3.3 attack targeting intelligence, 3.4 real CWL standings), executed in the plan's recommended order 3.1 → 3.4 → 3.2 → 3.3.
**Status:** Implemented and verified (vitest 248/248, `tsc --noEmit` clean, `eslint .` clean, `next build` green, `scripts/assert-route-modes.sh` all green including the new `/api/analytics`).

---

## 3.1 Achievement/career deltas over time (F8)

**What shipped.** A new `member_career_snapshots` table (migration 0013) written once per retained member per daily batch — the full career state *before* `members.career_stats` is overwritten. Two consumers:

1. **"Progress" section in the member detail sheet** — 7d/30d/all window tabs showing war stars / attack wins / capital contributions / XP levels / defense wins deltas plus the top rising achievements ("Gold Grab +150,000 · 1,000,000 → 1,150,000"). All three windows are computed server-side (three indexed LIMIT-1 baseline lookups) so switching tabs costs zero fetches.
2. **Day-grain activity evidence (plan §1.5 item 7)** — when career totals rose between two captures, the batch flags the current clan-TZ day's last `member_snapshots` row with BOTH activity flags. This is the G5/G6 closure: capital/career gameplay the 5-minute poll cannot see now marks the heatmap and login streaks.

**Signal-set decision (worth restating).** `careerMoved` fires on warStars ↑, attackWins ↑, clanCapitalContributions ↑, or any achievement value ↑. Deliberately excluded: `defenseWins` (rises when opponents LOSE attacks against the village — no login needed) and `expLevel` (already interval-grain via Phase 1's `member_snapshots.exp_level`; counting it again would double-credit the same day). Exactly ONE snapshot per member/day is flagged, so the interval-rate activity-score component gains the same weight as a single war attack, not a day's worth of polls.

**Files.**

- `drizzle/0013_career_snapshots.sql` + `drizzle/meta/_journal.json` (idx 13) — table + `(player_tag, captured_at)` index. Auto-applies on deploy (`build = drizzle-kit migrate && next build`).
- `lib/db/schema.ts` — `memberCareerSnapshots` table with documented null semantics.
- `app/api/ingest/route.ts` — the daily batch: one DISTINCT ON bulk read of each member's latest career snapshot (the diff baseline), the snapshot insert inside `processPlayer`, and the post-loop day-grain marking UPDATE (best-effort, wrapped in try/catch like every batch sub-step).
- `lib/scoring/career-deltas.ts` — new pure module: `careerMoved` (day-grain evidence), `achievementsMoved`, `diffCareerProgress` (the window diff). Tested in `tests/lib/career-deltas.test.ts` (17 cases).
- `lib/db/member-queries.ts` — `getCareerProgress` (earliest snapshot = "all" baseline + honest tracking-start date; per-window baselines fall back to earliest with `partial: true` when tracking started inside the window). Wired into `getMemberDetail`'s parallel fetch block.
- `lib/view-models/members.ts` — `MemberDetailView.progress` (three pre-computed windows) + `CareerProgressWindow`.
- `components/members/member-detail-sheet.tsx` — `ProgressSection` + `DeltaStat` (shared `MemberDetailContent` — renders in the members page, dashboard popup, and strategy popup).

**No backfill, by design.** The table starts empty; the first daily batch after deploy writes every member's baseline, and deltas accrue from the next. Until then the section renders "No career snapshots recorded yet" — honest, not fabricated zeros. Windows predating tracking show a "⚠ Tracking started <date>" partial note and measure from the earliest snapshot.

## 3.4 Real CWL standings (F1)

**What shipped.** The CWL league view's standings table now matches the plan's render contract: rank, clan, **played**, W/L/T, **stars ±** (with the for/against tooltip), destruction average — plus **promotion/relegation trajectory**: rank 1 ↑ (promotion candidate), bottom two ↓ (relegation risk).

**Rule verification.** Confirmed against Supercell's official support page during execution: *"The promotion and demotion thresholds are different in different leagues, but in most leagues, two Clans are promoted and two are demoted."* The UI therefore marks the trajectory honestly (rank 1 up, bottom two down) and the caveat states thresholds vary by league tier. Chips render only on tables with ≥6 clans (a partial 3-clan group never shows three "relegated" rows).

**Files.** `components/war/cwl-league-view.tsx` — table columns, trajectory arrows with `title`/`aria-label`, and the corrected honest caveat (the old text said other clans' wars "will appear once full league-group ingestion is active" — that ingestion has shipped in the A-4 fix, so the note now states both sides of every round are aggregated and explains the trajectory thresholds).

**Already in place from the A-4 fix session** (verified, not rebuilt): `getCwlSeason` aggregates all 8 clans from every stored CWL war matched on `own_clan_tag` OR `opponent_tag`, `syncCwlWars` syncs other clans' wars as lightweight standings rows, and the standings + round tabs replace the old day-tabs-only view. `cwl_seasons` is still empty in production (no CWL month observed since tracking began) — the feature ships ready for the next season, as planned.

## 3.2 Custom date-range analytics (F11)

**What shipped.** `WindowKind` gained `"custom"` with full validation, and the donation panel gained a date-range control (two date inputs + This month / Last month / Last 90d quick chips) that fetches a new dynamic endpoint — the dashboard page itself stays static (ISR 15m), exactly like the member detail sheet's client-side fetch.

**Files.**

- `lib/time/windows.ts` — `PresetWindowKind` (the original four) vs widened `WindowKind`; `computeCustomWindow({ from, to })` — strict `YYYY-MM-DD` (calendar-validated: `2026-02-30` is rejected), `from ≤ to`, `to` not in the future (clan-TZ), span ≤ 366 days; boundaries resolve to clan-TZ midnights via the tested `startOfDayInClanTz` (noon-UTC round-trip), covering the FULL last day. `generateBuckets` custom branch: one bucket per calendar day, chart thins labels itself.
- `lib/db/queries.ts` — the three donation helpers refactored into window-generic cores (`donationTotalsForWindow` / `donationLeaderboardForWindow` / `donationTimelineForWindow`); the preset functions delegate unchanged; new `getCustomAnalytics(from, to)` validates + composes the three under `withCache("analytics:<from>:<to>", …, 5 min)` — the plan's day-pair-keyed mitigation against range-scanning.
- `app/api/analytics/route.ts` — new dynamic route; 400 with the validator's message on bad input, 500 wrapped like the other API routes.
- `components/dashboard/donation-analytics.tsx` — the range control; preset tabs clear the custom state; an active range renders its pill ("Sep 1 – Sep 30 · 30d ✕") and takes over totals/chart/leaderboard; failed ranges keep the previous data on screen with the inline error message (no half-empty panel).
- `components/ui/tabs.tsx` — `active` widened to `string | null` (no tab selected while a custom range is active; first tab keeps the roving-tabindex entry point so keyboard nav still works).
- `scripts/assert-route-modes.sh` — `assert_dynamic "/api/analytics"` added; the ISR contract for the six content routes is asserted unchanged.
- `tests/lib/windows.test.ts` — +13 cases: validation (valid range → clan-TZ midnights + day count, today accepted, future `to` rejected, from > to rejected, malformed ISO rejected, non-existent calendar day rejected, >366 days rejected, exactly-366 leap-year span accepted) and custom bucket generation (per-day buckets, midnight anchoring identical to the equivalent preset, no truncation on a 366-day span).

## 3.3 Attack targeting intelligence (F9)

**What shipped.** A strategy-page section answering "who attacks up/down well?": a clan-wide table over the five THΔ buckets (−2, −1, 0, +1, +2+ — defender TH minus attacker TH, positive = attacking up) and a per-member table (most attacks first) with each member's best Δ bucket (worst in the tooltip).

**Files.**

- `lib/scoring/targeting.ts` — new pure module: `bucketThDelta` (clamp + label), `computeTargeting` (always returns all five buckets in display order so the table never reshuffles as data accrues; per-member best/worst Δ requires ≥2 attacks in a bucket — one lucky 3★ up-attack is not evidence). Tested in `tests/lib/targeting.test.ts` (14 cases).
- `lib/db/strategy-queries.ts` — `getTargetingIntelligence`: the ≤30 most recent snapshot-backed wars, their own-side attacks (war_attacks stores own-clan attackers only), TH levels resolved once per war from the stored `CocCurrentWar` snapshot (both clans' members), then the pure aggregation. Best-effort: malformed snapshots skip that war. Returned on `StrategyPageData.targeting` (null when no snapshot-backed attacks exist).
- `lib/view-models/strategy.ts` — `TargetingIntelligence` / `TargetingThBucket` / `TargetingMember`.
- `components/strategy/targeting-panel.tsx` — the panel, rows click through to the member detail sheet; coverage note states the honest limitation (war-log backfilled wars carry no defender detail and are excluded) and the ≥2-attack rule.
- `components/strategy/strategy-shell.tsx` — section 3 between Review Needed and the member sheet.

---

## Verification

| Check | Result |
|---|---|
| `bun run test` (vitest) | 248/248 green (210 pre-existing + 38 new: 17 career-deltas, 14 targeting, 13 custom-windows — one pre-existing custom-window case folded) |
| `bun run typecheck` (`tsc --noEmit`) | clean |
| `bun run lint` (`eslint .`) | clean |
| `bunx next build` | green — all six content routes still ○ (Static) with intended revalidate; `/api/analytics` ƒ (Dynamic) |
| `scripts/assert-route-modes.sh` | all green — now asserts 6 static + 6 dynamic routes |

**Deployment notes.** Migration 0013 auto-applies on deploy. The Progress section renders its cold-start note until the first daily batch writes baselines (deltas appear from the second batch). The targeting panel populates immediately from the 7 existing live-tracked wars' 41 attacks. The CWL standings improvements render as soon as a `cwl_seasons` row exists (next CWL month). `/api/analytics` needs no new environment variables.

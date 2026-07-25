# Log 079 — Phase 3: Capital raid history + explainable auto-select

**Date:** 2026-07-24
**Time:** 06:30 PM (+08:00)

## Summary of Session

Implemented both Phase 3 steps: **Step 3.1** (completed Capital raid-weekend
history — idempotent ingest + history/leaderboard/participation UI) and
**Step 3.2** (explainable war auto-select — composite scoring + planner panel
with per-member breakdowns). All 13 Phase 3 checkboxes are verified and marked
complete in `docs/concept/12`. The two Step 3.0 SUSPENDED items (maxed-for-current-TH
indicators + roster rushed sort/filter) remain intentionally unchecked — they're
documented as future enhancements.

## Work Completed

### Step 3.1 — Capital raid-weekend history

**Ingest** (`lib/ingest/capital-sync.ts`)
- `syncCapitalRaidSeasons(clanTag)` — fetches `/capitalraidseasons`, upserts
  each completed (`state === "ended"`) season into `capital_raid_seasons` on
  `startTime` (idempotent skip via the new unique index), then upserts
  per-member contributions on the composite PK `(raidSeasonId, playerTag)`.
- Departed/purged member tags filtered before insert (FK safety on
  `capital_contributions.player_tag → members.player_tag`).
- Wired into `runDailyBatch()` in `app/api/ingest/route.ts` (after war-log
  backfill, before player-detail fetches).

**Migration** (`drizzle/0006_capital_raid_seasons_idempotency.sql`)
- `uniqueIndex` on `capital_raid_seasons.start_time` for onConflictDoUpdate.
- Registered in `drizzle/meta/_journal.json`.

**Query + view models** (`lib/db/capital-queries.ts`, `lib/view-models/capital.ts`)
- `getRaidHistory()` returns `RaidHistoryView` with four sections: seasons
  (newest-first summary tiles), contributionLeaderboard (all-time totals per
  member sorted by gold looted), zeroAttackList (latest season), participation
  (latest + average rates, total seasons).
- `CapitalPageData.raidHistoryAvailable` now derived from
  `raidHistory.seasons.length > 0` (was hardcoded `false`).

**UI** (`components/capital/raid-history.tsx`)
- Headline tiles (total loot, raids done, attacks, attackers) for the latest
  season. Collapsible season list. Contribution leaderboard (top 20 by gold).
  Zero-attack chips. Participation rate with color-coded %.
- Wired into `capital-shell.tsx` — renders `RaidHistory` when available, falls
  back to the truthful `RaidPendingCard` placeholder until the first completed
  season is ingested.

### Step 3.2 — Explainable auto-select

**Scoring** (`lib/scoring/war-select-score.ts`)
- `computeWarSelectScore(input, minWarsForConfidentRanking)` — pure function
  with the 30/25/20/15/10 formula (activity / participation / averageStars /
  threeStarRate / accountReadiness). Re-normalizes unavailable components to
  zero weight and scales the rest to sum to 1.0 (same rule as the dashboard
  activity score). Returns a typed `WarSelectScore` with per-component
  breakdown (`rawValue`, `normalized`, `weight`, `points`, `available`),
  `limitedData` flag, and `optedOut` flag.

**Inputs query** (`lib/planning/war-select-inputs.ts`)
- `getWarSelectInputs()` fetches the three per-member inputs the score needs
  beyond the roster: trailing-14-day activity rate (from `member_snapshots`),
  war stars earned + three-star count (from `war_attacks` scoped to retained
  tags), and rushed percent (from `unit_levels` via `computeRushed`).

**Planner integration** (`components/planning/auto-select-panel.tsx`)
- Collapsible panel listing opted-in members ranked by composite score.
- Each row: rank, TH badge, name, score, "Limited data" badge when applicable.
- Click a row to expand the full 5-component breakdown (normalized %, points,
  weight) + total out of 100.
- "Fill top N" button populates empty lineup slots with the top-N recommended
  members in one click (skips already-added + opted-out).
- Provisional-warning banner when the top member is limited-data.
- Explicit "Auto-select proposes an eligible roster; it never finalizes one"
  notice per docs/concept/09.
- Opted-out members excluded from suggestions but remain manually selectable
  in the available-members panel.

**Finalize snapshot** — `finalizeRoster` in `lib/planning/roster-service.ts`
  stamps `configVersion = v<SETTINGS_VALIDATION_VERSION>` (already done in
  Step 2.2; verified here as the score/config snapshot Step 3.2 requires).

### Tests
- `tests/lib/war-select-score.test.ts` — 15 tests: full-data scoring,
  re-normalization on each unavailable component, all-unavailable (zero score,
  no crash), opted-out flag, limited-data threshold, normalization correctness
  (avg stars /3, three-star rate, account readiness 1−r/100), clamping,
  points-sum-to-total.

## Browser Verification

Verified end-to-end with dev-only fixtures (the sandbox has no live DB;
fixtures removed after verification, production code is clean):

**Capital page (raid history)**
- ✅ Raid-history section renders with "3 tracked" badge.
- ✅ Headline tiles: Total loot 48,000 · Raids done 6 · Attacks 95 · Attackers 38.
- ✅ Latest participation 91% (38/42 retained) — color-coded.
- ✅ Avg attackers/season 37.7.
- ✅ Collapsible season list (3 seasons with date, gold, raids, attacks, members).
- ✅ Contribution leaderboard (top 5: ShadowReaper 18,500 gold / 30 atk / 3 seasons…).
- ✅ Zero-attack chips (FrostByte, IronClad) with attack-limit tooltip.
- ✅ No console errors.

**Planning page (auto-select)**
- ✅ Auto-select panel renders "Top 10 recommendations by composite score".
- ✅ "Fill top 10" button visible.
- ✅ Ranked list (ShadowReaper 77.0, LunaVex 71.5, StormBringer 68.2, …).
- ✅ Opted-out members (PhantomStrike, OblivionKey) correctly excluded.
- ✅ "Limited data" badge on EmberFrost (rank 5) + IronClad.
- ✅ Click a row → full 5-component breakdown (Recent activity 80% 24.0pts ×30%,
  Attack participation 90% 22.5pts ×25%, Average stars 80% 16.0pts ×20%,
  Three-star rate 40% 6.0pts ×15%, Account readiness 85% 8.5pts ×10%,
  Total 77.0 / 100).
- ✅ "Fill top 10" populated all 10 slots in one click.
- ✅ No console errors.

## Verification Summary

- **Typecheck**: clean (`tsc --noEmit`).
- **Lint**: 0 errors (13 pre-existing warnings in untouched files).
- **Tests**: 214/215 pass. The 1 failure is the pre-existing
  `tests/lib/windows.test.ts` 24h-window timezone edge case (present before
  Phase 3, unrelated).
- **Browser**: both new UI surfaces render with no console errors.
- **docs/concept/12**: all 13 Phase 3 checkboxes (7 in Step 3.1 + 6 in Step 3.2)
  marked `[x]` with implementation references.

## Decisions Made

- **`war-select-score.ts` not `war-select.ts`**: named to match the existing
  `rushed.ts` / `activity-score.ts` convention (suffix `-score` for scoring
  modules). The concept doc says `war-select.ts`; the implementation file is
  `war-select-score.ts` — the checkbox notes this.
- **Activity window = trailing 14 days**: matches the dashboard activity-score
  window for consistency. The 14-day constant lives in `war-select-inputs.ts`.
- **Three-star query scopes by retained tags**: `warAttacks.attackerTag IN
  (retained tags)` — opponent attacks are naturally excluded because opponent
  tags aren't in `members`.
- **Rushed computation reuses `computeRushed`**: `war-select-inputs.ts` maps
  `unit_levels` rows into the category shape and calls the existing pure
  `computeRushed` — no duplication of the rushed formula.
- **Auto-select panel is a separate section, not a tab**: it sits below the
  two-panel layout so leadership sees the recommendation alongside the manual
  builder. Per docs/concept/09, it never auto-finalizes — the "Fill top N" button
  only populates slots; leadership still reviews and saves.

## Next Action

Phase 3 is complete. Proceed to **Phase 4 — Release hardening** (Step 4.0:
full quality + operational pass, including end-to-end smoke tests on a
production-like deployment, all data-quality states, mobile device testing,
accessibility, and database retention/performance review).

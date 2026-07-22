# Log 063 — DB Test Strategy (Mocked Query Boundary) + All Category B Deferred Items Resolved

**Date:** 2026-07-22
**Time:** 11:55 PM (+08:00)

## Summary of Session
Resolved all 4 Category B deferred items (lines 57, 90, 130, 162) via the mocked query boundary approach (Option 1). Extracted pure decision logic from the DB-touching ingest/query/war-sync code into testable modules, wrote 58 new tests (137 total, up from 79), and documented the strategy in tests/README.md. The Neon branch approach (Option 2) was deferred due to the 100 CU-hour free-tier limit.

## Work Completed

### Pure-logic extraction (3 new modules)

1. **`lib/ingest/membership.ts`** — `reconcileMembership()` (join/leave/rejoin/refresh decisions + purge-date calculation) and `computeActivityFlags()` (reset-aware activity + login flags). Extracted from `app/api/ingest/route.ts`.

2. **`lib/ingest/war-identity.ts`** — `matchExistingWar()` (CWL warTag matching + regular opponentTag+startTime matching). Extracted from `lib/ingest/war-sync.ts` `syncCurrentWar`.

3. **`lib/war/war-snapshot.ts`** — `parseWarSnapshot()`, `buildAnalysis()`, `toHistoryEntry()`, `buildClanSide()`, `buildRosterMember()` + the Raw* JSONB interfaces. Extracted from `lib/db/war-queries.ts`, decoupled from the Drizzle row type via a `WarRow` interface so tests can pass plain fixtures.

### Wiring (3 existing files updated)

- **`app/api/ingest/route.ts`** — `runLightPoll` now calls `reconcileMembership()` to decide operations, then applies them to the DB. `insertMemberSnapshot` now calls `computeActivityFlags()` instead of inline flag logic.
- **`lib/ingest/war-sync.ts`** — `syncCurrentWar` now calls `matchExistingWar()` for the identity decision.
- **`lib/db/war-queries.ts`** — imports `parseWarSnapshot`/`buildAnalysis`/`toHistoryEntry` from `lib/war/war-snapshot.ts` instead of defining them locally. ~300 lines of duplicated logic removed.

### Tests (4 new files, 58 new tests)

| File | Tests | Covers |
|---|---|---|
| `tests/ingest/membership.test.ts` | 17 | join/leave/rejoin/refresh, retention purge-date, mixed scenarios, activity flags (first poll, donation increase, reset-only-no-login, BB trophies) |
| `tests/ingest/war-identity.test.ts` | 12 | CWL warTag match, regular opponentTag+startTime match, empty candidates, idempotency across state transitions |
| `tests/war/war-snapshot.test.ts` | 16 | null/missing snapshot, cold start (no attacks), battle-day attacks, missing API values, attack-log filtering, analysis (never-fake-a-zero, 3★ rate, avg stars, no-attack count, best attack, avg TH), history mapping |
| `tests/lib/donation-reset-sequences.test.ts` | 9 | 24h/7d/30d windows with weekly resets, cold start, edge cases (all-before-window, single-snapshot, reset-between-baseline-and-window) |

### Documentation

- **`tests/README.md`** — documents the mocked query boundary strategy: what's tested (pure logic), what's not (SQL-shape/DB-constraint behavior, verified manually), how to run tests, and the failed-poll-safety caveat (route-level control flow, not pure-function).

### Plan checkboxes updated

- Line 57 (DB-test strategy) — **RESOLVED** (mocked query boundary, documented)
- Line 90 (ingestion behavior tests) — **RESOLVED** (membership + war-identity tests)
- Line 130 (query edge-case tests) — **RESOLVED** (war-snapshot tests)
- Line 162 (donation reset seeded data) — **RESOLVED** (donation-reset-sequences tests)

## Decisions Made
- **Option 1 (mocked query boundary) over Option 2 (Neon branch).** Neon's free tier allows 100 CU-hours; a test branch consuming compute on every test run risks the allowance. The mocked approach extracts pure logic — no DB needed, tests run in <3s.
- **Extract, don't mock Drizzle.** Mocking Drizzle's chainable query builder is fragile. Instead, the decision logic (what to insert/update, how to match identity, how to parse snapshots) is extracted into pure functions that take plain inputs and return decisions. The thin DB I/O layer stays in the route/query modules, verified by inspection + live manual testing.
- **Failed-poll safety is route-level.** The pure `reconcileMembership` function can't test "don't call me on a failed fetch" — that's control flow in `runLightPoll`. The function does test that it faithfully reports leaves for all retained members when given an empty live roster (correct only when the roster was genuinely fetched). Documented in tests/README.md.

## Verification
- `bun run typecheck` — 0 errors.
- `bun run test` — 137 passed (12 test files, 2.4s). Up from 79 tests before this session.
- `bun run lint` — 0 errors (10 pre-existing warnings, no new warnings).

## Next Action
All deferred items in the implementation plan are now resolved or explicitly suspended/dropped. The plan is clean. Continue to Step 1.5 — Capital (concept/08).

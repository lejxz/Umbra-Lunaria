# Test Strategy

This project uses a **mocked query boundary** approach (docs/concept/12 Step 1.0.A
"DB-test strategy" — the "Option 1" pure-logic extraction approach) rather
than an isolated test database. The original rationale was Neon's free-tier
compute limit (100 CU-hours — a separate test branch consuming compute on
 every test run would risk the allowance); the approach was kept after the
Supabase migration because it is fast, free, and keeps the blast radius of a
test run at zero. Pure decision logic is extracted from
DB-touching code into testable functions, and the thin DB I/O layer is
verified by inspection + live manual verification.

## How it works

```
┌─────────────────────────────────────────────────────────────┐
│  Route / Query layer (DB I/O — verified manually + live)    │
│   app/api/ingest/route.ts                                   │
│   lib/db/queries.ts, lib/db/war-queries.ts                  │
│   lib/ingest/war-sync.ts                                    │
│                      ↓ calls                                │
│  Pure logic layer (unit-tested with Vitest)                 │
│   lib/ingest/membership.ts    → reconcileMembership         │
│   lib/ingest/war-identity.ts  → matchExistingWar            │
│   lib/war/war-snapshot.ts      → parseWarSnapshot           │
│                                  buildAnalysis              │
│                                  toHistoryEntry             │
│   lib/scoring/donations.ts     → calculateDonationDelta     │
│                                  calculateDonationWindow    │
│   lib/scoring/war-metrics.ts   → computeWinRate             │
│   lib/scoring/rushed.ts        → rushed formula             │
│   lib/scoring/war-record.ts    → getWarRecord               │
└─────────────────────────────────────────────────────────────┘
```

The pure functions take plain inputs (arrays, primitives, fixture objects)
and return decisions/view-models — no `db`, no `fetch`, no React. Tests
import them directly and assert on the returned values. This catches logic
regressions (wrong join/leave decision, wrong war identity match, wrong
donation reset handling, wrong analysis math) without needing a database.

## What's tested

| Test file | Covers | Concept/12 item |
|---|---|---|
| `tests/ingest/membership.test.ts` | join / leave / rejoin / refresh decisions, retention purge-date, activity flags, failed-poll caveat | Step 1.0.D (line 90) |
| `tests/ingest/war-identity.test.ts` | CWL + regular war identity matching, idempotency across state transitions | Step 1.0.D (line 90) |
| `tests/ingest/purge-retention.test.ts` | purge retention rule — reset-day donation-delta preservation incl. a 300-trial randomized fuzz over the app's window shapes | — |
| `tests/war/war-snapshot.test.ts` | snapshot parsing (null/missing clans, cold start, attacks), analysis (3★ rate, avg stars, no-attack count, best attack), history mapping | Step 1.1.C (line 130) |
| `tests/lib/donation-reset-sequences.test.ts` | realistic 24h/7d/30d seeded sequences with weekly resets, cold start | Step 1.2.C (line 162) |
| `tests/lib/donation-delta.test.ts` | basic reset-aware delta logic | Step 1.1.B |
| `tests/lib/rushed.test.ts` | rushed analysis at multiple TH levels | Step 3.0 |
| `tests/lib/win-rate.test.ts` | war win-rate "never fake a zero" | Step 1.1.B |
| `tests/lib/queries-logic.test.ts` | war-record view-model assembly | Step 1.1.C |
| `tests/lib/activity-score.test.ts` | Member Activity Score computation | Step 1.1.B |
| `tests/lib/windows.test.ts` | time-window boundary computation — exact 24h windows, clan-midnight anchoring for 7d/30d, day-key primitives | Step 1.1.B |
| `tests/lib/login-streak.test.ts` | HoF "dedicated" streak — Manila-midnight boundary cases (the extracted B-1 regression suite) | — |
| `tests/lib/clan-pulse.test.ts` | Clan Pulse — combined Activity × Roster panel engine: clan-TZ day alignment + carry-forward, engagement rate, verdict matrix, end-to-end scenarios | — |
| `tests/integration/db.test.ts` | **Integration** (only with `INTEGRATION_DATABASE_URL`, localhost-refused-otherwise): migrations journal, purge SQL == pure model, departed-member purge, war pruning, roster-size day bucketing, activity timeline window counts | assessment §8.3 |

## Integration tests (disposable Postgres)

`tests/integration/db.test.ts` runs the real migrations and the real SQL against a disposable Postgres — the upgrade path the original strategy deferred. It activates **only** when `INTEGRATION_DATABASE_URL` is set, and the URL must be localhost (the suite refuses anything else, so it can never touch a deployment database). CI runs it in a `postgres:18-alpine` service container (`.github/workflows/ci.yml` → `integration` job). Locally:

```bash
docker run -d --name ul-int -p 5433:5432 -e POSTGRES_PASSWORD=ci -e POSTGRES_USER=ci -e POSTGRES_DB=ci postgres:18-alpine
INTEGRATION_DATABASE_URL=postgres://ci:ci@localhost:5433/ci bunx vitest run tests/integration
```

## What's NOT tested (and why)

The remaining thin DB I/O layer — the Drizzle queries the integration suite doesn't yet cover (ingest-side writes, war sync, capital sync) — is verified by:

- Live manual verification against the production Supabase DB (Node scripts + Agent Browser).
- The query functions' return types (TypeScript catches shape mismatches at compile time).
- DB-constraint behavior (unique indexes, FK cascades) via the schema definition + migration — and the migration journal itself is now asserted by the integration suite.

The highest-risk SQL (purge passes, roster/day bucketing, activity windows) is covered by `tests/integration/db.test.ts`. Extending that suite to the ingest write path is the natural next increment if SQL-shape regressions appear there.

## Running the tests

```bash
bun run test          # run all tests once
bun run test:watch    # watch mode
```

Tests run in Node (no browser, no DB). They're fast (<3s total) because
they're pure-logic. No environment variables beyond what Vitest needs.
Current state: 15 files, 176 tests, all passing.

## Failed-poll safety (docs/concept/04 #3)

The rule "a failed clan fetch must not mark members as left/inactive" is
enforced at the **route level** (`runLightPoll` returns early before
reconciliation when the clan fetch fails). The pure `reconcileMembership`
function can't test this control-flow decision — but it does test that
faithfully reports leaves for every retained member when given an empty live
roster, which is the correct behavior ONLY when the live roster was
genuinely fetched. The route-level guard ensures the function is never called
on a failed fetch.

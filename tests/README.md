# Test Strategy

This project uses a **mocked query boundary** approach (concept/12 Step 1.0.A
"DB-test strategy" — the "Option 1" pure-logic extraction approach) rather
than an isolated test database. The rationale: Neon's free tier limits compute
to 100 CU-hours, and a separate test branch consuming compute on every test
run would risk the allowance. Instead, pure decision logic is extracted from
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
| `tests/war/war-snapshot.test.ts` | snapshot parsing (null/missing clans, cold start, attacks), analysis (3★ rate, avg stars, no-attack count, best attack), history mapping | Step 1.1.C (line 130) |
| `tests/lib/donation-reset-sequences.test.ts` | realistic 24h/7d/30d seeded sequences with weekly resets, cold start | Step 1.2.C (line 162) |
| `tests/lib/donation-delta.test.ts` | basic reset-aware delta logic | Step 1.1.B |
| `tests/lib/rushed.test.ts` | rushed analysis at multiple TH levels | Step 3.0 |
| `tests/lib/win-rate.test.ts` | war win-rate "never fake a zero" | Step 1.1.B |
| `tests/lib/queries-logic.test.ts` | war-record view-model assembly | Step 1.1.C |
| `tests/lib/activity-score.test.ts` | Member Activity Score computation | Step 1.1.B |
| `tests/lib/windows.test.ts` | time-window boundary computation | Step 1.1.B |
| `tests/lib/unit-icon-map.test.ts` | unit-name-to-asset mapping | Step 1.0.B |

## What's NOT tested (and why)

The thin DB I/O layer — the actual Drizzle queries (SELECT/INSERT/UPDATE) —
is not unit-tested. This is the tradeoff of Option 1:

- **SQL-shape regressions** (a wrong join, a NULL-handling bug) aren't caught
  by pure-logic tests. These are verified by:
  - Live manual verification against the production Neon DB (Node scripts +
    Agent Browser).
  - The query functions' return types (TypeScript catches shape mismatches
  at compile time).
- **DB-constraint behavior** (unique indexes, FK cascades) is verified by
  the schema definition + migration, not by tests.

If SQL-shape regressions become a real risk, the upgrade path is to add a
Neon branch test database (Option 2) — but that's deferred given the 100
CU-hour free-tier limit.

## Running the tests

```bash
bun run test          # run all tests once
bun run test:watch    # watch mode
```

Tests run in Node (no browser, no DB). They're fast (<1s total) because
they're pure-logic. No environment variables beyond what Vitest needs.

## Failed-poll safety (concept/04 #3)

The rule "a failed clan fetch must not mark members as left/inactive" is
enforced at the **route level** (`runLightPoll` returns early before
reconciliation when the clan fetch fails). The pure `reconcileMembership`
function can't test this control-flow decision — but it does test that
faithfully reports leaves for every retained member when given an empty live
roster, which is the correct behavior ONLY when the live roster was
genuinely fetched. The route-level guard ensures the function is never called
on a failed fetch.

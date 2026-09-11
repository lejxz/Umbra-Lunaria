# Priority Fixes — 2026-09-11

**Scope:** Implementation pass over the prioritized action plan in [`2026-09-10-application-assessment.md`](./2026-09-10-application-assessment.md). This document records every change, why it was made, and how it was verified. Items from the assessment's §10 plan that are **not** in this document remain open (see "Deferred" at the end).

**Verification results (this pass):**
- `tsc --noEmit`: **clean**
- `vitest run`: **150/150 tests pass** (13 files, 2.75s)
- `next build`: compiles clean — **all six content routes now render `○ (Static)` with their intended revalidate periods** (was: all `ƒ (Dynamic)`), API routes correctly stay dynamic
- `eslint .`: clean, no warnings
- Build-verified First Load JS: `/` 126 kB · `/capital` 116 kB · `/war` **128 kB** (was 252) · `/members` **124 kB** (was 245) · `/strategy` **113 kB** (was 244) · `/hall-of-fame` **116 kB** (was 245)

---

## 1. A-1 — ISR restored on every route (P0, biggest cost/perf lever)

**Change:** removed `await cookies()` from the root layout. The sidebar collapse state is now restored from `localStorage` in a mount effect inside `components/navigation.tsx` (the cookie + localStorage dual-write in the toggle is now a single localStorage write — the cookie was only ever read by the layout).

**Files:** `app/layout.tsx`, `components/navigation.tsx`

**Why:** accessing `cookies()` in a layout is a dynamic API — it opted the entire route tree into dynamic rendering, which silently disabled the Full Route Cache / ISR. Every `export const revalidate` in the app was dead code; every pageview was a serverless invocation with full SSR + DB queries. The controlled build in the assessment predicted static output once the call was removed; this pass confirms it in the route table (above).

**Behavior note:** the sidebar briefly renders expanded on first paint for users who collapsed it, then settles to collapsed after mount. This replaces an entire-app performance regression with a one-frame cosmetic flash on a low-frequency preference.

## 2. A-2 — Migration journal integrity repaired (P0)

**Changes:**
1. `drizzle/0002_hall_of_fame.sql` rewritten to match `lib/db/schema.ts`: `rank integer NOT NULL DEFAULT 0` + the composite `UNIQUE("award_key", "rank")`, all statements idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, constraint guarded by a `pg_constraint` DO-block).
2. `drizzle/meta/_journal.json`: `0002_hall_of_fame` inserted between 0001 and 0003 (when=1784577600000) and subsequent `idx` values renumbered — the journal now accounts for every file on disk.
3. `drizzle/0010_cwl_war_identity.sql` (new) carries belt-and-braces HoF reconciliation (see A-4 for its primary content): adds the rank column and composite unique if missing, and drops the legacy single-award unique when the composite exists.
4. `scripts/truncate.ts` guarded: refuses to run when `NODE_ENV=production` and requires an explicit `--confirm-drop-hof` flag.

**Why:** `drizzle-kit migrate` never applied 0002 (missing journal entry), so a fresh bootstrap produced no `hall_of_fame_records` table — the reason `getHallOfFame`/`getCachedAwards` wrap their queries in try/catch. The 0002 SQL on disk also didn't match the hand-altered production table (no `rank`, wrong unique). Combined with an unconditional truncate script, the HoF was one careless command away from being un-rebuildable.

**Deploy behavior (verified against drizzle-orm 0.44's pg migrator):** migrations apply when `journal.when > last applied created_at`. On the existing deployment, 0002's older timestamp means the migrator skips it (the live table is already hand-altered to the correct shape — and 0010's reconciliation converges it anyway); on a fresh database it applies in order and creates the correct table. Both paths are safe because every statement is idempotent. The `build` script (`drizzle-kit migrate && next build`) applies 0010 automatically on the next deploy.

## 3. A-3 — Members page O(N²) fan-out removed (P0)

**Changes:**
- `app/members/page.tsx` no longer embeds a `MemberDetailView` for every roster member. The server render is now roster + one activity-score leaderboard.
- `components/members/members-roster.tsx` fetches details on click from the existing `GET /api/members/[tag]` — the same pattern the dashboard already used — with loading/error inline states.
- `lib/db/queries.ts`: `getMemberActivityScore` wrapped in `withCache("activityScore:<window>", ttl=5 min)` (the only full-roster query that was neither request-deduped nor TTL-cached; 5-min TTL matches the light-poll cadence).

**Why:** each of the ~50 embedded `getMemberDetail` calls internally re-ran the full-roster `getMemberActivityScore("30d")` (all 30-day snapshots for all members + wars + raid contributions), ~51 full-roster scans and 300+ queries per render, all serialized into the HTML payload. The detail data is now one cached leaderboard + per-click fetches.

**Bundle side-effect:** the members page's `MemberDetailSheet` is lazy-loaded (`dynamic()`, `ssr: false`) so the detail UI + recharts no longer ship in the initial bundle — 245 kB → 124 kB First Load JS.

## 4. A-4 — CWL foreign-war pollution fixed (P0) + real standings (Feature 1)

**Changes:**
- `wars` gains two columns (`drizzle/0010_cwl_war_identity.sql`): `own_clan_tag text` (which clan the "own" side is) and `involves_own_clan boolean NOT NULL DEFAULT true`. The migration backfills: foreign CWL rows (the standings-only rows synced without a snapshot) → `involves_own_clan = false`; every own-clan war gets `own_clan_tag = '#2JPCYP98L'` (matches `config/clan.config.ts`). A supporting partial index `wars_involves_own_clan_idx` is created.
- `lib/ingest/war-sync.ts`: all three sync paths now write the identity columns — `syncCurrentWar` (own/true), `backfillWarLog` (own/true), `syncCwlOtherWar` (foreign side's tag/false).
- Query filters added (`involves_own_clan = true`) in: `getWarCenter` (active war + both history branches), `getDashboardWarSummary` (active + last-ended), `getNeedsAttention` (current war), `getWarDetail`'s current-war status, and `getWarPerformanceTrend` (foreign stars were also polluting the dashboard chart — a fifth affected query the original assessment didn't enumerate).
- `getCwlSeason` (`lib/db/war-queries.ts`) rewritten: round detection now keys off `involvesOwnClan` (was: "has a snapshot" heuristic), and **standings aggregate over every stored league war from both sides** — own side contributes `own_stars`, opponent side contributes `opponent_stars`, `result` flips when the clan was the opponent. Pre-fix foreign rows (`own_clan_tag` NULL) still count for their opponent-side clan; the table completes as each round re-syncs.

**Why:** during CWL the `wars` table holds up to 4 simultaneous foreign `preparation`/`inWar` rows with near-identical start times; the tie-break in "current war" queries could select a foreign war, silently blanking the War Center or showing foreign stars on the dashboard, and a full season's ~21 foreign rows crowded the 50-slot history. The standings rewrite also unlocks the assessment's Feature 1 (real 8-clan CWL standings) from data already being synced every poll.

## 5. B-1 — HoF "dedicated" streak timezone bug (P1)

**Change:** `lib/db/records-updater.ts` now measures streak continuity in clan-timezone calendar days via a new `diffCalendarDaysInClanTz` helper (built on the existing `startOfDayInClanTz`), replacing the raw UTC-millisecond comparison with the 1.5-day tolerance.

**Why:** a Monday 23:55 Manila login followed by Wednesday 00:05 Manila is a ~24h10m UTC gap — the old tolerance counted it as consecutive despite Tuesday being missed; conversely two logins either side of Manila midnight could collapse into one day. Continuity is now exactly "adjacent calendar days in the clan timezone." While in the file, the delete-all + re-insert HoF rewrite was wrapped in a single `db.transaction` (a mid-rewrite failure used to leave the HoF empty until the next daily batch).

## 6. B-3 — Hydration mismatches (P1, three classes)

- `components/war/war-hero.tsx` — the stale-capture flag now uses the `serverNow` prop instead of `Date.now()` in render.
- `components/members/members-roster.tsx` — `ActivityIndicator`/`ActivityDot` compute "today" via a `useClanTodayStr()` hook that resolves after mount (null during SSR/hydration), so server and client HTML always agree.
- `components/capital/raid-timer-banner.tsx` + `raid-history.tsx` (3 sites) — `timeZone: "Asia/Manila"` pinned on every `toLocaleString`/`toLocaleDateString` that was formatting in the visitor's local zone.

## 7. Additional fixes (P2 batch)

| Fix | File(s) | Change |
|---|---|---|
| B-4 score > 100 | `lib/scoring/activity-score.ts` | `warNormalized` clamped to [0, 1] (CWL roster quirks with `attacksUsed > attacksAllowed` could push totalScore past the 100 scale) |
| B-5 checkpoint zero-overwrite | `lib/ingest/checkpoints.ts` | members with zero snapshots are skipped instead of having `cumulative_*` clobbered to 0 (snapshot-chain loss no longer destroys lifetime totals) |
| B-8 detail-sheet races | `components/dashboard/member-detail-sheet.tsx`, `components/war/war-detail-sheet.tsx` | AbortController + ordering guard + per-session memo (rapid A→B clicks can't cross-render; reopening doesn't refetch) |
| B-9 refresh dead-end | `components/war/war-hero.tsx` | the stale notice no longer tells users to press a button that is stubbed out (refresh stays disabled per docs log 116; the notice now points at the scheduled sync) |
| B-10 unbounded scans | `lib/db/member-queries.ts` (`getLatestActivity`), `lib/db/queries.ts` (`getNeedsAttention`) | converted to SQL `DISTINCT ON (player_tag)` — one row per member from Postgres instead of scanning the entire retained snapshot history into JS every render |
| §5 bundle bloat | `war-shell`, `strategy-shell`, `hall-of-fame-shell`, `members-roster` | member-detail sheets lazy-loaded via `dynamic(..., { ssr: false })` exactly as `dashboard-shell.tsx` already did — 4 pages drop from ~245 kB to 113–128 kB First Load JS |
| §6.2 security headers | `next.config.ts` | `poweredByHeader: false` + `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a moderate CSP (script-src keeps Next's required unsafes; every other class pinned to self + the CoC asset CDN) |
| §6.3 `sql.raw` interpolation | `lib/db/queries.ts` (`fetchBoundedSnapshots`) | tag array now a bound parameter via `sql.param` + `= ANY($1::text[])` instead of string-interpolated `ARRAY[...]` (was not exploitable — tags come from the DB — but injection-shaped) |
| B-11 docs drift | `README.md`, `app/capital/page.tsx`, `app/members/page.tsx` | README clan tag corrected to `#2JPCYP98L`, capital page ISR comment now explains the effective 5-min period, members page comment matches the new fetch-on-click reality (DB-provider language was corrected to Supabase in the 2026-09-11 follow-up — the "Neon deployment" claim came from a stale credential, see [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §0) |

---

## Verification detail

- **Route table (after this pass):**

```
┌ ○ /                     126 kB   Revalidate 15m
├ ○ /capital              116 kB   Revalidate 1h
├ ○ /hall-of-fame         116 kB   Revalidate 1h
├ ○ /members              124 kB   Revalidate 1h
├ ○ /strategy             113 kB   Revalidate 1h
└ ○ /war                  128 kB   Revalidate 5m
  (API routes: ƒ /api/ingest, /api/cron/purge, /api/members/[tag],
   /api/war/[id], /api/war/refresh — dynamic, as designed)
```

- The build ran against the `DATABASE_URL` from the deployment environment; the credentials were rejected by the provider (`password authentication failed`) — that URL was a stale Neon credential, not the deployment database (Supabase; resolved 2026-09-11), so all pages prerendered their error/empty states — which each page's existing try/catch handles gracefully, and which still proves the rendering-mode flip. **Operational follow-up:** rotate that Neon credential wherever it still exists, as with any secret shared in plaintext.
- Migration 0010 was not executed here (no reachable database); the deploy pipeline's `drizzle-kit migrate` applies it. Its statements are idempotent and the migrator's skip-if-older behavior for the re-journaled 0002 was verified against the installed drizzle-orm's `pg-core/dialect.cjs` migrate loop.

## Deferred (tracked, not in this pass)

> **Update (2026-09-11, second pass):** items 1–4 below were subsequently
> implemented and verified — see
> [`2026-09-11-remaining-issues.md`](./2026-09-11-remaining-issues.md) for
> the change log and evidence (kept here for the historical record).

1. **B-2 reset-day donation retention** in the purge route — needs a data-model decision (keep last-pre-reset snapshot, or persist daily donation-delta summaries at batch time).
2. **§4.5 batch ingest writes** — collapsing the light poll's ~150 sequential round-trips into multi-row inserts/updates; worth doing with a disposable-Postgres integration harness.
3. **§8 CI route-mode assertion** — grep the `next build` output for the six `○ (Static)` lines to prevent an A-1 regression; add the extracted streak algorithm test.
4. **B-6/B-7 window + login-day boundary polish**, accessibility (keyboard row access, Select ARIA), footer reload vs. ISR (B-12), and the remaining dead-code/dedup cleanup (§6.4).

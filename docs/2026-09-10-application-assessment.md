# Umbra Lunaria — Application Assessment

> **Follow-up (2026-09-11):** the P0 items (A-1 through A-4) plus B-1, B-3 and a P2 batch from this assessment were implemented and verified — see [`2026-09-11-priority-fixes.md`](./2026-09-11-priority-fixes.md) for the change log and build/test evidence. The Deferred section there tracks what remains.

**Date:** 2026-09-10
**Scope:** Full-stack review of the production application (ingest pipeline, database layer, query layer, UI, tests, deployment) — ~70 components, 15 server modules, 13 test files, 10 migrations.
**Method:** Complete source read + two focused sub-reviews (frontend, tests/scoring) with every critical claim re-verified by hand, plus a **live production build** (`next build`) to confirm rendering modes and bundle sizes, and a full test-suite run.

**Verification results:**
- `vitest run`: **150/150 tests pass** (13 files, 2.66s)
- `next build`: compiles clean, but **all 6 routes render `ƒ (Dynamic)`** (see Finding A-1)
- Build-verified First Load JS: `/` 126 kB · `/capital` 115 kB · `/war` 252 kB · `/members` 245 kB · `/strategy` 244 kB · `/hall-of-fame` 245 kB

---

## 0. Executive Summary

Umbra Lunaria is a well-engineered single-clan dashboard with unusually strong fundamentals for a hobby project: a disciplined pure-logic/tested boundary (150 passing tests), idempotent ingestion, reset-aware donation accounting, "never fake a zero" null-propagation semantics, graceful degradation everywhere, and an impressive 116-entry engineering log. The architecture (page → shell → section components; view-model isolation; CoC proxy isolation) is genuinely good.

However, the review surfaced **one systemic issue that silently defeats the app's entire cost/egress strategy**, plus a handful of correctness bugs with real data impact:

1. **The root layout's `await cookies()` call makes every route dynamic.** A controlled build experiment proves it: with the call present, all routes are `ƒ (Dynamic)` (SSR + DB queries on *every pageview*); with it removed, all routes become `○ (Static)` with the intended ISR periods. Every `export const revalidate` in the app is currently dead code, and the egress optimizations documented in logs 110–116 are not delivering the caching they describe.
2. **Migration integrity is broken** — `drizzle/0002_hall_of_fame.sql` is absent from `drizzle/meta/_journal.json` and out of sync with `schema.ts` (missing `rank` column, wrong unique constraint). A fresh environment cannot bootstrap the Hall of Fame table, and `scripts/truncate.ts` can brick it irrecoverably.
3. **The members page has an O(N²) query amplification** — `getMemberDetail` is fanned out to every roster member, and each call internally runs the *full-roster* activity-score computation (~50× redundant 30-day snapshot scans, ~300+ queries per render), with all results serialized into the HTML payload.
4. **During CWL, other clans' wars pollute "active war" and war-history queries** — the `wars` table has no column identifying the first clan of a foreign war, so `getWarCenter`, `getDashboardWarSummary`, and `getNeedsAttention` can all select a *foreign clan's war* as "the current war."

None of these are fatal, and all have contained fixes (§7 lays out a prioritized plan). The sections below give the category-by-category assessment.

---

## 1. Scorecard

| Category | Grade | One-line verdict |
|---|---|---|
| Architecture & modularity | **A−** | Clean layering (view-models / pure logic / query layer), consistent patterns, excellent engineering log |
| Correctness (edge cases) | **B−** | Strong null-semantics, but CWL query pollution, streak timezone bug, reset-day donation loss |
| Database design | **B+** | Sensible schema, good indexes, idempotent syncs; migration journal integrity broken |
| Query performance / egress | **C** | Members-page O(N²); unbounded snapshot scans in 3 queries; reactCache used well elsewhere |
| Rendering & caching (ISR) | **D** (currently) | All ISR exports nullified by `cookies()` in root layout — verified by build |
| Frontend bundle | **B−** | Dashboard lazy-loads charts; 4 other pages eagerly bundle recharts (~245 kB vs 126 kB) |
| Security | **B−** | Ingest/purge properly authed; refresh endpoint open by design; `sql.raw` interpolation smell; no security headers |
| Testing | **B** | 150 solid pure-logic tests; zero coverage of routes, SQL, purge, and two scoring bugs live in untested code |
| Accessibility | **B−** | Excellent modals/tabs/keyboard support; table rows and custom Select not keyboard/ARIA accessible |
| DevOps & docs | **B+** | CI, cron design, README mostly excellent; docs drift (ISR comments, clan tag, Supabase vs Neon) |

---

## 2. Critical Findings (verified, P0)

### A-1. `cookies()` in the root layout nullifies ISR on every route

`app/layout.tsx:57`:

```ts
const cookieStore = await cookies();
const isCollapsed = cookieStore.get("umbra_sidebar_collapsed")?.value === "true";
```

`cookies()` is a dynamic API — accessing it in a layout forces the **entire route tree into dynamic rendering**, which disables the Full Route Cache / ISR. Verified by controlled experiment:

| Build | Route table |
|---|---|
| As committed (with `cookies()`) | `/`, `/members`, `/war`, `/capital`, `/strategy`, `/hall-of-fame` → **`ƒ (Dynamic)`** |
| Same code, `cookies()` removed | All six → **`○ (Static)`** with the intended revalidate periods (15m / 1h / 5m / 1h / 1h / 5m) |

**Impact:** every pageview = serverless invocation + full SSR with DB queries (the dashboard runs ~24 queries per request; the members page runs hundreds — see A-3). The `revalidate` values exported on every page, the `revalidatePath("/")` calls in the ingest/purge/refresh routes, the `withCache` TTLs sized "for ISR windows," and the entire egress narrative in docs logs 110–116 are all operating on a caching layer that is currently inert. The measured egress improvements from those logs likely predate the sidebar cookie being added to the layout (or came from the fetch-level data cache, which still works).

**Fix (small):** the sidebar state is *already mirrored* to `localStorage` in `components/navigation.tsx:46-47`. Read the initial collapsed state client-side (mounted state, default open) and delete the cookie read from the layout — routes go static immediately. Alternatively keep the cookie but read it in a client component. This one-line-class change is worth more than every other performance item in this report combined.

### A-2. Migration journal integrity is broken (HoF table)

- `drizzle/meta/_journal.json` jumps from `0001_phase1_hardening` straight to `0003_war_snapshot` — **`0002_hall_of_fame.sql` is not in the journal**, so `drizzle-kit migrate` never applies it. A fresh database bootstrap produces **no `hall_of_fame_records` table** (which is exactly why `getHallOfFame` and `getCachedAwards` wrap their queries in `try { … } catch { /* table may not exist */ }`).
- The 0002 SQL itself no longer matches `schema.ts`: it creates `UNIQUE("award_key")` with **no `rank` column**, while `lib/db/schema.ts:371-392` declares `rank` + `unique(award_key, rank)` (the live DB was evidently hand-altered to match the code).
- Compounding the danger, `scripts/truncate.ts` does an unconditional `DROP TABLE IF EXISTS hall_of_fame_records CASCADE` with no prompt and **no environment guard**. Run once by accident and migrations cannot restore the table — the HoF page goes dark until it's hand-rebuilt.

**Fix:** write a new idempotent migration that reconciles the table to `schema.ts` (`rank` column + composite unique, `CREATE TABLE IF NOT EXISTS` + `ALTER`), add it to the journal, and either delete `scripts/truncate.ts` or add a `NODE_ENV=production` refusal + confirmation prompt. Re-running `drizzle-kit generate` against the current `schema.ts` and reconciling the diff is the cleanest path.

### A-3. Members page O(N²) fan-out — the heaviest request path in the app

`app/members/page.tsx:36-44`:

```ts
const [detailEntries, activityScore] = await Promise.all([
  Promise.all(roster.entries.map(async (m) => getMemberDetail(m.playerTag))),  // ×50
  getMemberActivityScore("all"),
]);
```

`getMemberDetail` (`lib/db/member-queries.ts:95-181`) runs ~6 queries, and — critically — its `getDonationDetail` helper (`member-queries.ts:362`) calls **`getMemberActivityScore("30d")`**, a full-roster computation that itself loads *all* 30-day snapshots for *all* members, all wars in window, all war participants, and all raid-season contributions. It is therefore executed **once per roster member (≈50×), plus once more at page level ("all")** — roughly **51 full-roster scans and 300+ queries per render**, for data that is 49/50 identical between calls.

The result set is then fully serialized: every member's ~150 progression units, ~90 achievements, 30 activity buckets and 30 donation buckets are embedded in the RSC payload/HTML (multi-MB page weight), and — per build output — recharts rides along in the initial bundle for the detail sheet.

**Fix (either end of the pipe, ideally both):**
1. Fetch member detail **on click** via the existing `GET /api/members/[tag]` route — the dashboard already does exactly this (`components/dashboard/member-detail-sheet.tsx`). The members page keeps only roster + activity-score columns server-side.
2. If embedding is intentional, wrap `getMemberActivityScore` in `withCache` (it is currently the only uncached full-roster query) and pass its result *into* the detail computation instead of recomputing it per member.

### A-4. CWL: other clans' wars pollute active-war and history queries

`syncCwlWars` (`lib/ingest/war-sync.ts:399-465`) syncs **all** wars in the league group — ours *and* the other clans' (stored via `syncCwlOtherWar` with `warSnapshot: null`). During a CWL round, the `wars` table therefore holds 4 simultaneous `preparation`/`inWar` rows with near-identical `startTime` — only one of which involves the clan. Three queries select "the current war" without distinguishing ours:

- `getWarCenter` (`lib/db/war-queries.ts:101-106`): `WHERE state IN ('preparation','inWar') ORDER BY startTime DESC LIMIT 1`
- `getDashboardWarSummary` (`lib/db/queries.ts:952-957`): same pattern; its "last ended war" fallback (`state='warEnded' ORDER BY endTime DESC`) can likewise return a **foreign clan's result** to the dashboard war card.
- `getNeedsAttention` (`lib/db/queries.ts:759-764`) and `getWarDetail`'s current-war status (`lib/db/member-queries.ts:509-514`): `state != 'warEnded' ORDER BY id DESC`.

When the tie-break lands on a foreign war, `parseWarSnapshot` returns null (no snapshot) and the War Center silently shows **no active war while one is running**; on the dashboard, the "current war card" can show a foreign war's stars/opponent. Additionally, foreign wars flow into the **war history list** (`getWarCenter` history query excludes only the active row; `components/war/war-history.tsx` renders all rows with a "CWL" badge) — a full CWL season contributes ~21 foreign rows that crowd the 50-slot history at the expense of the clan's own wars.

**Root cause:** the `wars` table has no column for the first clan's tag — `syncCwlOtherWar`'s own comment (`war-sync.ts:510-517`) wrestles with this ("we need to store both clan tags") and `getCwlSeason` (`war-queries.ts:246-271`) works around it by only using wars with a snapshot, which is also why **CWL standings are only computed from the clan's own matches** (each clan shows 0/1 wars played — the full table the league-group data could support is not built).

**Fix:** add an `own_clan_tag` column (or a boolean `involves_own_clan`) set by the sync, and filter all four queries on it; then `getCwlSeason` can finally compute real standings from the foreign wars already being stored and fetched every poll.

---

## 3. Potential Bugs (P1/P2)

Each of these was traced to specific lines; severity reflects user-visible impact.

### B-1. HoF "dedicated" streak counts across missed days (timezone bug) — P1
`lib/db/records-updater.ts:157-167` dedupes login days with `isSameDayInClanTz` but then measures streak continuity in **raw UTC milliseconds** (`diff ≤ 1.5 days`). A login Mon 23:55 Manila (15:55 UTC) followed by Wed 00:05 Manila (Tue 16:05 UTC) is a ~24h10m UTC gap → counted as **consecutive despite Tuesday being missed**; conversely two logins either side of Manila midnight can collapse into one day. The 1.5-day tolerance should be a clan-timezone calendar-day comparison. The streak algorithm is embedded in a DB function and untested — extracting it to `lib/scoring/` would have caught this. Related: the `records-updater.ts:149-156` fallback substitutes `cumulativeLoginDays` (a *total*-days count) as a *streak* — semantic mismatch, acknowledged only in-comment.

### B-2. Reset-day donations are permanently lost after pruning — P1
The purge route's intra-day pruning (`app/api/cron/purge/route.ts:109-119`) keeps only the **last** snapshot per member per day for data older than 7 days, with the rationale "the LAST snapshot has the highest donation counter (preserving the delta chain)." That is false on weekly-reset days: if the reset lands mid-day (donations 200 → reset → 5), the day's surviving pair is (prev-day 200 → end-of-day 5), and the 200 pre-reset donations are permanently undercounted in every future 30d window and per-day bucket (`member-queries.ts:380-422` re-derives daily deltas from the surviving chain). Cumulative checkpoints are computed pre-prune, so *lifetime* totals stay correct — the distortion is windowed analytics only. Mitigation options: skip pruning on reset days, keep both last-pre-reset and last-of-day snapshots, or persist a daily donation-delta summary table at batch time.

### B-3. Hydration mismatches (3 distinct classes) — P1
- `components/war/war-hero.tsx:92-95` — `Date.now()` in render for the stale flag; crossing the 1-hour boundary between SSR and hydration flips the banner (DOM mismatch).
- `components/members/members-roster.tsx:389, 425` — `new Date().toLocaleDateString()` in render for "active today" dots; crossing Manila midnight between server/client render flips the color.
- `components/capital/raid-timer-banner.tsx:40-45` and `components/capital/raid-history.tsx:259, 355` — `toLocaleString` **without `timeZone`** (every other file pins `Asia/Manila`); SSR formats in UTC, client in browser TZ → guaranteed text mismatch for non-UTC users.

### B-4. Activity score can exceed 100 — P2
`lib/scoring/activity-score.ts:121-126` — `warNormalized` is not clamped to ≤ 1.0; if `attacksUsed > attacksAllowed` (CWL roster quirks, data glitches), the war component exceeds its weight cap and `totalScore` can exceed the 100 scale. One-line clamp fix.

### B-5. Checkpoint zero-overwrite on snapshot loss — P2
`lib/ingest/checkpoints.ts` computes from scratch and overwrites: a retained member with **zero** snapshots gets their `cumulative_*` columns set to 0. Any snapshot-chain loss (manual truncate, restore, bug) permanently clobbers lifetime totals that HoF "philanthropist" depends on. Guard: skip members with no snapshots instead of zeroing, and wrap the per-member loop in a transaction (currently N sequential non-atomic UPDATEs — a mid-loop failure leaves half the roster stale).

### B-6. 24h window is 24–25h long; final activity bucket stretches — P2
`lib/time/windows.ts` `computeWindow("24h")` snaps `from` to the hour but leaves `to = now` with minutes/seconds — windows run up to ~59m59s long, and the last hourly bucket in `getActivityTimeline` covers up to ~2h. Tests never catch it because they always pass on-the-hour `now` values. Also documented-but-not-implemented: daily buckets are anchored at "now minus N days" rather than Manila midnight, so donations between midnight and the anchor hour land in the previous day's bucket (the spec in docs/concept/04 says boundaries should be clan-timezone wall clock; the dead `startOfDayInClanTz` helper exists but is only used by tests).

### B-7. Login-day dedup is inconsistent across the codebase — P2
`checkpoints.ts:76-80` dedupes login days by **UTC** date slice (self-acknowledged "approximate"), while `records-updater.ts` uses `isSameDayInClanTz`. Boundary logins (±8h around Manila midnight) over- or under-count `cumulativeLoginDays` by a day vs the HoF streak's own definition.

### B-8. Detail-sheet fetch races — P2
`components/dashboard/member-detail-sheet.tsx:25-50` and `components/war/war-detail-sheet.tsx:46-67` fetch on click with **no AbortController and no ordering guard**: rapid clicks on member A then B can resolve out of order and render A's data under B's sheet. Also no client-side memo — reopening the same member refetches.

### B-9. War refresh UX dead-end — P2
`war-hero.tsx:143-147` tells users "Use Refresh to update" when the capture is stale, but `war-refresh-button.tsx` is stubbed to `return null` (temporarily disabled in log 116) — the full implementation sits in comments and `refreshTtlSeconds` is still plumbed DB → page → shell → hero → dead button. Either resurrect the button (the endpoint and 45s shared TTL are still live) or remove the notice; the current state tells users to press a button that doesn't exist.

### B-10. `getLatestActivity` / `getNeedsAttention` fetch unbounded snapshot history — P2
`lib/db/member-queries.ts:198-210` fetches **all** activity-flagged snapshots for all members (no time bound) to find the latest one per member; `queries.ts:741-749` does the same for the whole snapshot set. Daily last-of-day snapshots are kept forever by design, so these scans grow linearly forever (50 members × ~730 rows ≈ 36.5k rows per render after two years). Both should be a SQL `DISTINCT ON (player_tag) … ORDER BY captured_at DESC` (the pattern `fetchBoundedSnapshots` already uses) — one row per member.

### B-11. Stale ISR values and docs drift — P3
The header comment on 5 of 6 pages contradicts the exported `revalidate` (e.g. `app/members/page.tsx:13` says "300s (5 min)" + "detail sheets fetched client-side"; the export is 3600 and details are embedded server-side — both halves wrong). `/capital`'s *effective* ISR is 5 minutes, not the exported 3600: `getRaidTimer`'s fetch uses `revalidate: 300` and Next takes the minimum fetch revalidate as the route's period — contradicting the page's "1 hr — capital changes weekly" comment. Also: README says the clan tag is `#2Y8V8VGQ` while `config/clan.config.ts:17` has `#2JPCYP98L`; README + env docs describe Supabase while the deployment DATABASE_URL is a Neon pooler.

### B-12. Footer auto-reload fights the cache — P3
`components/layout/footer.tsx:57-65` triggers `window.location.reload()` when a poll looks overdue. Under ISR (once A-1 is fixed) this just re-serves the same cached HTML — a wasted reload. Related: `use-server-clock`'s drift correction is biased by the ISR cache age (serverNow is stale by up to the revalidation window), so countdowns run late by the cache age; fine while everything is dynamic, worth revisiting after A-1.

---

## 4. Database Optimizations

1. **Fix the rendering mode first (A-1)** — it is a *database* optimization in disguise: while routes are dynamic, every pageview re-runs the query layer against Neon/Supabase; the 60s `withCache` on the footer only covers one query.
2. **Cache or hoist `getMemberActivityScore`** — it is the only full-roster, multi-table query that is neither `reactCache`d (per-render) nor `withCache`d (TTL). It runs 3× per dashboard render (fine) but ~51× per members page render and once per strategy render. A `withCache(key = "activityScore:" + window, ttl = 5 min)` plus passing results into `getMemberDetail` collapses A-3.
3. **De-duplicate `fetchBoundedSnapshots`** — the dashboard calls it 9× per render (3 donation functions × 3 windows) over overlapping ranges; a `reactCache` keyed by window would cut it to 3.
4. **Bound the unbounded scans** (B-10) — convert two "fetch everything, find latest in JS" queries to `DISTINCT ON`.
5. **Batch ingest writes** — `runLightPoll` performs per-member sequential `await`s: 50 snapshot inserts + up to 50 member UPDATEs + 50 snapshot-lookups (`insertMemberSnapshot` does a per-member `SELECT … ORDER BY DESC LIMIT 1`). A single multi-row `INSERT` for snapshots, one `UPDATE … FROM (VALUES …)` for member refresh fields, and one prior-snapshot query per poll would cut the light poll from ~150 round-trips to ~5 and comfortably within the 10s Hobby budget.
6. **Transaction the HoF rewrite** — `checkHallOfFameRecords` `DELETE`s all rows then re-inserts 500 (`records-updater.ts:247-262`); a failure between leaves the HoF empty until the next daily batch. Wrap in `db.transaction`, or switch to upsert-and-delete-extraneous.
7. **`checkpoints` batch UPDATE** — N sequential UPDATEs → single statement with a `VALUES` join; also make it atomic with the purge that depends on it.
8. **Pool sizing / pooler notes** — `max: 1` is right for the serverless model. Worth pinning explicit notes that the connection string must be the *transaction pooler* (port 6543 style) for Supabase — several queries already carry pooler-compatibility workarounds (log 109: `AT TIME ZONE` literal because parameterized forms fail through PgBouncer), so documenting the constraint prevents regressions.
9. **`DISTINCT ON` purge SQL is correct but untested** — the 7-pass purge is raw SQL with subtle semantics (dedupe keys, partial unique indexes, NULL-safe filters). It's the single most destructive code path in the app and has zero tests; a disposable-Postgres integration test would be cheap insurance.
10. **Small wins:** `getWarParticipationSummary` loads *all* `war_participants` rows into JS to aggregate — a `GROUP BY player_tag` does it in one row per member; `getMemberDetail`'s `recentWars` loop runs a per-war `SELECT` (10 round-trips) where one `inArray` fetch would do.

---

## 5. Performance Optimizations (server + client)

**Server:**
- A-1 (rendering mode) and A-3 (members fan-out) dominate; everything else is rounding error by comparison.
- `getDashboard` runs 24 parallel queries — good — but three of them re-derive identical war-participation aggregations; the `reactCache` wrappers on `getRetainedMembers`/`getTrackingStart` are the right pattern to extend.

**Client / bundle (build-verified):**
- **Lazy-load recharts on 4 pages.** Only the dashboard uses `next/dynamic` for charts. `components/members/member-detail-sheet.tsx` statically imports `DonationChart`, and the shells for `/war`, `/strategy`, `/hall-of-fame` statically import the dashboard's member-detail sheet — so recharts + a 732-line detail UI ship in the initial bundle of all four (245–252 kB First Load JS vs the dashboard's 126 kB). Wrap the member-detail sheets in `dynamic()` exactly as `dashboard-shell.tsx:22-42` already does.
- **Trim framer-motion:** `components/ui/modal.tsx` imports `motion/AnimatePresence` but the `Modal` itself animates with CSS+rAF; only the unused `Sheet` export needs framer-motion. Every page pays for it via the modal.
- **Delete dead code:** `components/ui/data-table.tsx` (404 lines, fully built, keyboard/ARIA-complete — and used by nothing), `card-mount.tsx`, `Sheet`, `stat-card.tsx` variant, ~10 unused icon wrappers, the commented-out refresh button body. `next.config.ts` could also add `experimental.optimizePackageImports` for `lucide-react`/`recharts`.
- **No streaming:** zero `Suspense` boundaries and no `loading.tsx`/`error.tsx` anywhere — pages block on the full dataset before first paint. Once routes are static this matters less, but wrapping the heavy sections (charts, clan log) in Suspense would give instant shells during revalidation.
- **Roster rows aren't memoized** — typing in the members search re-renders 50 rows × 2 markups (desktop + mobile); `React.memo` on the row components is a cheap win on low-end mobile.
- `globals.css:26` uses `background-attachment: fixed` for the body background — ignored/janky on iOS Safari.

---

## 6. Improvements (code quality, architecture, ops)

1. **Secrets/config hygiene:** the sandbox-injection workaround in `lib/env.ts` (reads `.env` directly, strips `sslmode`) is dev-tool logic living in the production path — gate it behind `NODE_ENV` or move it to the scripts. The `ssl: { rejectUnauthorized: false }` pool is the standard serverless tradeoff, but a comment pinning the accepted risk (and a TODO to use the provider CA bundle) would be more honest than silent verification-skipping.
2. **Security headers:** `next.config.ts` has none — add `poweredByHeader: false`, `X-Content-Type-Options`, `Referrer-Policy`, and a basic `X-Frame-Options`/CSP. The CoC asset host is already allowlisted for images, so a CSP is straightforward.
3. **`sql.raw` interpolation (injection-shaped):** `fetchBoundedSnapshots` (`queries.ts:1264`) builds `ARRAY['tag1','tag2']::text[]` via string interpolation inside `sql.raw`. Tags currently originate from the DB/CoC API (alphanumeric), so it's not directly exploitable — but it's one refactor away from being fed user input, and `inArray` is used correctly 20 lines below. Replace with `inArray` (or parameterized `= ANY($1)`); same for the timezone literal (safe today because it's a config constant, worth a guard comment).
4. **Duplication to consolidate:** `formatRole` ×2, local `StatCard` ×2, podium rank-styling blocks ×3, the member-sheet selected-state logic re-implemented in 5 shells (extract `useMemberSheet()`), duplicate HoF scripts (`seed-hof.ts` ≡ `trigger-hof.ts`), dead `fixtureCurrentWar` fixture, `win-rate` tests pinned twice.
5. **eslint:** `eslint.config.mjs:48` disables `react-hooks/set-state-in-effect` globally to silence one Modal pattern — scope the disable to that rule violation instead.
6. **Accessibility:** desktop/mobile roster rows and war-roster rows use `<tr onClick>` with no `tabIndex`/`role`/Enter handler (keyboard users cannot open member details — ironic given the unused `DataTable` solves exactly this); the custom `Select` has no combobox ARIA or arrow-key navigation; the members search input has placeholder-only labeling; 👑/★ rank glyphs lack text alternatives.
7. **Docs truth pass:** the ISR comments (B-11), README clan tag, Supabase-vs-Neon story, and `tests/README.md` (lists 11 of 13 test files) all need a sync with reality. The repo's own "stale comments are actively misleading" risk is the price of the otherwise excellent log discipline.
8. **`db:push` npm alias points at the migrate script** — it never performs a schema push, which will confuse the next contributor trying to reconcile drift (exactly the situation migration 0002 is in).

---

## 7. Feature Additions

Ranked by leverage against the existing data model — everything here builds on tables and pipelines that already exist.

### High value, low effort (data already collected)
1. **Real CWL standings table** — the league-group payload and all 28 league wars are already synced every poll; the only missing piece is the `own_clan_tag`/`involves_own_clan` column (A-4). Full 8-clan standings with stars-for/against, destruction tiebreakers, and promotion/relegation indication.
2. **Discord/Telegram webhook notifications** — join/leave events, war start/end with result, Hall-of-Fame record breaks, "X attacks remaining with 2h left". All triggers already exist as DB state transitions in the ingest loop; a `runtime_settings`-configured webhook URL fits the existing table.
3. **Deep-linkable member profiles** — `/members?tag=#XXXX` (or a route segment) opening the detail sheet, so leadership can share a member's card in chat. The detail API route already exists; it's URL state + a small mount effect.
4. **CSV export of roster/war-participation/donations** — leadership tooling for spreadsheets; trivial server-side from existing view-models.
5. **Donation ratio targets / flags** — ratio data is computed in three places already; surface "below clan median" in needs-attention (configurable via `runtime_settings`, which the schema already reserved for exactly this).
6. **War log v2 for backfilled wars** — the warlog API returns `expEarned` and attack counts already stored; a small enrichment pass gives history rows more substance without the snapshot.

### Medium effort, high engagement
7. **Reinstate war roster planning (Phase 2)** — the strategy page's auto-suggest ranking is live and good; the removed drag-and-drop builder (logs 077–080) is the natural continuation. The schema lesson from the removal (don't persist planning state without auth) stands — consider localStorage-only rosters, or bring back `runtime_settings`-backed sessions with the admin-secret pattern that already exists for ingest.
8. **Achievement/career deltas over time** — `careerStats` JSONB snapshots are captured daily; diffing them surfaces "war stars +12 this month," which currently only donations get. A small daily-batch step + one query.
9. **Attack targeting intelligence** — war snapshots store defender tags/TH/map position + stars/destruction per attack; a "best/worst matchups by TH delta" analysis for war prep would differentiate the tool from generic trackers.
10. **Clan history timeline** — membership_events is an immutable audit log already; a timeline visualization (joins/leaves/rename/TH-upgrade density) is a pure query + chart.
11. **Custom date-range analytics** — the window system is parameterized (`24h/7d/30d/all`); a `?from=&to=` query-driven window is a contained extension for "how did we do last CWL."
12. **PWA/offline shell** — mobile-first audience; a service worker + manifest on top of ISR pages gives members instant repeat loads and a home-screen icon. Only worth it after A-1 (caching must actually work).

### Bigger swings
13. **Auth-gated leadership views** — the no-auth design is documented and deliberate; if planning (7) returns with persistence, a lightweight `ADMIN_SECRET` cookie session (the same secret pattern as ingest) unlocks write features without user accounts.
14. **Multi-clan support** — the entire config is a single `clanConfig.clanTag` constant threaded through queries; parameterizing it is a refactor of moderate size and would unlock family-of-clans usage. Not recommended soon — the single-clan constraint is load-bearing in many simplifications.
15. **Builder Base 2.0 tracking** — `unit_levels.builderBase` payload is captured but almost unused in the UI (one summary); troop/hero levels, versus trophies trend, and BB activity would round out the member page.

---

## 8. Testing Assessment

**What's strong:** the "mocked query boundary" strategy is executed with real discipline — 13 files, 150 tests, all pure logic, all passing (2.66s). Donation reset-aware accounting, war identity idempotency, activity-score weighting/re-normalization, rushed math, and window generation are all pinned, including deliberately-pinned contract quirks (documented deviations from earlier task briefs). Zero flakiness patterns (no timers, no randomness).

**Where the bugs actually live:** every correctness issue found in this review (A-2, A-4, B-1, B-2, B-5, B-6) sits on the untested side of the boundary — API routes, DB query semantics, purge SQL, and the two scoring algorithms that were never extracted from DB-coupled modules. The test README is honest about the tradeoff, but the boundary has drifted from "pure logic" to "everything that turned out to be hard to test."

**Recommended additions, in order of defect-prevention per hour:**
1. Extract + test the HoF streak algorithm (`records-updater.ts:157-167`) — B-1 falls out immediately (feed it Manila-boundary sequences).
2. A `next build` + route-mode assertion in CI (assert the six pages are static with expected revalidate) — this single check would have caught A-1 the day the cookie was added. Cheap: build output is greppable.
3. One disposable-Postgres integration suite (dockerized PG, run migrations, run a few queries + the purge SQL against seeded data) — covers A-2, B-2, B-10, and the journal integrity permanently.
4. Route-level auth tests (401 paths for `/api/ingest` + `/api/cron/purge` are one-liners with high regression value).
5. Small: disk-existence check in `unit-icon-map.test.ts` (currently only checks path strings), update `tests/README.md` (2 undocumented files), delete the dead `fixtureCurrentWar`.

---

## 9. Security Assessment

The trust model is coherent: a read-only public dashboard with no user data beyond CoC public profiles, two bearer-secret write paths, and one public action endpoint. Within that model:

- ✅ `/api/ingest` and `/api/cron/purge` are properly bearer-authed with distinct secrets, and failed auth is logged with a missing-vs-mismatched distinction — genuinely good observability practice.
- ⚠️ `/api/war/refresh` is public with a per-instance 45s TTL (documented design). Practical exposure: an attacker can force ~1 CoC API call per 45s per warm serverless instance, and `revalidatePath("/war")` on success — cheap page-invalidations on demand. Acceptable for this threat model; if it ever isn't, move the TTL to the shared `withCache` layer (multi-instance coherent) or require the ingest secret.
- ⚠️ No security headers / CSP (§6.2) — one config block.
- ⚠️ `fetchBoundedSnapshots`'s `sql.raw` array construction (§6.3) — not currently exploitable, wrong pattern to normalize.
- ✅ Secrets are consistently kept out of the repo (`.gitignore` covers `.env*`; the config file pattern is documented as non-secret).
- 📝 Operational note from this review: the deployment's `DATABASE_URL` in the environment we were given points at a **Neon** pooler and its credentials were rejected (password auth failed) — while the README describes Supabase. Either the env var we received is stale or the docs are; worth reconciling, and if that credential is genuinely live anywhere, rotate it (as with any secret that has been shared in plaintext).
- 📝 `sslmode` stripping + `rejectUnauthorized: false` is the standard serverless compromise, but it does mean TLS without verification on the DB leg; a pinned CA bundle would close it.

---

## 10. Prioritized Action Plan

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Remove `cookies()` from root layout; restore sidebar state client-side (A-1) | XS | Restores the entire ISR/egress strategy; biggest cost + perf lever in the repo |
| 2 | Repair migration journal + reconcile 0002/schema; guard or delete `scripts/truncate.ts` (A-2) | S | Makes fresh deploys and recovery possible |
| 3 | Stop embedding all member details on `/members`; fetch-on-click via existing API; cache `getMemberActivityScore` (A-3) | S | ~50× query reduction on the heaviest page; multi-MB payload removed |
| 4 | Add `involves_own_clan` (or `own_clan_tag`) to `wars`; filter active-war/summary/attention/history queries; then build real CWL standings (A-4 + Feature 1) | S→M | Fixes CWL display bugs; unlocks the standings feature |
| 5 | Fix HoF streak timezone logic; extract + test (B-1) | XS | Correctness of a headline HoF award |
| 6 | Fix hydration bugs: pin `timeZone` in raid-timer/raid-history; move `Date.now()`/`new Date()` renders behind mounted/server-clock guards (B-3) | XS | Eliminates console errors + UI flicker for non-UTC users |
| 7 | Lazy-load recharts/member-detail-sheet on `/members`, `/war`, `/strategy`, `/hall-of-fame` (§5) | XS | ~245 kB → ~130 kB First Load JS on 4 pages |
| 8 | Bound `getLatestActivity`/`getNeedsAttention` scans with `DISTINCT ON` (B-10) | XS | Future-proofs query cost as history accumulates |
| 9 | Batch ingest writes; transaction the HoF rewrite + checkpoints (§4.5–4.7) | M | Faster polls, atomicity on destructive paths |
| 10 | CI route-mode assertion + streak tests (§8.1–8.2) | XS | Prevents regressions of findings 1 and 5 |
| 11 | Reset-day donation retention policy in purge (B-2) | S | Long-term accuracy of 30d analytics |
| 12 | Security headers, `sql.raw` cleanup, A11y keyboard access on rows/Select (§6.2–6.6) | S | Hardening + inclusivity |

Items 1–6 are the ones I'd ship this week; 7–10 are quick follow-ups; 11–12 are the conscientious-finish list.

---

## Appendix: Verification Artifacts

- **Build (as committed):** `next build` → 13/13 pages generated, all app routes `ƒ (Dynamic)`; bundle sizes as reported in §0.
- **Build (control, `cookies()` removed):** all six content routes `○ (Static)` with revalidate `/`=15m, `/capital`=5m, `/war`=5m, `/members`=1h, `/strategy`=1h, `/hall-of-fame`=1h — establishing A-1's causal chain. Layout file restored after the experiment; repo left clean.
- **Tests:** `vitest run` → 13 files, 150 tests, 0 failures.
- **Static review surface:** all 15 `lib/db` + `lib/ingest` + `lib/scoring` modules, all 6 pages, all 5 API routes, all migrations, drizzle journal, CI/cron/next/vercel configs, 13 test files, and the two largest component subtrees; sub-reviews covered the remaining ~70 components and the full test/scoring surface, with every severity-bearing claim re-verified against source line numbers in this document.

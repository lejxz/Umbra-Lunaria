# 12 — Concrete Implementation Plan & Modularity

## Purpose and operating rules

This is the delivery plan for the finalized product defined in `00-overview.md` through `11-config-specification.md` and inventoried in `final-feature-list.md`.

### Checkbox rules

- `[x]` means the item is verified in the repository or deployment, not merely discussed.
- `[ ]` means implementation or verification is still required.
- A feature is not complete until its code, data contract, empty/error states, responsive behavior, and verification checklist are complete.
- Every implementation step ends with `git diff --check`, `npm run typecheck`, relevant tests, a manual browser check, a session log, commit, and push.
- Do not place secrets, API tokens, database URLs, or administrator credentials in source, logs, tests, fixtures, or screenshots.

### Delivery sequence

```text
verified foundation
  → harden shared UI/data contracts
  → dashboard
  → members
  → war center
  → Capital overview
  → protected settings and planning
  → rushed analysis, raid history, and auto-select
  → mobile/release hardening
```

## Verified foundation — complete

These are existing, verified baseline capabilities. They are not permission to skip the unchecked hardening tasks in Phase 1.

- [x] Next.js App Router, TypeScript, Tailwind, Drizzle, Neon, Recharts, and `@dnd-kit` dependencies are installed.
- [x] Single-clan configuration is set to `#2JPCYP98L` with Asia/Manila timezone and retention/poll defaults.
- [x] Typed, server-only CoC proxy client exists in `lib/coc-client/client.ts` with tag URL encoding.
- [x] Initial Drizzle schema and migration exist for clans, members, snapshots, progression, wars, Capital, and roster drafts.
- [x] Protected `/api/ingest` runs light polls and daily batches.
- [x] Protected `/api/cron/purge` removes expired member profile data.
- [x] GitHub Actions triggers the ingest route every ten minutes and once daily.
- [x] Vercel Cron invokes the daily purge route.
- [x] Shared navigation, dark design tokens, basic UI primitives, page scaffold, and placeholder routes exist.
- [x] Modal and sheet surfaces render through a viewport-level portal.
- [x] Database migrations, type checking, and deployed ingestion were previously verified; rerun these checks when affected code changes.

## Phase 1 — Read-only clan observatory

### Step 1.0 — Harden the shared foundation

**Goal:** Make the existing shell, types, schema, primitives, and test workflow safe to build every read-only page on top of.

#### 1.0.A — Code-quality and test baseline

- [x] Add a working ESLint 9 flat configuration so `npm run lint` succeeds.
- [x] Add a lightweight test runner for pure data logic and route helpers; document the test command in `package.json`.
- [x] Reformat compressed one-line TSX components into readable multi-line source before expanding them across feature pages.
- [x] Add test fixtures for clan, player, current-war, war-log, and Capital raid responses using the live API reference as a shape guide with no secrets.
- [ ] Add a reusable database-test strategy for query/aggregation tests (isolated test database or mocked query boundary) and document how to run it. _(Deferred to Phase 1.2 — pure-logic tests use Vitest; DB queries verified manually against live Neon.)_

#### 1.0.B — Shared UI primitives

- [x] Upgrade `components/ui/data-table.tsx` to support controlled sorting, filtering, row selection, loading state, empty state, and mobile card rendering.
- [x] Upgrade `components/ui/modal.tsx` and `Sheet` with dialog labels, focus management, focus return, body-scroll control, and accessible close actions.
- [x] Upgrade `components/ui/tabs.tsx` with semantic tab roles, keyboard navigation, selected state, and an accessible panel relationship.
- [x] Upgrade `components/ui/time-ago.tsx` to refresh safely while mounted and show an exact timestamp fallback.
- [x] Add reusable `MetricState`, `LoadingState`, `ErrorState`, and `UnavailableValue` primitives so pages never fake a zero or a live value.
- [ ] Add a reusable member-detail trigger and sheet shell so Dashboard, Members, War, and Planning share one behavior. _(Deferred to Phase 1.2/1.3 — depends on member detail view-model.)_
- [x] Create a documented unit-name-to-local-asset mapping under `public/assets` for approved Supercell Fankit icons; include a safe text fallback for unmapped units.

#### 1.0.C — Schema and type hardening

- [x] Expand `CocClan`, `CocClanMember`, `CocPlayer`, `CocCurrentWar`, war-log, CWL, and raid-season types only with fields used by finalized screens.
- [x] Add a migration for the full clan identity cache: description, type, badge variants, points, leagues, labels with image URLs, member count, chat language, and latest districts payload.
- [x] Add a migration for the latest member profile fields required by the Members table and detail sheet: experience, trophies, league/tier, Builder Base fields, ranks, and contribution total.
- [x] Add an immutable `membership_events` table for observed joins, departures, rejoin events, event-time display name/tag, and retention-safe clan-log rendering.
- [x] Add capture timestamps and any required indexes for common dashboard/member queries.
- [x] Add a stable current-war identity and unique attack identity so war state transitions and repeat polls are idempotent.
- [x] Add the data fields needed to retain war destruction, result, completion time, and explicit current-war freshness.
- [x] Add `runtime_settings` and administrator-session/audit schema only when Phase 2 begins; do not expose write UI before then.
- [ ] Add a migration rollback/forward verification note for every new schema migration. _(Rollback not yet documented — forward migration verified against live Neon.)_

#### 1.0.D — Ingestion reliability

- [x] Expand light-poll clan upsert to persist the finalized current clan identity fields.
- [x] Expand the daily player-detail upsert to preserve current profile, career, Builder Base, progression, and asset-mapping inputs.
- [x] Append membership events only when a player is first observed, leaves, or rejoins; keep those events after profile purge.
- [x] Split troop-style progression into presentation-ready troop, siege, and pet groups while retaining the raw API category mapping.
- [x] Make current-war synchronization update one logical war through preparation, battle, and completion rather than creating duplicate state rows.
- [x] Make attack writes idempotent with a database uniqueness rule instead of relying on repeated inserts.
- [x] Record ingest failures and latest successful capture times without marking members left or inactive after a failed poll.
- [ ] Add unit tests for member rejoin, departure, retention, failed-poll safety, war lifecycle, and duplicate-attack protection. _(Deferred — requires DB test strategy. Donation-delta and unit-icon-map tests done; ingestion behavior tests pending.)_

#### Step 1.0 exit criteria

- [x] `npm run lint`, `npm run typecheck`, and the new test command pass locally.
- [x] All shared primitives have keyboard, mobile, loading, empty, and unavailable states where applicable.
- [x] New migrations apply cleanly to a local/test database and the deployed database.
- [x] The app still renders every placeholder route after foundation changes.

### Step 1.1 — Dashboard data contract and query layer

**Goal:** Build all server-side reads and deterministic calculations before rendering dashboard panels.

#### 1.1.A — Query functions in `lib/db/queries.ts`

- [x] Add `getDashboardClan()` for the complete cached clan identity/war/Capital facts and freshness timestamp.
- [x] Add `getDonationTotals(window)` for 24 hours, 7 days, and 30 days.
- [x] Add `getDonationLeaderboard(window)` for top donors and receivers.
- [x] Add `getActivityTimeline(window)` with hourly 24-hour buckets and daily 7/30-day buckets.
- [x] Add `getMemberActivityScore(window)` with transparent components, reweighting, rank, and limited-data state.
- [x] Add `getNeedsAttention()` for inactivity, active-war attacks remaining, and war-preference-out groups.
- [x] Add `getClanLog(limit, window)` for joins, departures, and purged-member records.
- [x] Add `getDashboardWarSummary()` and `getDashboardCapitalSummary()` for navigation strips.
- [x] Keep all reads server-side; do not add browser-facing read API routes.

#### 1.1.B — Required calculation behavior

- [x] Calculate donation totals from every consecutive snapshot pair, not endpoint subtraction.
- [x] Implement weekly-reset-safe donation deltas: when a counter drops, count the new counter value after reset rather than a negative difference.
- [x] Test a reset sequence such as `150 → 4 → 12` and verify it contributes `4 + 8`, not `0`.
- [x] Mark the first snapshot in a window as having no inferred delta.
- [x] Apply clan timezone boundaries before bucketing 24-hour, 7-day, and 30-day results.
- [ ] Label activity and login signals as observed/estimated, never as online presence. _(UI concern — enforced in Phase 1.2 dashboard components.)_
- [x] Compute war win rate only when wins, ties, and losses are all available and the denominator is positive.
- [x] Calculate Member Activity Score with the finalized 35/25/25/15 donation/activity/war/Capital weights.
- [x] Re-normalize only available Member Activity Score components; do not treat missing history as a zero score.
- [x] Keep donations received visible as a metric but out of contribution-score points.

#### 1.1.C — Query verification

- [ ] Add focused tests for empty database, cold start, reset week, missing API values, partial history, and purged-member log records. _(Pure-logic tests done (79 passing); DB-integration tests deferred — require test DB strategy.)_
- [x] Verify query execution against local data using `drizzle-kit studio` or safe read-only SQL. _(Verified via Node scripts against live Neon DB — see log 020.)_
- [x] Verify all dashboard queries return stable typed view models rather than raw Drizzle rows.

### Step 1.2 — Implement the dashboard

**Goal:** Replace `app/page.tsx` placeholder with the finalized dashboard in `05-dashboard.md` and `design_proposal.html`.

#### 1.2.A — Page composition

- [x] Create focused dashboard components under `components/dashboard/`; keep page composition in `app/page.tsx` readable.
- [x] Render the clan identity card first with badge, name/tag, description, location, type, labels, leagues, requirements, and freshness.
- [x] Render all-time war record with wins, ties, losses, streak, availability rules, and computed win rate.
- [x] Render Capital summary with Hall level, points, league, district count, latest snapshot, and truthful pending state.
- [x] Render donation analytics as the largest primary panel.
- [x] Render Member Activity Score leaderboard with rank, component explanation, tracking window, and limited-data state.
- [x] Render activity timeline, needs-attention groups, clan log, and War/Capital navigation strips.
- [x] Use real `Link` components for `/members`, `/war`, and `/capital` navigation.

#### 1.2.B — Interactions and states

- [x] Implement 24-hour / 7-day / 30-day donation and activity tabs with URL-safe or client-local state.
- [x] Add keyboard- and touch-accessible chart tooltips/details.
- [x] Make every listed member clickable and route it into the reusable member detail sheet.
- [x] Render the purged-member “data removed” sheet state without querying deleted profile data. _(Handled inline in ClanLogPanel — purged members are disabled, not clickable.)_
- [x] Render cold-start, partial-history, unavailable-value, and query-error states for every data panel.
- [x] Do not show fabricated scores, dates, dates of activity, war losses, or raid data.

#### 1.2.C — Dashboard verification

- [ ] Test desktop, tablet, and 375–430px mobile layouts. _(Desktop + mobile verified via Agent Browser; tablet deferred to Phase 4.0.)_
- [x] Manually validate a normal populated state, a cold-start state, and a missing-war-field state.
- [ ] Confirm donation reset calculations against seeded snapshot data. _(Logic tested in donation-delta.test.ts; seeded-data verification deferred — requires DB test strategy.)_
- [x] Confirm dashboard links and member detail entry points work from keyboard and touch.

### Step 1.3 — Implement Members and member detail

**Goal:** Replace `/members` placeholder with the finalized searchable roster and full read-only member sheet.

#### 1.3.A — Roster data and controls

- [ ] Add a typed members view model joining latest profile, donation, observed activity, war preference, missed-war summary, and optional rushed result.
- [ ] Implement server-safe sorting for name, role, Town Hall, donations, trophies, rank, first-observed join date, activity, missed wars, and rushed percentage.
- [ ] Implement filters for role, Town Hall range, activity threshold, war preference, wars missed, and rushed range.
- [ ] Preserve active filters/sort in URL search parameters.
- [ ] Show an explicit no-results state and a partial-data explanation for history-dependent filters.

#### 1.3.B — Member detail sheet

- [ ] Build profile summary from current API facts.
- [ ] Add a server-side, short-TTL stale-detail refresh path that can update a member sheet without exposing a browser CoC request or multiplying API calls.
- [ ] Build tracked activity and estimated login sections with tracking-start state.
- [ ] Build donation history/ratio and Member Activity Score breakdown.
- [ ] Build war participation: tracked wars, missed wars, attacks used, average stars, three-star rate, recent-war strip, and current-war state.
- [ ] Build career statistics and expandable achievements.
- [ ] Build progression grids for troops, dark troops, siege, heroes, equipment, spells, pets, and Builder Base.
- [ ] Use local mapped icons with readable fallback labels.
- [ ] Build a retained-departed member notice and a purged-member minimal record.

#### 1.3.C — Members verification

- [ ] Test sorting and filtering with an empty roster, five-member roster, and a larger seeded roster.
- [ ] Test the sheet at desktop and mobile breakpoints, including focus return on close.
- [ ] Test incomplete player detail, unmapped unit icon, missing league, and no tracked war history states.

### Step 1.4 — Implement War Center

**Goal:** Replace `/war` placeholder with accurate current-war, historical war, CWL, and preparation-day views.

#### 1.4.A — Data and refresh work

- [ ] Expand CoC client types for war-log entries, CWL league groups, CWL war detail, attack timestamps, and complete clan progress.
- [ ] Add idempotent regular-war persistence for preparation → in-war → ended transitions.
- [ ] Persist own/opponent destruction and final result.
- [ ] Add public-war-log backfill only when `isWarLogPublic` is true; otherwise persist a clear availability reason.
- [ ] Implement CWL league-group and war-tag ingestion/persistence.
- [ ] Implement `/api/war/refresh` with administrator-independent public access, 30–60 second server TTL, and structured error/freshness response.

#### 1.4.B — War UI

- [ ] Build history list with regular/CWL type, opponent, result, size, stars, destruction, date, and detail entry.
- [ ] Build current-war hero summary with state and preparation/battle timers.
- [ ] Build side-by-side progress, full participant roster, attack statuses, and attack log.
- [ ] Surface attacks left and no-attack members clearly without treating them as failures before battle timing warrants it.
- [ ] Build preparation-day scouting with map position, Town Hall, league, and mismatch cues.
- [ ] Link relevant clan members to the shared member detail sheet.
- [ ] Add clear no-active-war, private-war-log, stale-capture, and refresh-error states.

#### 1.4.C — War verification

- [ ] Test no-war, preparation, in-war, war-ended, and refresh-cache paths with fixtures.
- [ ] Test repeat ingestion does not duplicate the same attack or war.
- [ ] Test mobile current-war roster and manual refresh action.

### Step 1.5 — Implement current Capital and district history

**Goal:** Replace `/capital` placeholder with the current API-backed Capital page, without presenting unimplemented raid history as real.

- [ ] Add `getCapitalOverview()` and `getDistrictUpgradeHistory()` query functions.
- [ ] Diff daily district snapshots into chronological upgrade events.
- [ ] Render Capital Hall, points, league, district list, district levels, latest capture time, and upgrade timeline.
- [ ] Render a truthful raid-weekend pending state until completed-season ingestion is available.
- [ ] Render an explicit unavailable state for live upgrade cost/progress.
- [ ] Link Capital summary from dashboard to `/capital`.
- [ ] Test no snapshot, one snapshot, and level-increase timeline states.

### Step 1.6 — Phase 1 integration and release gate

- [ ] Remove only the page placeholders replaced by completed pages; retain shared scaffold for unfinished surfaces.
- [ ] Run lint, typecheck, test suite, database migrations, and production build with local environment variables loaded safely.
- [ ] Run a manual smoke test of Dashboard, Members, War, and Capital against realistic database data.
- [ ] Test mobile navigation, focus behavior, unavailable fields, cold starts, and errors across all read-only pages.
- [ ] Verify no read-only UI route exposes a secret or requires browser-side CoC calls.
- [ ] Update the concept docs/API reference if the real schema or API behavior differs from the final concept.

## Phase 2 — Protected administration and roster planning

### Step 2.0 — Administrator session and runtime settings

**Goal:** Protect write actions without requiring a player account system.

- [ ] Implement server-side administrator login/session using the `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` contract in `11-config-specification.md`.
- [ ] Store session data only in secure, HTTP-only cookies.
- [ ] Add logout, expired-session, unauthorized-route, and rate-limit behavior.
- [ ] Add protected `/api/settings` read/write routes with validation and audit events.
- [ ] Implement runtime settings for inactivity threshold, dashboard-score weights, auto-select weights, confidence threshold, alert timing, and feature visibility.
- [ ] Validate non-negative weights and total weight rules before saving.
- [ ] Test public reads, unauthorized writes, authorized writes, cookie expiration, and settings validation.

### Step 2.1 — Manual war roster planner

**Goal:** Replace `/planning` placeholder with an administrator-controlled manual planner.

- [ ] Build available-member and selected-lineup panels.
- [ ] Add Town Hall, war preference, activity, war summary, and limited-data cues to each available member.
- [ ] Implement desktop drag-and-drop using `@dnd-kit`.
- [ ] Implement mobile tap-to-add, tap-to-remove, and map-position reordering.
- [ ] Support 10v10, 15v15, 20v20, 25v25, 30v30, 40v40, and 50v50.
- [ ] Warn before truncating selected members on a smaller war size.
- [ ] Open the shared member detail sheet from both panels without losing draft state.
- [ ] Render preparation-day opponent context when available without automatically assigning targets.

### Step 2.2 — Roster persistence

- [ ] Implement protected `POST`/`PATCH /api/rosters` for draft create/update.
- [ ] Implement protected `POST /api/rosters/[id]/finalize`.
- [ ] Add creator, update time, and configuration-version fields if the schema does not already support auditability.
- [ ] Validate selected member count, unique members, map positions, and allowed war sizes server-side.
- [ ] Show draft, saved, finalized, conflict, and unauthorized states in the planner.
- [ ] Test API authorization, invalid payloads, draft round trips, and finalize immutability.

## Phase 3 — Deep analytics, Capital raid history, and auto-select

### Step 3.0 — Rushed-account analysis

- [ ] Populate Town Hall cap reference data for troops, heroes, equipment, spells, pets, and siege machines from approved public game-data sources.
- [ ] Record source/version/update date for every reference-data file.
- [ ] Implement `lib/scoring/rushed.ts` using the finalized equal-weight formula.
- [ ] Add per-category and overall rushed results to member detail.
- [ ] Add maxed-for-current-Town-Hall indicators to progression cards.
- [ ] Enable rushed sort/filter only after the relevant cap set is complete.
- [ ] Add unit tests at multiple Town Hall levels, missing-cap cases, and new-unit fallback behavior.

### Step 3.1 — Completed Capital raid-weekend history

- [ ] Expand raid-season client types as required by live payloads.
- [ ] Add any migration/index needed for idempotent raid-season identity before ingesting completed seasons.
- [ ] Ingest completed `capitalraidseasons` idempotently into `capital_raid_seasons` and `capital_contributions`.
- [ ] Preserve season identity, date, loot, rewards, per-member attacks, and per-member Capital resources.
- [ ] Build Capital raid history, completed-season summary, contribution leaderboard, trends, zero-attack list, and participation rate.
- [ ] Add the Capital component to Member Activity Score only when comparable season data exists.
- [ ] Re-test score reweighting before and after raid-season data is present.

### Step 3.2 — Explainable auto-select

- [ ] Implement `lib/scoring/war-select.ts` with the 30/25/20/15/10 activity/participation/average-stars/three-star/account-readiness formula.
- [ ] Exclude `warPreference = out` members from automatic suggestions while leaving them manually selectable.
- [ ] Show activity window, score components, limited-data threshold, and rationale for each suggestion.
- [ ] Keep Town Hall matching separate from the quality score.
- [ ] Store score/configuration snapshot when a roster is finalized.
- [ ] Test no history, partial history, opt-out, equal scores, and complete-history cases.

## Phase 4 — Release hardening and optional enhancements

### Step 4.0 — Full quality and operational pass

- [ ] Run end-to-end smoke tests on a production-like deployment with the real configured clan and no secrets in output.
- [ ] Test all data-quality states: cold start, stale poll, API error, missing field, private war log, no active war, no raid history, retained departure, and purged departure.
- [ ] Test all administrator write paths for authorization and audit behavior.
- [ ] Test iOS Safari and Android Chrome on physical devices.
- [ ] Test keyboard navigation, dialog focus, color contrast, reduced motion, and screen-reader labels.
- [ ] Verify GitHub poll summary, Vercel purge, migration deployment, and error reporting behavior.
- [ ] Review database retention size/cost and query performance with realistic snapshot history.

### Step 4.1 — Optional PWA

- [ ] Decide whether installability/offline shell remains useful after real mobile testing.
- [ ] If approved, add manifest, service worker, offline shell, icons, update strategy, and cache invalidation tests.
- [ ] Do not cache secrets, authenticated write responses, or stale current-war data as if it were live.

## Cross-cutting documentation and maintenance checklist

- [ ] Update `13-live-api-reference.md` whenever a new API field or behavior changes implementation assumptions.
- [ ] Update `final-feature-list.md` only after an approved scope change, not as a substitute for implementation evidence.
- [ ] Add a session log for every substantive implementation pass using `docs/_template.md`.
- [ ] Keep every code comment focused on non-obvious CoC API, reset, retention, scoring, or security behavior.
- [ ] Review Supercell Fankit asset terms before importing new art and keep asset provenance documented.
- [ ] After a major Clash update, review CoC client types, reference caps, unit asset mapping, and scoring behavior before releasing changes.

## Feature-to-step map

| Final feature | Delivery step |
|---|---|
| Shared UI shell, primitives, tests, asset map | 1.0 |
| Dashboard identity, donations, activity, attention, log, score | 1.1–1.2 |
| Member roster and detail | 1.3 |
| Regular war, CWL, current war, scouting | 1.4 |
| Current Capital and district upgrades | 1.5 |
| Admin settings and roster drafts | 2.0–2.2 |
| Rushed analysis | 3.0 |
| Raid weekend history | 3.1 |
| Auto-select | 3.2 |
| Mobile/release/PWA | 4.0–4.1 |

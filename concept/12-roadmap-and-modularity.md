# 12 — Roadmap & Modularity

## Phase 0 — Foundation ✅ COMPLETE

Everything here is done, deployed, and verified running:

- [x] CoC API key created, whitelisting RoyaleAPI proxy IP (`02-api-and-proxy-strategy.md`).
- [x] `lib/coc-client/client.ts` — typed proxy client routing through `cocproxy.royaleapi.dev`, tag URL-encoding, server-only.
- [x] Neon database provisioned via Vercel Marketplace integration.
- [x] `lib/db/schema.ts` — full Drizzle schema: `clans`, `members`, `member_snapshots`, `unit_levels`, `wars`, `war_participants`, `war_attacks`, `capital_district_snapshots`.
- [x] `drizzle/0000_slim_shatterstar.sql` — initial migration generated and committed. Runs automatically on every Vercel deploy (`"build": "drizzle-kit migrate && next build"`).
- [x] `/api/ingest` — light-poll + daily-batch logic: member diffing, activity/login-day flags with weekly-reset handling, currentwar sync (preparation + inWar + warEnded), daily clan-cache refresh, capital district snapshots, career stats + war preference + unit levels.
- [x] `/api/cron/purge` — 14-day retention purge, hardened to fail explicitly if `CRON_SECRET` is unset.
- [x] `.github/workflows/poll.yml` — two schedules: light poll every ~10 min, daily batch at 04:17 UTC. Manual trigger via `workflow_dispatch`.
- [x] `vercel.json` — daily Vercel Cron for purge at 18:00 UTC.
- [x] `config/clan.config.ts` — clan tag, timezone, retention days, feature toggles, poll interval, confidence threshold.
- [x] `lib/reference-data/*.json` — stub files (troop-caps, hero-caps, spell-caps, pet-caps, equipment-caps). Data not yet populated — blocks rushed % in Phase 2, not Phase 1.
- [x] Vercel environment variables set: `COC_API_TOKEN`, `COC_API_BASE_URL`, `DATABASE_URL`, `INGEST_SECRET`, `CRON_SECRET`.
- [x] GitHub repo secrets set: `INGEST_SECRET`, `VERCEL_APP_URL`.
- [x] End-to-end verified: workflow runs, data lands in database, 5 members polled successfully.

---

## Phase 1 — Read-only core UI

All UI pages. The database is populated; this phase reads it and renders it.

### Step 1.0: Shared foundation ✅ COMPLETE

Build the design system, layout shell, and data access layer that every page depends on.

- [x] Shared dark/glass design tokens, responsive shell/navigation, reusable UI primitives, and initial read query boundary implemented.

1. **Install UI dependencies** — `recharts` (charts), `date-fns` (date formatting/math), `lucide-react` (icons). No component library — build from Tailwind.
2. **Tailwind theme** — dark-mode-first color palette, CoC-inspired accent colors (gold, purple, blue tiers). Typography scale. Define in `tailwind.config.ts`.
3. **Layout shell** — `app/layout.tsx`: sidebar navigation (Dashboard, Members, War, Capital, Planning), responsive collapse to bottom-tab bar on mobile. Clan name + level in the header, pulled from the `clans` table at render time (server component).
4. **Shared UI components** — `components/ui/`:
   - `StatCard` — icon, label, value, optional trend indicator.
   - `DataTable` — sortable, filterable table with column definitions. Responsive: collapses to card-per-row below `md` breakpoint (`10-mobile-support.md`).
   - `Badge` — role badges, war-preference in/out, TH level.
   - `Modal` / `Sheet` — member detail popup. Full-screen sheet on mobile, centered modal on desktop (`10-mobile-support.md`).
   - `Tabs` — time-window toggles (24h / 7d / 30d).
   - `EmptyState` — cold-start placeholder with explanation text, not a silent blank chart.
   - `TimeAgo` — relative timestamps.
5. **Data access layer** — `lib/db/queries.ts`: reusable async functions for every read the UI needs. Server Components call these directly — no API routes for reads. Functions:
   - `getClanInfo()` — from `clans`.
   - `getMembers(filters, sort)` — from `members`, with optional joins.
   - `getMemberDetail(playerTag)` — member + latest snapshot + unit levels + war participation.
   - `getDonationTotals(window)` — aggregated from `member_snapshots` diffs.
   - `getActivityTimeline(window)` — from `member_snapshots.activity_flag`, bucketed.
   - `getLoginDays(playerTag)` — from `member_snapshots.login_day_flag`.
   - `getWarHistory(limit, offset)` — from `wars`.
   - `getCurrentWar()` — latest from `wars` where state != warEnded (or most recent).
   - `getWarParticipation(playerTag)` — from `war_participants`.
   - `getClanLog(limit)` — members with recent `joined_at` or `left_at`.
   - `getCapitalDistricts()` — latest from `capital_district_snapshots`.
   - `getDistrictUpgradeHistory()` — diffed level changes over time.

### Step 1.1: Main Dashboard — `app/page.tsx`

Build order within this step follows the visual layout top-to-bottom:

1. **Clan info panel** — clan level, points, capital league, capital hall level, join requirements, location, labels, war frequency. Read from `clans` row. Server component.
2. **All-time war record card** — `warWins`, `warTies`, `warLosses`, `warWinStreak`, computed win rate. Four `StatCard`s in a row. From `clans`.
3. **Donation totals** — 24h / 7d / 30d toggle. Total given, total received, top donors leaderboard. From `member_snapshots` diffs via `getDonationTotals()`. Client component for the tab toggle; data fetched server-side per window.
4. **Activity graph** — Recharts area/bar chart. Hourly buckets (24h view), daily buckets (7d/30d). From `getActivityTimeline()`. `EmptyState` for cold-start period.
5. **Needs-attention panel** — members inactive N+ days, members with 0 war attacks in active war, members with `warPreference = out`. Configurable threshold from `clanConfig`.
6. **Clan log** — recent joins/leaves feed, most-recent-first. Click → member detail popup. Purged-member case: show "left on [date], data removed" message. From `getClanLog()`.
7. **Navigation strips** — current war status strip (state, time remaining, stars) linking to `/war`. Capital raid weekend status linking to `/capital`.

### Step 1.2: Members List — `app/members/page.tsx`

1. **Roster table** — `DataTable` with columns: name, role, TH level, donations (given/received), trophies, activity status, wars missed, war preference badge. Sortable on every column. Filterable by: role, TH range, activity threshold, wars missed, war preference.
2. **War preference badge** — small `in`/`out` badge per row, visually distinct (green/gray).
3. **Member detail popup** — triggered by row click. `Sheet` component (full-screen on mobile). Sections:
   - **Activity** — daily/weekly/monthly activity from `member_snapshots`, scoped to this member.
   - **Login activity graph** — calendar/date-based graph from `getLoginDays()`. Labeled as estimated.
   - **War participation** — wars missed count, attack-slot usage rate, recent-wars visual strip (last 10 wars: attacked/missed). From `war_participants`.
   - **Career stats** — war stars, attack wins, defense wins, best trophies, achievement highlights (Gold Grab, Friend in Need). Labeled "career / lifetime". From `members.career_stats`.
   - **Troop / hero / spell / pet cards** — grid of in-game-style cards: icon placeholder, current level, grouped by category (Elixir Troops, Dark Elixir Troops, Siege Machines, Heroes, Hero Equipment, Spells, Pets). From `unit_levels`. No rushed % indicator yet (Phase 2).
   - **Builder Base minimal** — Builder Hall level, versus trophies. From `unit_levels.builder_base`.

### Step 1.3: Clan War — `app/war/page.tsx`

1. **War history list** — table/card list from `wars`: opponent name, result (W/L/T), war size, own stars vs opponent stars, date, type. Click through to detail view.
2. **Current war detail view** — war state + time remaining, both clans' star/attack/destruction progress, full roster with per-member attack status (attacks used, stars earned, "has not attacked" flag). Attack log table.
3. **`/api/war/refresh` implementation** — replace the 501 stub. Calls `cocClient.getCurrentWar()`, updates `wars`/`war_participants`/`war_attacks`, returns latest state. TTL cache (30–60s) to protect against concurrent refresh clicks.
4. **Manual refresh button** — large, unambiguous, mobile-friendly (`10-mobile-support.md`).
5. **Prep-day scouting view** — shown when `state = preparation`. Two-column roster: own clan vs opponent, ordered by map position, TH level per member. TH mismatch highlighting.

### Step 1.4: Clan Capital — `app/capital/page.tsx`

1. **Capital overview** — capital hall level, district count, from `clans`.
2. **District upgrade tracking** — timeline/table of level-ups, from `getDistrictUpgradeHistory()`. "Barbarian Camp reached level 4 on [date]" format.
3. **Raid weekend summary** — placeholder/stub. Full implementation requires adding `capitalraidseasons` to the ingest pipeline (currently not polled). Show what's available from `capital_district_snapshots` for now; mark raid-weekend detail as "coming soon" if the endpoint isn't wired yet.

### Step 1.5: Mobile & polish pass

1. Verify all pages at 375px–430px viewport (mobile-first per `10-mobile-support.md`).
2. Member detail popup → full-screen sheet on mobile.
3. Charts: fewer labels, horizontal scroll or range-zoom at narrow widths.
4. Roster table → card-per-member layout below `md` breakpoint.
5. War refresh button: large tap target.
6. Test on an actual phone, not just browser devtools.

---

## Phase 2 — Depth and planning

Depends on Phase 1 being complete and some data accumulation.

### Step 2.0: Rushed % analysis

1. **Populate `lib/reference-data/*.json`** — source TH-level caps for all troops, heroes, spells, pets, and equipment from public game-data references (Clash Wiki, Clash Ninja, or extracted game files). One JSON file per category, keyed by unit name and TH level.
2. **`lib/scoring/rushed.ts`** — implement the weighted formula from `06-members.md`. Flat/equal weighting as default.
3. **Integrate into member detail popup** — overall rushed %, per-category breakdown, maxed-for-TH indicator on troop cards.
4. **Add rushed % column/filter to Members List** — sortable, filterable by range.

### Step 2.1: War Planning — `app/planning/page.tsx`

1. **Install `@dnd-kit`** — drag-and-drop library with touch support.
2. **Two-panel roster builder** — available roster (left) → war lineup slots (right), ordered by map position. War-preference-aware: `out` members shown but visually deprioritized (bottom, muted).
3. **Tap-to-add fallback** — for touch devices (`10-mobile-support.md`).
4. **War size selection** — standard game sizes (10v10, 15v15, 20v20, 25v25, 30v30, 40v40, 50v50). Warn before truncating.
5. **Member detail popup** — same component, accessible from within the planner.
6. **Save as draft** — implement `/api/rosters` (replace 501 stub), `war_rosters` table if not yet in schema.
7. **Finalize roster** — `/api/rosters/[id]/finalize`.

---

## Phase 3 — Auto-select and polish

### Step 3.0: Auto-select scoring

1. **`lib/scoring/war-select.ts`** — implement the composite scoring formula from `09-war-planning-and-auto-select.md`. Five factors: activity, participation rate, avg stars, 3-star rate, rushed %. Configurable weights.
2. **Confidence flagging** — "limited data" flag for members below `minWarsForConfidentRanking` wars.
3. **Integrate into roster builder** — composite score as default sort in available-roster panel, per-factor breakdown visible per member.
4. **Runtime settings page** — editable scoring weights, inactivity threshold. Database-backed (`11-config-specification.md`).

### Step 3.1: Capital raid weekends (full)

1. **Add `capitalraidseasons` to ingest** — poll completed raid weekend results from the API.
2. **Per-raid-weekend summary** — total gold looted, attacks used vs available, medals earned.
3. **Per-member contribution leaderboard** — current and trended over past weekends.
4. **Participation rate** — members at 0/6 attacks.

### Step 3.2: Mobile polish

1. PWA manifest + service worker (installable, offline shell) — incremental, not a rebuild.
2. Full real-device testing pass on iOS Safari and Android Chrome.

---

## Staying modular against game updates

- Isolate the CoC response shape behind `lib/coc-client` (`01-tech-stack.md` repo layout) — a Supercell response change stays contained to the client/typing layer and the reference JSON files.
- `lib/reference-data/*.json` (TH-level caps per unit, `06-members.md`) and the unit-icon mapping are the two things most likely to go stale after a balance patch or new Town Hall level. Update them after major game updates, not on a fixed schedule — a new unit or TH level means a new entry in these files, not a code change.
- Feature toggles in `clanConfig.features` let a broken or unwanted feature be switched off without a code revert.
- Derive max-Town-Hall-level logic from the reference data, not a hardcoded number.

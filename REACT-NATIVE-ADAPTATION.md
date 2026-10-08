# React Native (Expo) Course Project — Searcher + Analyzer Guide

**Created:** 2026-10-02 · **Revised:** 2026-10-08 — plan pivoted from "recreate the tracker, toned down" to "clan & player searcher with live analytics" (§0 records why).
**Audience:** the course group forking this project into a React Native (Expo) mobile app.
**Status:** planning guide. This repository stays as-is — web dashboard, API backend, ingest pipeline — and serves as the reference implementation the course fork borrows engines from.

---

## Answers at a glance

| Question | Decision (searcher model) |
|---|---|
| Product shape? | **Clan & player searcher + analyzer** — search any clan by name, browse its roster, open any player's full detail, run this repo's scoring engines on the live payload |
| New Clash of Clans API key? | **Yes** — one fresh key for the course project, still behind the RoyaleAPI proxy |
| Database? | **No.** Live API data only — nothing needs to be stored (stretch goal: `expo-sqlite` favorites/watchlist, which also satisfies a backend/CRUD rubric) |
| Copy the production data? | **No** — the searcher has no history requirement, so the "COC API can't re-fetch the past" constraint simply vanishes |
| Ingest pipeline / cron? | **None.** No polling, no cron-job.org, no purge, no membership reconciliation |
| New GitHub repo? | **Yes** — fresh repository with a single initial-import commit; keep this one as the reference |
| Planning docs? | One README + a `MILESTONES.md`; this repo's `docs/concept/` folder is source material for the course report |

The original toned-down-tracker plan is preserved as **Alternative A** (§11) in case the course rubric strictly requires a persistent backend database.

---

## 0. The pivot — why searcher over tracker

The first revision of this guide planned a reduced clone of the tracker. On reflection, that path carries this repo's riskiest 80% — the ingest pipeline (cron polling, snapshot insertion, membership reconciliation, retention/purge) — which is exactly the machinery that fails invisibly and eats maintenance time (see the 2026-10-01 outage postmortem in `docs/2026-10-02-ingest-outage-watchdog.md`). A course team of four would spend the semester operating infrastructure instead of shipping features.

The searcher model deletes all of it:

1. **No data dependency.** The tracker exists because the COC API cannot re-fetch history; a searcher only ever needs *live* state, which the API serves on demand. No Supabase project, no `pg_dump`, no copied history.
2. **Demo-friendly.** Graders search *their own* clan or paste their own player tag and see a full analysis in seconds — far more convincing than a dashboard over a 7-member roster's data.
3. **The interesting part of this repo carries over directly.** The scoring engines in `lib/scoring/` and `lib/war/` are pure, framework-free TypeScript. The searcher's identity is exactly that engine applied to *any* player on demand: rushed analysis, donation-ratio flags, war efficiency — "a clan viewer, but with the analytics turned on."
4. **Even workload.** Almost all remaining work is UI, which splits cleanly four ways.

The one thing the searcher gives up is longitudinal insight (activity trends, join/leave history, career deltas). If the course requires a database, add the §10 watchlist stretch goal — it grows naturally into a mini-tracker and covers the rubric.

---

## 1. API reality — design the UX around these facts

The official COC API (via the RoyaleAPI proxy) is the searcher's entire backend. Know these constraints before writing the proposal:

| Fact | Consequence |
|---|---|
| **Clan search by name works**: `GET /clans?name=X` with filters (`minMembers`, `minClanLevel`, `locationId`, `labelIds`, `limit`/`after` pagination) | The app's home screen is a clan search box with filters |
| **Player search by name does NOT exist** — players are fetchable by exact tag only (`GET /players/{tag}`, `#` URL-encoded) | Player lookup is **clan-first** (search clan → tap member) plus a paste-a-tag shortcut. Never promise "search players by name" |
| `GET /clans/{tag}` returns the full roster inline (`memberList`: donations, donationsReceived, trophies, expLevel, townHallLevel, role, league, warPreference) | Roster stats — including donation ratio — come free with one call; no per-member fetches needed for the clan screen |
| `GET /players/{tag}` returns troops/heroes/spells with `level` **and `maxLevel`**, achievements, legend stats | Everything the rushed engine needs is in this one payload |
| War log (`GET /clans/{tag}/warlog`) only for clans with `isWarLogPublic: true`; current war (`GET /clans/{tag}/currentwar`) always available | Show a graceful notice on private war logs; current-war view works for every clan |
| The API is throttled per key | **Cache server-side** (§3) — the app must never hit Supercell directly, and the API tier must not fan out unbounded searches |

This repo's client (`lib/coc-client/client.ts`) already implements `getClan`, `getClanMembers`, `getPlayer`, `getCurrentWar`, `getWarlog`, `getCwlLeagueGroup`, `getCapitalRaidSeasons` with full TypeScript types (`CocClan`, `CocClanMember`, `CocPlayer`, `CocUnitLevel`). The fork adds exactly **one** new method — clan search — plus the types for its response.

---

## 2. Target architecture

```
Expo app (React Native)                    ── no secrets, no direct Supercell calls
        │  HTTPS + JSON only
        ▼
course Vercel app (thin API tier)          ── COC_API_TOKEN lives here, never in the bundle
        │  /api/search?name=…      → GET /clans?name=…
        │  /api/clan/{tag}         → GET /clans/{tag}            (+ TTL cache)
        │  /api/player/{tag}       → GET /players/{tag}          (+ rushed analysis)
        │  /api/clan/{tag}/warlog  → GET /clans/{tag}/warlog     (+ efficiency math)
        │  /api/clan/{tag}/war     → GET /clans/{tag}/currentwar
        ▼
RoyaleAPI proxy  →  Clash of Clans API
```

The middle tier is deliberately thin: authenticate, call the COC API through the proxy, apply the scoring engines, return JSON. Two additions make it production-sane:

- **Server-side TTL cache per endpoint** (in-memory `Map` on the Vercel function, or Upstash Redis free tier if the group wants it to survive cold starts): ~30–60 s for search results, ~5 min for clan/player detail, ~10 min for war log. Protects the key's throttle budget and makes the app feel instant on repeat views.
- **Shared-secret header on the API routes** (e.g. `X-Api-Key` shipped via `expo-secure-store`) — cheap, and the Vercel URL won't be an open proxy for anyone with a scraper.

---

## 3. What carries over vs. what gets dropped

| Layer | Location | Verdict |
|---|---|---|
| Rushed analysis | `lib/scoring/rushed.ts` | **Reuse as-is** — pure, runs on any live player payload (uses the API's own `maxLevel`; no reference dataset needed) |
| Super-troop normalization | `lib/assets/super-troops.ts` | **Reuse as-is** — keeps "Super Valkyrie 1/12" from inflating rushed deficits |
| Donation ratio | `lib/scoring/donation-ratio.ts` | **Reuse** — pure flag logic; feed live `memberList` counters |
| War math | `lib/war/star-efficiency.ts`, `attack-quality.ts`, `war-metrics.ts` | **Reuse as-is** on warlog/currentwar payloads |
| COC client + types | `lib/coc-client/client.ts` | **Reuse + extend** — add the one `searchClans` method |
| Display assets | `lib/assets/hero-equipment.ts`, `unit-icon-map.ts` | **Reuse** |
| Design language | mono micro-labels, glass cards, `ChartLegend` swatch pattern | **Port** to RN (`expo-blur` etc.) |
| Web UI | `components/**`, `app/(pages)` | **Rewrite** in React Native |
| Charts (Recharts) | dashboard chart components | **Rewrite** — Recharts is DOM-based; use `victory-native` (Skia) or `react-native-gifted-charts` |
| Ingest / cron / DB / purge | `app/api/ingest`, `lib/ingest/*`, `lib/db/*`, `drizzle/` | **Drop entirely** (searcher model) |
| PWA shell | `public/sw.js`, `components/pwa/` | **Drop** — superseded by the native app |
| CI | `.github/workflows/ci.yml` | **Slim down** — typecheck/lint/unit tests; drop route-mode, smoke, integration |

---

## 4. Feature list (screens)

1. **Search** — clan name + filters (min members, clan level, location, war frequency); paginated results; recent searches.
2. **Clan detail** — header (badge, level, required TH, war frequency, location), sortable roster table (role, TH, trophies, donations, donation ratio flag, exp level), clan-level stats.
3. **Player detail** (tap any member, or paste a tag) — profile, town hall, league; **rushed analysis** (overall % + per-category breakdown, super-troop-normalized); hero levels and equipment; achievement progress bars; legend stats.
4. **Donation-ratio flags** — reuse the pure engine: ratio, deficit vs target, "needs attention" ordering; a clan-level ranking card.
5. **Compare mode** — player A vs player B (side-by-side rushed/hero/troop grid) and clan A vs clan B (roster stats, war record). This is the demo moment.
6. **War views** — current war state (standings, attacks used/stars/destruction per member) and war log history with the repo's star-efficiency math, for clans with public logs; explicit notice otherwise.
7. **Stretch — watchlist** (§10).

---

## 5. Phase plan

- **Phase 0 — thin API tier (1 day).** Fresh repo, Vercel project, new COC key behind the RoyaleAPI proxy, port `cocClient`, add `searchClans`, wire `/api/search` + `/api/clan/{tag}` with the TTL cache, shared-secret header. Deliverable: the API answers curl.
- **Phase 1 — Expo scaffold + search flow (2–3 days).** Expo Router, TanStack Query, the search screen and results list. Prove the full request path early.
- **Phase 2 — clan + player detail (4–6 days).** Roster table with sorting, player screen with the rushed grid (the engine port happens here), super-troop normalization, donation-ratio flags.
- **Phase 3 — war views + compare mode (4–6 days).** Current-war screen, war log with efficiency math, the A-vs-B compare screen. Highest novelty value — keep it after Phase 2 so the core is safe.
- **Phase 4 — polish + demo (3–4 days).** Empty/error/offline states, pull-to-refresh, app icon, favorites (if stretch goal in scope), demo runbook ("search your own clan").

Total: ~3–4 weeks of part-time group work, with the risky chart work reduced to two screens instead of a full dashboard.

---

## 6. Environment variables

Server side (Vercel project settings — never in the app):

| Variable | Purpose |
|---|---|
| `COC_API_TOKEN` | The **new** Clash of Clans API key |
| `COC_API_BASE_URL` | `https://cocproxy.royaleapi.dev/v1` |
| `API_SHARED_SECRET` | Key the Expo app sends as `X-Api-Key` |

Client side:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the course API |

Everything `EXPO_PUBLIC_*` is extractable from the app bundle — the shared secret should be low-stakes (it guards a proxy, not data) and kept in `expo-secure-store` rather than hardcoded.

---

## 7. Suggested team split (4 people)

- **API owner** — Phase 0, the cache layer, engine wiring, key hygiene.
- **Search + clan screens** — the core navigation path and roster table.
- **Player detail + analysis UI** — rushed grid, hero/achievement cards, donation flags.
- **War + compare + design system** — war screens, compare mode, shared RN components (`ChartLegend` port), CI, README/report.

PR-based workflow with required typecheck/lint checks on the course repo — it reads well in a rubric and keeps `main` deployable.

---

## 8. Rules and pitfalls

1. **No COC secrets in the app.** The game API is only ever called server-side; the phone only sees your JSON. (Unchanged from the tracker plan — this is the RoyaleAPI key-allowlist reality, not a preference.)
2. **Cache everything server-side.** The COC API is throttled per key; an uncached list screen refetching on every navigation will exhaust the budget and 429 the whole app. Set per-endpoint TTLs from day one.
3. **No player search by name — don't design or promise it.** Clan-first navigation + tag paste is the correct UX; the tag format needs `#` URL-encoding (`encodeTag` in the client).
4. **Recharts will not run in React Native.** Budget `victory-native` / gifted-charts work explicitly; prototype one chart screen in week one.
5. **Handle private war logs and "not found" tags gracefully** — both are common in demos and both need designed states, not crashes.
6. **Rate-limit your own search endpoint** (simple per-IP cap) before any long-lived public deploy, or your Vercel tier becomes a free COC proxy for scrapers.
7. **Don't fork the commit history.** Fresh repo, import commit, own milestones.

---

## 9. Relationship to this repository

This repo keeps running the production tracker untouched — its ingest, database, and CI are irrelevant to the fork and stay that way. What the fork takes is the *engine layer* (`lib/scoring`, `lib/war`, `lib/assets`, `lib/coc-client`), the design language, and the hard-won API knowledge encoded in `docs/concept/` (especially `13-live-api-reference.md`). When the course ends, those concept docs double as citable background for the report.

---

## 10. Stretch goal — watchlist (the bridge back to a tracker)

Add `expo-sqlite` favorites: star any clan or player, store the tag, and get a home-screen list that refetches live on open. This is:

- the feature that satisfies a **backend/CRUD/database rubric** without a server database (local SQLite counts, and it's real persistence);
- the seed of longitudinal analytics — a background refresh of watched players (even a manual "refresh all") accumulates point-in-time captures, which is exactly how this repo's snapshot table started;
- scoped so it can be cut without touching the core searcher.

Do NOT let the stretch goal grow cron jobs or a server DB during the course — that is this repo's whole complexity class, reproduced.

---

## 11. Alternative A — toned-down tracker (previous plan, condensed)

Only if the rubric demands a server-side database and the group still prefers the tracker's product. Full detail lives in this file's 2026-10-02 revision (git history).

- **Shape:** recreate this app minus the analytics depth — dashboard, member list + detail, war views — reading a copied database.
- **New key + proxy:** identical to §2/§6 (key still never ships in the bundle).
- **New Supabase with the data copied** (history is not re-fetchable): `pg_dump` the whole database (custom format, includes the Drizzle migration table) and `pg_restore` into the fresh project; `drizzle-kit migrate` then stays a no-op.
- **Keep the ingest pipeline** (`/api/ingest`, cron-job.org 5-min light poll + daily batch, `/api/cron/purge`) running against the new DB — this is the operational cost the searcher model avoids.
- **Phases:** infra fork → Expo scaffold → navigation/member profiles → chart port (the big one) → polish.
- **Risks:** pipeline babysitting (see the outage postmortem), the data copy is one-shot and drifts from production, chart port is the largest single work item.

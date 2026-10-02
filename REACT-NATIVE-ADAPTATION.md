# React Native (Expo) Adaptation — Course Project Guide

**Date:** 2026-10-02
**Audience:** the course group forking this project into a React Native (Expo) mobile app.
**Status:** planning guide. This repository stays as-is — web dashboard, API backend, and ingest pipeline — and serves as the reference implementation the course fork builds on.

---

## Answers at a glance

| Question | Decision |
|---|---|
| New Clash of Clans API key? | **Yes** — one fresh key for the course project, still behind the RoyaleAPI proxy |
| New database? | **Yes** — new Supabase project, **copying the data**, not just the schema |
| New GitHub repo? | **Yes** — fresh repository with a single initial-import commit; keep this one as the reference |
| Planning docs? | Toned way down: one README + a `MILESTONES.md`; this repo's `docs/concept/` folder becomes source material for the course report |

---

## 1. Why this project adapts well

The heavy lifting in Umbra-Lunaria is deliberately separated from the web UI.
The data pipeline (scheduled COC API polling, membership reconciliation, war
sync, retention/purge), the scoring engines (activity, donations, war
efficiency, targeting), and the query layer are pure TypeScript + SQL with no
browser dependencies. Only the presentation layer (`components/`, `app/`
pages) is web-specific. A React Native client replaces the face while the
engine keeps running unchanged — roughly 70% of the hard logic carries over
as-is.

## 2. Decisions to make first

### 2.1 New Clash of Clans API key — yes

- Create a fresh key at <https://developer.clashofclans.com> under whichever
  game account the group designates as owner. The current production key is
  tied to this project's owner account and has its own throttle budget;
  sharing a key couples both projects' rate limits, and revoking it for one
  kills the other.
- **Keep using the RoyaleAPI proxy** (`https://cocproxy.royaleapi.dev/v1`).
  The official API requires a static IP allowlist, which cannot work from
  serverless platforms; the proxy's own IP is what gets allowlisted instead
  (this project's key allows `45.79.218.79` — the proxy lists the current IP
  on its page). Point `COC_API_BASE_URL` at the proxy and set the new key as
  `COC_API_TOKEN`.
- **The key never ships in the app bundle.** Nothing Supercell-related runs
  on the phone. Ingest stays server-side exactly as it is now; the Expo app
  only ever talks to your own API.

### 2.2 New database — yes, and copy the DATA

A fresh empty database would only start accumulating history from the
project's start date, because the COC API **cannot re-fetch the past**: daily
member snapshots, membership events (joins/leaves/rejoins), career
progression, and capital raid history are point-in-time captures. Copying the
existing data gives the group a rich dataset to demo from day one.

Create a new Supabase project, then copy everything (schema + data + the
Drizzle migration history, so `drizzle-kit migrate` stays a no-op):

```bash
# dump the whole database (not just public — keeps the drizzle migration table)
pg_dump "postgres://postgres.<OLD-REF>:<OLD-PASSWORD>@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  --format=custom --file=umbra.dump

# restore into the new project (session pooler, port 5432)
pg_restore "postgres://postgres.<NEW-REF>:<NEW-PASSWORD>@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  --dbname=postgres --clean --if-exists umbra.dump
```

Both connection strings are on each project's Supabase dashboard
("Connect" → "Session pooler" for running `pg_dump`/`pg_restore`).

### 2.3 New GitHub repository — yes

Classmates need push access and their own PR history; the production repo
that deploys this tracker should not take student traffic. Keep the original
as the private reference/portfolio.

- **Fresh repo, single "initial import" commit** — do not fork the 418-commit
  history. This repo's CI contracts (ISR route-mode assertions, deployment
  smoke, integration suite) all assume the Next.js app and are dead weight
  for a mobile-first project.
- **Planning, toned down.** What a course repo needs: a README with an
  architecture sketch, a `MILESTONES.md` with 4–5 dated milestones, and
  optionally a short decision log. This repo's `docs/concept/` folder
  (data model, polling design, scoring definitions) is excellent raw
  material for the course report — cite it, don't copy it wholesale.

## 3. Target architecture

```
cron-job.org (5-min light poll + daily batch)      GitHub Actions (CI)
        │                                                 │
        ▼                                                 ▼
  course Vercel app  ── /api/ingest ──►  COC API via RoyaleAPI proxy
        │
        ├── Next.js API routes (reused): reads via lib/db/queries.ts
        ▼
  course Supabase (copied data)
        ▲
        │  HTTPS + JSON only — no DB credentials in the app
  Expo app (React Native)
```

The middle tier is this repo's Next.js app, deployed on Vercel's free tier:
it keeps running the ingest route, the cron purge, and read-only JSON
endpoints for the mobile client.

## 4. What carries over vs. what gets rewritten

| Layer | Location | Verdict |
|---|---|---|
| Scoring engines | `lib/scoring/*`, `lib/war/*` | **Reuse as-is** — pure TypeScript, zero web deps |
| Query layer | `lib/db/queries.ts`, view-models | **Reuse as-is**, server-side |
| Schema + migrations | `lib/db/schema.ts`, `drizzle/` | **Reuse as-is** (comes with the DB copy) |
| Ingest pipeline | `app/api/ingest/`, `lib/ingest/*` | **Reuse as-is** |
| API routes (read) | `app/api/analytics`, `app/api/members/[tag]`, `app/api/war/[id]` | **Reuse + extend** — the app also needs a members LIST and dashboard-summary route (mirror what the ISR pages call in `lib/db/queries.ts`) |
| Cron purge | `app/api/cron/purge` | **Reuse as-is** |
| Web UI | `components/**`, `app/(pages)` | **Rewrite** in React Native |
| Charts (Recharts) | dashboard chart components | **Rewrite** — Recharts is DOM-based and does not run in RN |
| CI | `.github/workflows/ci.yml` | **Slim down** — keep typecheck/lint/unit tests; drop route-mode + smoke + integration suites |
| PWA shell | `public/sw.js`, `components/pwa/` | **Drop** — superseded by the native app |

## 5. Phase plan

- **Phase 0 — infrastructure fork (half a day).** New repo, new Supabase with
  the data copy, new COC key, Vercel deploy of the (unchanged) Next.js app,
  env secrets wired, cron-job.org pointed at the new URL. Deliverable: the
  API backend runs standalone and keeps ingesting.
- **Phase 1 — Expo scaffold + one real screen (2–3 days).** Expo Router
  (`app/` maps 1:1: dashboard / members / member detail / war analytics),
  TanStack Query for fetching + caching, one screen wired to
  `/api/analytics`. Prove the request path early.
- **Phase 2 — navigation + member profiles (3–5 days).** Deep links
  (`/members?tag=…` pattern ports directly), member sheet, the shared
  design language (mono micro-labels, glass cards via `expo-blur`,
  focus states).
- **Phase 3 — charts port (5–7 days; highest risk).** Recharts does not run
  in React Native — pick `victory-native` (Skia-backed) or
  `react-native-gifted-charts` and port the chart set: stacked membership
  timeline, composed clan-pulse bars + lines, donation trend, war efficiency.
  Port the `ChartLegend` swatch pattern as a RN component so cards stay
  visually consistent. Prototype one chart screen in week one to retire the
  risk.
- **Phase 4 — polish + demo (3–4 days).** Staleness surfacing, empty/error
  states, pull-to-refresh, an app icon, and the demo runbook.

## 6. Environment variables

Server side (Vercel project settings — never in the app):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Course Supabase connection string (transaction pooler, port 6543) |
| `COC_API_TOKEN` | The **new** Clash of Clans API key |
| `COC_API_BASE_URL` | `https://cocproxy.royaleapi.dev/v1` |
| `INGEST_SECRET` | Bearer token the cron service sends to `/api/ingest` |
| `CRON_SECRET` | Bearer token for `/api/cron/purge` |

Client side (the only value the Expo app holds):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the course API (e.g. `https://<course-app>.vercel.app`) |

Everything else — `EXPO_PUBLIC_*` included — is extractable from the app
bundle by anyone who downloads it, so nothing secret ever goes there.

## 7. Suggested team split (4 people)

- **Data/API owner** — Phase 0, ingest pipeline, new read-only routes.
- **App screens** — navigation, member profiles, dashboard layout.
- **Charts** — the chart library port + `ChartLegend` pattern.
- **Design system + CI + docs** — tokens, glass cards, lint/typecheck/test
  workflow, the course report.

PR-based workflow with required checks on the course repo — it reads well in
a rubric and keeps `main` deployable.

## 8. Rules and pitfalls

1. **No COC secrets in the app.** The game API is only ever called
   server-side; the phone only sees your JSON.
2. **No direct database access from the app.** All reads go through the API
   so the query logic and connection handling stay in one place.
3. **Keep the server-side polling cadence.** The COC API is throttled;
   polling it from every device would exhaust the key. The app polls *your*
   API, not Supercell.
4. **Add API auth before any long-lived public deploy.** The read routes
   currently have none (fine for a course demo; a shared-secret header or
   short-lived tokens for anything beyond that).
5. **Recharts will not run in React Native.** Budget the chart port as the
   biggest single work item, not an afterthought.
6. **Mind Vercel function timeouts.** The daily batch does a full-roster
   player fetch; keep its `maxDuration` configured.
7. **Don't fork the commit history.** Fresh repo, import commit, own
   milestones.

## 9. Relationship to this repository

This repo keeps running the production tracker (its ingest, database, and
CI are untouched by the course fork). The fork takes the engine and the
design language, replaces the web face with Expo, and documents its own —
much lighter — process. When the course ends, the concept docs in
`docs/concept/` double as citable background for the report.

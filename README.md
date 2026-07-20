# Umbra Lunaria

A dedicated dashboard for a single Clash of Clans clan — member activity, war tracking, Clan Capital, and war-roster planning — built to run on Vercel.

This is a single-clan tool. It is configured once, for one clan tag, and used by that clan's leadership and members.

## Status

**Phase 0 in progress.** The project scaffold (Next.js + TypeScript + Tailwind, Drizzle schema, CoC API client, ingestion routes, GitHub Actions poller) is live on `main`. What's left before it's actually running: a real API key, a deployed Vercel project with a Neon database, and repo/env secrets — see **Setup checklist** below. Full design docs are in [`/concept`](./concept), starting with [`concept/00-overview.md`](./concept/00-overview.md).

## Planned features

1. **Main Dashboard** — clan donations (24h/week/month), an hour-by-hour/day-by-day activity graph, an all-time war record card, a clan info panel, and a needs-attention panel.
2. **Clan Members List** — sortable/filterable roster (wars missed, war preference); per-member popup with activity history, login activity graph, war participation (missed attacks), career/lifetime stats, rushed/non-rushed analysis, full troop/hero/spell/pet levels shown as in-game cards, and a minimal Builder Base summary.
3. **Clan War Details** — war history (regular + league), a live current-war view with a manual refresh button, and a preparation-day opponent scouting view.
4. **Clan Capital Details** — raid-weekend activity dashboard, per-member contributions, and district-level upgrade tracking.
5. **Next Clan War Planning** — drag-and-drop roster builder, member popups, war-size selection, and an auto-suggest ranking based on accumulated activity and war-performance history, with war-preference-aware filtering.

Full detail for each of these is in the corresponding file under [`/concept`](./concept).

## Concept docs

| File | Covers |
|---|---|
| [`00-overview.md`](./concept/00-overview.md) | Scope, and the three constraints that shape the whole project — **read first** |
| [`01-tech-stack.md`](./concept/01-tech-stack.md) | Stack choices and reasoning |
| [`02-api-and-proxy-strategy.md`](./concept/02-api-and-proxy-strategy.md) | Why a proxy is required and how it works |
| [`03-data-model-and-database.md`](./concept/03-data-model-and-database.md) | Schema and the 2-week member-data retention policy |
| [`04-activity-tracking-and-polling.md`](./concept/04-activity-tracking-and-polling.md) | How "activity" is inferred and polled |
| [`05-dashboard.md`](./concept/05-dashboard.md) | Main Dashboard |
| [`06-members.md`](./concept/06-members.md) | Members List, login activity graph, missed-attack tracking, career stats, rushed % methodology |
| [`07-clan-war.md`](./concept/07-clan-war.md) | Clan War Details, war-prep opponent scouting |
| [`08-clan-capital.md`](./concept/08-clan-capital.md) | Clan Capital Details, district-level upgrade tracking |
| [`09-war-planning-and-auto-select.md`](./concept/09-war-planning-and-auto-select.md) | War planning + auto-select ranking, war-preference filtering |
| [`10-mobile-support.md`](./concept/10-mobile-support.md) | Mobile support planning |
| [`11-config-specification.md`](./concept/11-config-specification.md) | Config schema — clan tag, settings, env vars |
| [`12-roadmap-and-modularity.md`](./concept/12-roadmap-and-modularity.md) | Build order, and staying resilient to game updates |

## Requirements

- A Clash of Clans account, with a clan to track (leadership access isn't required to *read* public clan data via the API, but is required if the clan's war log is private and you want it public — see below).
- A Supercell ID / Clash of Clans developer account to create an API key.
- A GitHub account (for the repo, and for the scheduled polling workflow — see [`concept/01-tech-stack.md`](./concept/01-tech-stack.md)).
- A Vercel account, for hosting.
- A Neon account (or just use Vercel's Marketplace integration, which provisions one for you — see [`concept/03-data-model-and-database.md`](./concept/03-data-model-and-database.md)).

## Setup checklist

Do these in order — later steps need values from earlier ones.

1. **Get a CoC API key** — see the step-by-step below. You'll come out of this with a token and your clan tag.
2. **Set `config/clan.config.ts`** — replace the placeholder `clanTag: "#CHANGEME"` with your real tag.
3. **Create the Vercel project and Neon database** — see "Vercel & database" below. You'll come out of this with a deployment URL and a `DATABASE_URL`.
4. **Set Vercel environment variables** — `COC_API_TOKEN`, `COC_API_BASE_URL`, `INGEST_SECRET` (see "Configuration").
5. **Set GitHub repo secrets** — see "GitHub Actions & repo secrets" below. `INGEST_SECRET` here must be the **same value** as in Vercel.
6. **Run the database migration** against `DATABASE_URL` — see "Local development" below.
7. **Verify it's working** — Actions tab → "Poll Clash of Clans data" → Run workflow (manual trigger via `workflow_dispatch`, don't need to wait for the schedule). Check the run succeeded, then check the `members` and `member_snapshots` tables in Neon for rows.

## Getting a Clash of Clans API key — step by step

The Clash of Clans API is free, but every key is locked to specific IP addresses, which is exactly the problem this project routes around using a proxy (full explanation in [`concept/02-api-and-proxy-strategy.md`](./concept/02-api-and-proxy-strategy.md)). Follow these steps in order:

1. **Go to the developer portal:** [developer.clashofclans.com](https://developer.clashofclans.com/) and sign in with a Supercell ID (the same account system used for the game — link it in-game under Settings → More Settings if you haven't already).
2. **Create an account** on the developer portal if this is your first time (separate step from just having a Supercell ID — the portal needs its own registration).
3. Go to **My Account → Create Key**.
4. Fill in the key creation form:
   - **Key Name:** anything identifiable, e.g. `Umbra Lunaria Production`.
   - **Description:** optional, e.g. `Clan dashboard hosted on Vercel`.
   - **Allowed IP Addresses:** this is the field that matters. **Do not try to guess or enter a Vercel IP** — it changes constantly and this will not work. Enter RoyaleAPI's fixed proxy IP instead: `45.79.218.79`. (Full reasoning in [`concept/02-api-and-proxy-strategy.md`](./concept/02-api-and-proxy-strategy.md).)
5. Click **Create Key**. Copy the generated token immediately — the full token is only shown once. If you lose it, you'll need to revoke and recreate the key.
6. **Do not commit this token to the repo.** It goes into Vercel's environment variables (`COC_API_TOKEN`) and into the GitHub Actions workflow's repo secrets, both described in [`concept/11-config-specification.md`](./concept/11-config-specification.md) — never in a checked-in file.
7. **Find your clan's tag:** in-game, open your clan's info screen — the tag is shown under the clan name, starting with `#`. You'll need it for `config/clan.config.ts` (see [`concept/11-config-specification.md`](./concept/11-config-specification.md)).
8. **Check whether your clan's war log is public:** Clan Settings (in-game, leader/co-leader only) → War Log visibility. If it's private, historical war results before this tool starts running won't be recoverable through the API — see the note in [`concept/07-clan-war.md`](./concept/07-clan-war.md). Setting it to public is optional but recommended if you want a head start on war history.
9. Once your Vercel project is set up with the env vars from [`concept/11-config-specification.md`](./concept/11-config-specification.md), all Clash of Clans API calls in this project are routed through `https://cocproxy.royaleapi.dev` automatically — you should never need to touch the raw `api.clashofclans.com` URL directly in application code.

**Key rotation note:** if you ever need to redeploy from a different environment or the key stops working, the fix is almost always in this same portal — either the key was revoked, or (far more commonly) something changed and requests are arriving from an IP that isn't `45.79.218.79`, which usually means a request bypassed the proxy somewhere. Check `COC_API_BASE_URL` first.

## Vercel & database

1. **New Project** in Vercel → import `lejxz/Umbra-Lunaria` from GitHub.
2. **Storage** tab → Marketplace Database Providers → **Neon** → Create. This provisions a free-tier Postgres database and auto-populates `DATABASE_URL` in the project's environment variables — no separate Neon signup needed.
3. **Environment Variables** (Project Settings): add `COC_API_TOKEN`, `COC_API_BASE_URL`, and `INGEST_SECRET` — see "Configuration" below for exact values.
4. **Deploy.** Vercel picks up `vercel.json`'s cron entry automatically and provisions `CRON_SECRET` itself — you don't set that one by hand.
5. Copy the resulting deployment URL (e.g. `https://umbra-lunaria.vercel.app`) — you need it for the GitHub Actions secret below.

## GitHub Actions & repo secrets

The polling workflow (`.github/workflows/poll.yml`) runs on GitHub's infrastructure and calls your deployed Vercel app — it needs its own secrets, separate from Vercel's environment variables:

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**.
2. Add `INGEST_SECRET` — generate one with `openssl rand -hex 32`, and use the **exact same value** you set in Vercel's `INGEST_SECRET`. If these two don't match, `/api/ingest` returns 401 and every poll fails silently until someone checks the Actions log.
3. Add `VERCEL_APP_URL` — the deployment URL from the Vercel step above, no trailing slash.
4. Test it: Actions tab → "Poll Clash of Clans data" → **Run workflow** (this uses the `workflow_dispatch` trigger, so you don't have to wait for the cron schedule to fire).

**A gotcha worth knowing about if you're pushing to this repo with a personal access token** (including if an AI coding tool is pushing on your behalf): GitHub rejects any push that touches `.github/workflows/*` unless the token has the **`workflow`** scope. A token without it will push everything else in a commit but fail specifically on the workflow file, with no ambiguity in the error message — it says so directly. Fine-grained PATs can have this permission added after creation without regenerating the token value; classic PATs need the `workflow` scope checked at creation.

## Configuration

Full schema, all fields explained, in [`concept/11-config-specification.md`](./concept/11-config-specification.md). Summary: a non-secret `config/clan.config.ts` file (clan tag, timezone, retention days, feature toggles) plus secret environment variables (API token, database URL, ingestion/cron secrets) that never get committed. No user authentication — the dashboard and all actions are open access.

## Local development

```bash
git clone https://github.com/lejxz/Umbra-Lunaria.git
cd Umbra-Lunaria
npm install
cp .env.example .env.local   # fill in COC_API_TOKEN, DATABASE_URL, etc.
npm run db:generate          # generates a migration from lib/db/schema.ts
npm run db:migrate           # applies it to the DATABASE_URL in .env.local
npm run dev                  # http://localhost:3000
```

`npm run build` runs the same production build Vercel runs — worth checking locally after any schema or route change, since a build failure on Vercel is slower to debug than one here.

## Mobile support

This is planned as a single responsive web app (no separate native app or codebase), designed mobile-first, since most members will check it on a phone. Full reasoning and the specific places it affects earlier design decisions (drag-and-drop, charts, tables, modals) are in [`concept/10-mobile-support.md`](./concept/10-mobile-support.md).

## License

[MIT](./LICENSE)

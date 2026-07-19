# 00 — Overview & Guiding Constraints

## What this project is

Umbra Lunaria is a dedicated web dashboard for a single Clash of Clans clan, hosted on Vercel. It pulls data from the official Clash of Clans API, stores a history of that data over time, and presents it as a dashboard, member browser, war center, capital tracker, and a war-planning tool.

Single clan only. One `clanTag`, configured once. No user authentication — open access.

## Feature scope

1. **Main Dashboard** — donation totals (24h/week/month), activity graph, all-time war record, clan info panel, needs-attention panel.
2. **Clan Members List** — sortable/filterable table (wars missed, war preference); detail popup per member: activity history, login activity graph, war participation, career stats, rushed/non-rushed analysis, troop/hero/spell/pet cards, minimal Builder Base summary.
3. **Clan War Details** — war history (regular + league), live current-war view refreshed on demand, preparation-day opponent scouting.
4. **Clan Capital Details** — capital activity dashboard, per-member contribution, district-level upgrade tracking.
5. **Next Clan War Planning** — drag-and-drop roster builder, member popups, war size selection, auto-suggest ranking (war-preference-aware).
6. **General system** — modular, database-backed, documented config.

Build order: `12-roadmap-and-modularity.md`.

## Constraints

### 1. Static IP required, Vercel Hobby doesn't have one

CoC API keys are locked to specific IP addresses; Vercel Hobby functions run on a rotating IP range. Fix: route all calls through RoyaleAPI's proxy (`cocproxy.royaleapi.dev`), whitelist their fixed IP (`45.79.218.79`) instead of trying to whitelist Vercel. Detail: `02-api-and-proxy-strategy.md`.

### 2. No activity/last-login field — inferred from snapshots

The API exposes state, not events: donations, trophies, versus trophies, capital contributions, war attacks used. No login timestamp anywhere in the response.

- **Activity graph/flag:** poll on a schedule, diff snapshots. Any change in donations, trophies, or capital contribution between polls marks that window active.
- **Login activity graph:** built specifically from daily donation deltas — a donation requires being online. Shown as a graph of dates, not a streak count. Detail: `04-activity-tracking-and-polling.md`.

Consequence: the system only knows what it has observed since it started running. Day one, these graphs and `09-war-planning-and-auto-select.md` scoring are empty and fill in over time.

### 3. Vercel Hobby Cron caps at once/day

Activity graphs need polling every 10–15 minutes; Hobby Cron can't go below 24h. Fix: GitHub Actions scheduled workflow hits a protected Vercel API route on that cadence. Vercel Cron is used only for the daily 2-week-retention purge (`03-data-model-and-database.md`).

### 4. Not everything requested is obtainable from the API

Two things dropped from scope entirely because no API field or endpoint supports them, even indirectly: a true login streak (no login log exists — replaced by the donation-based login graph above), and live in-progress Clan Capital building-upgrade cost/progress (only the *completed* district level is exposed, which is enough for district-level-up tracking but not a "3,200/9,000 gold" progress bar — see `08-clan-capital.md`).

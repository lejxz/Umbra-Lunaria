# 00 — Overview & Guiding Constraints

## What this project is

Umbra Lunaria is a dedicated web dashboard for a single Clash of Clans clan, hosted on Vercel. It pulls data from the official Clash of Clans API, stores a history of that data over time, and presents it as a dashboard, member browser, war center, capital tracker, and a war-planning tool.

Single clan only. One `clanTag`, configured once.

## Feature scope

1. **Main Dashboard** — donation totals (24h / week / month), an activity graph (hourly / weekly / monthly).
2. **Clan Members List** — sortable/filterable member table plus a detail popup per member: activity history, login activity graph, rushed/non-rushed analysis, full troop/hero/spell/pet levels shown as in-game cards, minimal Builder Base summary.
3. **Clan War Details** — war history (regular + league), live current-war view refreshed on demand.
4. **Clan Capital Details** — capital activity dashboard, per-member contribution.
5. **Next Clan War Planning** — drag-and-drop roster builder, member detail popups, war size selection, auto-suggest ranking based on activity and war performance history.
6. **General system** — modular, database-backed, documented config.

Read `12-roadmap-and-modularity.md` for build order.

## Constraints

### 1. Static IP required, Vercel Hobby doesn't have one

CoC API keys are locked to specific IP addresses; Vercel Hobby functions run on a rotating IP range. Fix: route all calls through RoyaleAPI's proxy (`cocproxy.royaleapi.dev`), whitelist their fixed IP (`45.79.218.79`) instead of trying to whitelist Vercel. Full detail: `02-api-and-proxy-strategy.md`.

### 2. No activity/last-seen/last-login field — inferred from snapshots

The API exposes state, not events: donations given/received, trophies, versus trophies, capital contributions, war attacks used. There is no login timestamp anywhere in the response.

- **Activity graph / activity flag:** poll on a schedule, diff snapshots. Any change in donations, trophies, or capital contribution between polls marks that window active.
- **Login activity graph:** a calendar/graph view built specifically from daily donation deltas (given or received) — a donation requires being online, so a day with a donation change is marked as a login day. This replaces the "login streak" concept from the original brief: shown as a graph of dates, not a streak counter. Detail: `04-activity-tracking-and-polling.md`.

Consequence: the system only knows what it has observed since it started running. Day one, these graphs are empty and fill in over time. Also affects `09-war-planning-and-auto-select.md`.

### 3. Vercel Hobby Cron caps at once/day — polling needs an external trigger

Activity graphs need polling every 10–15 minutes; Hobby Cron can't go below 24h. Fix: GitHub Actions scheduled workflow calls a protected Vercel API route on that cadence. Vercel Cron is used only for the daily 2-week-retention purge (`03-data-model-and-database.md`).

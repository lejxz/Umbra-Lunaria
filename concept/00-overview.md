# 00 — Overview & Guiding Constraints

## What this project is

Umbra Lunaria is a dedicated web dashboard for a single Clash of Clans clan, hosted on Vercel. It pulls data from the official Clash of Clans API, stores a history of that data over time, and presents it as a dashboard, member browser, war center, capital tracker, and a war-planning tool.

It is **not** a multi-clan SaaS product. It is built around one `clanTag`, configured once, and used by the clan's leadership.

## Feature scope (from planning discussion)

1. **Main Dashboard** — donation totals (24h / week / month), an activity graph (hourly / weekly / monthly), and room for more dashboard widgets later.
2. **Clan Members List** — sortable/filterable member table plus a detail popup per member: activity history, login-streak estimate, rushed/non-rushed analysis, full troop/hero/spell/pet levels shown as in-game cards, and a minimal Builder Base summary.
3. **Clan War Details** — war history (regular + league), a live current-war view refreshed on demand.
4. **Clan Capital Details** — capital activity dashboard, per-member contribution, current district upgrade progress.
5. **Next Clan War Planning** — drag-and-drop roster builder, member detail popups, war size selection, and an auto-suggest ranking based on activity and war performance history.
6. **General system qualities** — modular enough to survive Supercell balance patches and API changes, with a real database and a real, documented config.

This document, and the rest of `/concept`, is the plan for all of that. Read `12-roadmap-and-modularity.md` last — it explains the build order and why it's ordered that way.

## The constraints that shape every other document

Read this section before any other. Three limitations control almost every architectural decision below. None of them are optional or solvable by "just building it better" — they come from Supercell's API and from Vercel's platform, and the plan below is built around them rather than pretending they don't exist.

### 1. The Clash of Clans API requires a whitelisted static IP, and Vercel's free tier doesn't have one

Every key created at `developer.clashofclans.com` is locked to a specific list of IP addresses. If a request arrives from an IP not on that list, the API returns `403 invalidIp`, no matter how valid the key is.

Vercel Serverless Functions on the **Hobby (free) plan** run on a shared, rotating IP range — there is no static IP option available. Vercel does now sell a "Static IPs" add-on, but it is Pro/Enterprise only, priced separately from hosting (roughly $100/month plus metered bandwidth as of mid-2026), and pointless for a single-clan hobby project.

**The practical fix:** route all Clash of Clans API calls through [RoyaleAPI's free proxy](https://docs.royaleapi.com/proxy.html). You whitelist RoyaleAPI's fixed IP (`45.79.218.79`) on your CoC API key instead of trying to whitelist Vercel's IP, and you call `https://cocproxy.royaleapi.dev/...` instead of `https://api.clashofclans.com/...`. The proxy forwards your token straight through — full detail in `02-api-and-proxy-strategy.md`. This is the standard, widely-used solution for exactly this problem and it costs nothing.

### 2. The API has no "activity" or "last seen" field — activity has to be inferred

There is no endpoint that tells you when a player last opened the app, and no login log. What the API gives you is a **snapshot** of current state: donations given/received, trophies, versus trophies, clan capital contributions this raid weekend, war attacks used.

Every "activity" feature in this plan — the activity graph, login-streak estimate, and the activity component of war-roster ranking — works by **polling the API on a schedule and diffing successive snapshots**. If a member's donation count, trophy count, or capital contribution changed since the last poll, we count that as a sign of activity in that window. This is an inference, not a certainty, and the docs below say so explicitly rather than presenting it as a real login log.

This has a direct consequence: **the system only knows what it has observed since it started running.** It cannot retroactively reconstruct six months of history for a clan that just installed it. Day one, the activity graph is empty. It fills in over the following days and weeks. This is disclosed in `04-activity-tracking-and-polling.md` and again in `09-war-planning-and-auto-select.md`, because it directly limits how good the auto-select feature can be early on.

### 3. Vercel Hobby Cron only runs once a day — polling needs an external trigger

Vercel's built-in Cron Jobs are capped at once-per-24-hours on the Hobby plan; anything more frequent fails at deploy time. An hourly activity graph needs polling far more often than that (every 10–15 minutes is the target — see `04-activity-tracking-and-polling.md` for the reasoning).

**The practical fix:** don't use Vercel Cron for polling. Use a **GitHub Actions scheduled workflow** (free on a public or reasonably-used private repo) that calls a protected Vercel API route every 10–15 minutes. Vercel Cron is still used, but only for the one genuinely daily job: the 2-week-retention purge described in `03-data-model-and-database.md`.

### What this means going in

None of this is a reason not to build the project — every one of these problems has a known, free (or effectively free) workaround, and thousands of community Clash of Clans tools run on exactly this pattern (ClashKing, ClashPerk, and others all sit behind the RoyaleAPI proxy for the same reason). But a plan that skipped over these three points would fall apart in week one, so they're stated up front instead of discovered during build.

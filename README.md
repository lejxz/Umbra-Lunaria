# Umbra Lunaria

A dedicated dashboard for a single Clash of Clans clan — member activity, war tracking, Clan Capital, and war-roster planning — built to run on Vercel.

This is a single-clan tool. It is configured once, for one clan tag, and used by that clan's leadership and members.

## Status

Planning stage. See [`/concept`](./concept) for the full design — start with [`concept/00-overview.md`](./concept/00-overview.md).

## Planned features

1. **Main Dashboard** — clan donations (24h/week/month), an hour-by-hour/day-by-day activity graph, clan-level stats.
2. **Clan Members List** — sortable/filterable roster (including wars missed); per-member popup with activity history, login activity graph, war participation (missed attacks), rushed/non-rushed analysis, full troop/hero/spell/pet levels shown as in-game cards, and a minimal Builder Base summary.
3. **Clan War Details** — war history (regular + league), a live current-war view with a manual refresh button.
4. **Clan Capital Details** — raid-weekend activity dashboard and per-member contributions.
5. **Next Clan War Planning** — drag-and-drop roster builder, member popups, war-size selection, and an auto-suggest ranking based on accumulated activity and war-performance history.

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
| [`06-members.md`](./concept/06-members.md) | Members List, login activity graph, missed-attack tracking, rushed % methodology |
| [`07-clan-war.md`](./concept/07-clan-war.md) | Clan War Details |
| [`08-clan-capital.md`](./concept/08-clan-capital.md) | Clan Capital Details |
| [`09-war-planning-and-auto-select.md`](./concept/09-war-planning-and-auto-select.md) | War planning + auto-select ranking |
| [`10-mobile-support.md`](./concept/10-mobile-support.md) | Mobile support planning |
| [`11-config-specification.md`](./concept/11-config-specification.md) | Config schema — clan tag, settings, env vars |
| [`12-roadmap-and-modularity.md`](./concept/12-roadmap-and-modularity.md) | Build order, and staying resilient to game updates |

## Requirements

- A Clash of Clans account, with a clan to track (leadership access isn't required to *read* public clan data via the API, but is required if the clan's war log is private and you want it public — see below).
- A Supercell ID / Clash of Clans developer account to create an API key.
- A GitHub account (for the repo, and for the scheduled polling workflow — see [`concept/01-tech-stack.md`](./concept/01-tech-stack.md)).
- A Vercel account, for hosting.
- A Neon account (or just use Vercel's Marketplace integration, which provisions one for you — see [`concept/03-data-model-and-database.md`](./concept/03-data-model-and-database.md)).

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

## Configuration

Full schema, all fields explained, in [`concept/11-config-specification.md`](./concept/11-config-specification.md). Summary: a non-secret `config/clan.config.ts` file (clan tag, timezone, retention days, feature toggles) plus secret environment variables (API token, database URL, ingestion/cron secrets, auth credentials) that never get committed.

## Mobile support

This is planned as a single responsive web app (no separate native app or codebase), designed mobile-first, since most members will check it on a phone. Full reasoning and the specific places it affects earlier design decisions (drag-and-drop, charts, tables, modals) are in [`concept/10-mobile-support.md`](./concept/10-mobile-support.md).

## License

Not yet decided — add one before making the repo public if it isn't already private.

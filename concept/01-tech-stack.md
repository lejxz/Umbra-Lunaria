# 01 — Tech Stack

## Summary table

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | First-party Vercel support, server components for API-heavy pages, API routes double as the ingestion + BFF layer. |
| Language | TypeScript | The CoC API has a large, nested, semi-documented response shape. Typed models catch drift early, especially after a game update changes fields. |
| Styling | Tailwind CSS | Fast iteration, easy to keep the "in-game" visual language (troop cards, TH-colored badges) consistent. |
| Database | PostgreSQL via **Neon**, installed through the Vercel Marketplace | Vercel's own Postgres product was sunset in 2025 and migrated users to Neon; Neon is now the standard first-party-adjacent Postgres option for Vercel projects, with a free tier and scale-to-zero compute, which matters for a small single-clan project with bursty traffic. |
| ORM | Drizzle ORM (or Prisma — see note) | Drizzle is lighter and maps closely to raw SQL, which helps for the time-series-heavy tables in this project. Prisma is the safer pick if the team is more comfortable with it; either works with Neon. Pick one before Phase 1 and don't switch later. |
| Scheduled polling | GitHub Actions scheduled workflow | Vercel Hobby Cron cannot run more often than daily (see `00-overview.md`). GitHub Actions can run every 10–15 minutes for free and simply calls a protected Vercel API route. |
| Daily retention job | Vercel Cron (1x/day) | The only job in the system that genuinely only needs to run once a day: purging members who left 2+ weeks ago. |
| CoC API access | RoyaleAPI proxy (`cocproxy.royaleapi.dev`) | Solves the static-IP requirement for free. See `02-api-and-proxy-strategy.md`. |
| Charts | Recharts or a lightweight canvas-based chart lib | Activity graphs and donation graphs are the core visual product here; pick a library that renders well on mobile widths too (see `10-mobile-support.md`). |
| Drag-and-drop (war planning) | `@dnd-kit` | Actively maintained, accessible, works on touch — important since the roster planner needs to be usable on a phone, not just desktop. |
| Deployment | Vercel | Given, since the whole plan is scoped around it. |

## Access

No authentication. Every view and every write action (war roster edits, planning) is open to anyone with the URL — the `/api/ingest` and `/api/cron/purge` routes are the only things gated, by shared secrets, since those are machine-to-machine and not user-facing (`11-config-specification.md`).

## Why not a "no-database" approach

An earlier, simpler design could try to just call the CoC API live on every page load and skip a database. This does not work for this feature set, for two separable reasons:

1. **Activity and war-performance history are things the CoC API does not store on your behalf.** If Umbra Lunaria doesn't record snapshots itself, that history doesn't exist anywhere and can never be recovered. A database is not an optimization here — it is the only way most of section 2 (Members) and section 5 (War Planning) of the feature list can exist at all.
2. **The CoC API is rate-limited.** Rendering the dashboard by live-calling the API on every visitor's page load, for every member, would burn through rate limits fast with more than a couple of concurrent users, and would make the site fall over during exactly the moment people want to check it — a few hours before war ends.

The database is written to by the poller (GitHub Actions job) and read by the Next.js app. The app itself rarely calls the live CoC API directly except for a few "refresh now" actions (e.g., the current-war refresh button), which are explicitly rate-limit-aware (see `06-clan-war.md`).

## Package/repo layout (proposed)

```
/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/
│   ├── members/
│   ├── war/
│   ├── capital/
│   ├── planning/
│   └── api/
│       ├── ingest/         # protected route the GitHub Action calls
│       ├── cron/purge/     # Vercel Cron target
│       └── coc/            # thin server-side wrappers around the CoC proxy
├── lib/
│   ├── coc-client/         # typed CoC API + proxy client
│   ├── scoring/            # rushed %, war-planning ranking algorithms
│   └── db/                 # Drizzle schema + queries
├── concept/                # this planning folder
├── config/
│   └── clan.config.ts      # see 11-config-specification.md
└── .github/workflows/
    └── poll.yml            # the 10–15 min scheduled ingestion job
```

This is a proposal, not a mandate — but the separation between `lib/coc-client` (talks to Supercell) and `lib/scoring` (talks to our own database) matters. Keep them decoupled so a change in the API response shape doesn't ripple into the scoring logic. See `12-roadmap-and-modularity.md` for more on this boundary.

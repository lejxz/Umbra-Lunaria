# 01 — Final Architecture & Technology Choices

## Chosen stack

| Layer | Choice | Responsibility |
|---|---|---|
| App | Next.js App Router + TypeScript | Server-rendered pages, route handlers, and typed UI boundaries. |
| Styling | Tailwind CSS + local UI primitives | Responsive, dark observatory interface. |
| Database | Neon PostgreSQL | Persistent API cache, snapshots, histories, and plans. |
| ORM | Drizzle ORM | Typed schema, migrations, and server-side queries. |
| Charts | Recharts | Donation and activity windows with accessible tooltips. |
| Drag and drop | `@dnd-kit` | Desktop roster planning; tap-to-add remains available on touch. |
| Polling | Third-party cron-job web service + protected Next.js route | 15-minute light polls and daily full batches. (Replaced GitHub Actions for schedule consistency; `.github/workflows/poll.yml` kept as a manual fallback.) |
| Scheduled purge | Vercel Cron | Daily retention cleanup. |
| Deployment | Vercel | Hosting and route execution. |
| CoC access | RoyaleAPI proxy | Fixed outbound IP for Supercell API-key allowlisting. |

## System boundaries

```text
Supercell API → RoyaleAPI proxy → lib/coc-client → protected ingest route
                                                    ↓
                                             Neon / Drizzle
                                                    ↓
                                server-side query layer → pages and UI components
```

1. `lib/coc-client` owns URL encoding, API response typing, request failures, and proxy access.
2. Ingestion transforms API responses into cached facts and tracked snapshots.
3. `lib/db/queries` owns application reads. Page components do not depend on raw Drizzle schema shape.
4. `lib/scoring` owns derived metrics such as rushed percentage, Member Activity Score, and roster ranking.
5. UI components receive display-ready data and never expose API secrets.

## Read and write policy

| Surface | Access |
|---|---|
| Dashboard, Members, War, Capital | Public read-only access. |
| Member detail sheet | Public read-only access, subject to retention rules. |
| War refresh | Public request, server-side rate limited and cached. |
| Ingest and purge | Machine-only bearer secrets. |
| Roster drafts/finalization | Administrator session required. |
| Runtime settings | Administrator session required. |

## Route contract

| Route | Method | Purpose |
|---|---|---|
| `/api/ingest` | `POST` | Perform one light or daily ingest cycle. |
| `/api/cron/purge` | `GET` | Remove expired member data. |
| `/api/war/refresh` | `POST` | Refresh current war through a short server cache. |
| `/api/rosters` | `POST`, `PATCH` | Create or update an administrator-owned draft. |
| `/api/rosters/[id]/finalize` | `POST` | Finalize an administrator-approved roster. |
| `/api/settings` | `GET`, `PATCH` | Read or update runtime settings; writes are administrator-only. |

No browser route calls Supercell directly. No API key, database URL, or ingestion secret may enter a client bundle.

## Asset policy

1. Reuse existing assets under `public/assets` before adding new artwork.
2. Use API-provided clan, league, and label image URLs for remote identity imagery.
3. Obtain troop, hero, spell, pet, equipment, and siege icons from the approved [Supercell Fankit](https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets), subject to its current terms.
4. Store approved static copies locally, maintain a unit-name-to-asset mapping, and document the source/update date.
5. Never depend on an undocumented third-party icon hotlink for core UI.

## Modularity rules

1. Keep raw API types isolated from presentation models.
2. Keep scoring formulas independent from React components.
3. Add schema migrations for new persisted features; do not silently overload unrelated JSON blobs.
4. Treat `final-feature-list.md` as product scope and `12-Implemantation-plan-and-modularity.md` as delivery order.
5. When Supercell changes a response, update the client type and reference data before changing page code.

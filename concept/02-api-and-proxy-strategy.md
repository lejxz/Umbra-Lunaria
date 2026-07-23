# 02 — Clash of Clans API, Proxy, and Data Availability

## Proxy strategy

Supercell API keys are restricted to fixed outbound IP addresses. Vercel Hobby functions do not provide a fixed outbound IP, so Umbra Lunaria routes server-side requests through `https://cocproxy.royaleapi.dev/v1`.

1. Allowlist RoyaleAPI’s documented proxy IP on the Supercell developer key.
2. Send the normal Supercell bearer token only from server-side code.
3. Keep the standard API path and URL-encode every tag (`#` becomes `%23`).
4. Treat proxy downtime as a failed poll: record the failure, retain prior data, and try again on the next scheduled cycle.

The proxy solves IP allowlisting only. It does not increase Supercell rate limits or make unavailable data available.

## Required endpoints

| Endpoint | Direct facts used by the product | Historical use |
|---|---|---|
| `GET /clans/{clanTag}` | Clan identity, description, badges, location, points, leagues, labels, requirements, war record, Capital hall, districts. | Daily clan cache and district snapshots. |
| `GET /clans/{clanTag}/members` | Current roster, roles, donations, trophies, rank, selected league fields. | 15-minute member snapshots and join/leave detection. |
| `GET /players/{playerTag}` | Full player profile, war preference, career data, achievements, progression arrays, Capital contribution total. | Daily detail cache and on-demand stale-cache refresh. |
| `GET /clans/{clanTag}/currentwar` | War state, timers, rosters, attacks, stars, destruction, opponent data. | Poll while preparation or battle is active. |
| `GET /clans/{clanTag}/warlog` | Public regular-war outcomes. | Optional historical backfill only when war log is public. |
| `GET /clans/{clanTag}/currentwar/leaguegroup` | CWL rounds and war tags. | CWL history and current-league view. |
| `GET /clanwarleagues/wars/{warTag}` | Full CWL-war details. | CWL participant and attack history. |
| `GET /clans/{clanTag}/capitalraidseasons` | Completed raid-weekend rewards, attacks, loot, and member contributions. | Raid history and Capital contribution trends. |

## What the API does and does not provide

| Need | Availability | Product behavior |
|---|---|---|
| Current clan/member/player state | Direct API fact | Cache it and show its capture time. |
| Troop, hero, equipment, spell, and pet levels | Direct player-response fact | Show current level and API-reported global max. |
| Current player name | Direct API fact | Refresh display name from the player tag. |
| Previous player names | Not provided | Only names observed by Umbra Lunaria after tracking starts can be retained. |
| True online or last-login time | Not provided | Show estimated activity only. |
| Donation history | Not provided | Build from reset-aware snapshots. |
| Historic war attacks | Partly available | Backfill public war log; otherwise build forward from tracking. |
| Current Capital district level | Direct clan-response fact | Snapshot daily and diff upgrades. |
| Live Capital upgrade cost/progress | Not provided | Do not invent a progress bar. |
| Raid-weekend result | Direct endpoint fact | Ingest completed seasons before showing trend analytics. |

## Rate-limit policy

1. A light poll makes one roster request and polls current war only when a war is active or in preparation.
2. Full player responses run in the daily batch, not every 15 minutes.
3. A member-detail refresh may happen on demand only when the cached detail is stale and must use a short server cache.
4. Browser refreshes never fan out directly to Supercell; `/api/war/refresh` applies a 30–60 second shared cache.
5. The UI shows the most recent successful capture time rather than implying live, second-by-second data.

## Stable identity

`playerTag` is the permanent identity key for members, snapshots, progression, war participation, and roster slots. Display names are mutable and may be tracked as observations, but never used as a primary key or join condition.

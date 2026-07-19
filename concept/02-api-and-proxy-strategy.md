# 02 — Clash of Clans API & Proxy Strategy

## The core problem, restated precisely

- A CoC API key is issued for a fixed list of IP addresses (up to a handful per key). Requests from any other IP get `403 Forbidden` with `reason: "accessDenied.invalidIp"`.
- Vercel Serverless Functions on Hobby do not have a stable outbound IP. Every invocation can come from a different address in a large, rotating range.
- Result: a naive `fetch("https://api.clashofclans.com/...")` from a Vercel function will work intermittently or not at all, because the key can only ever whitelist a handful of IPs and Vercel won't hold still.

## The fix: RoyaleAPI's proxy

RoyaleAPI (the team behind the popular Clash Royale stats site) runs a free public proxy that sits in front of Supercell's Clash of Clans, Clash Royale, and Brawl Stars APIs, specifically to solve this problem for developers on platforms without static IPs.

**How it works:**
1. Create your API key as normal at `developer.clashofclans.com`.
2. Instead of whitelisting your own (unstable) IP, whitelist RoyaleAPI's fixed proxy IP: **`45.79.218.79`**.
3. Send your requests to `https://cocproxy.royaleapi.dev/...` instead of `https://api.clashofclans.com/...`, keeping the same path and the same `Authorization: Bearer <token>` header.
4. RoyaleAPI forwards the request to Supercell from their whitelisted IP and returns the response unmodified.

Example:

```
Direct (breaks on Vercel):
GET https://api.clashofclans.com/v1/clans/%23YOURTAG/members

Through the proxy (works on Vercel):
GET https://cocproxy.royaleapi.dev/v1/clans/%23YOURTAG/members
```

Everything else about the request — headers, query params, response shape — is identical. This means `lib/coc-client` only needs a single configurable base URL, not a fork of its logic.

### Caveats to plan around

- This is a **third-party dependency you don't control**. If RoyaleAPI's proxy has downtime, ingestion pauses. Build the poller to fail gracefully (log and retry next cycle, don't crash) rather than assuming 100% uptime.
- This only solves outbound whitelisting. It does not increase your rate limit — Supercell's per-key rate limit still applies, the proxy doesn't grant a higher one.
- Do not put your CoC API token in client-side code. All CoC/proxy calls happen from server-side Next.js API routes only, never from the browser.

### Alternative considered: Vercel's own Static IPs feature

Vercel now sells a native Static IPs add-on. It is real and it does work, but it's gated to Pro/Enterprise and billed on top of hosting — call it **not worth it** for a single hobby clan project when the RoyaleAPI proxy solves the exact same problem for free. Worth revisiting only if the project ever needs an inbound static IP too (the proxy only solves outbound), or if RoyaleAPI's proxy becomes unreliable.

## Endpoints this project actually needs

| Endpoint | Used for |
|---|---|
| `GET /clans/{clanTag}` | Clan-level stats: level, points, capital league, war league, member count, `warWins`/`warTies`/`warLosses`/`warWinStreak`, join requirements, location, labels, and the `clanCapital` object (`capitalHallLevel` + `districts[].districtHallLevel`). |
| `GET /clans/{clanTag}/members` | Roster: tags, roles, donations, trophies — polled repeatedly for activity inference. |
| `GET /players/{playerTag}` | Full member detail: troop/hero/spell/pet levels, Town Hall level, Builder Base stats, `warPreference`, career totals (`warStars`, `attackWins`, `defenseWins`, `bestTrophies`), `achievements[]`. |
| `GET /clans/{clanTag}/currentwar` | Live current war state — `attacksPerMember`, both rosters, per-attack stars. Also the source for the war-prep scouting view during `preparation` state. |
| `GET /clans/{clanTag}/warlog` | Regular war history — **only if the clan's `isWarLogPublic` flag is true.** If it's private, historical war outcomes before this tool existed are simply unavailable; only wars fought after ingestion starts can be recorded from `currentwar` snapshots. |
| `GET /clans/{clanTag}/currentwar/leaguegroup` and `GET /clanwarleagues/wars/{warTag}` | CWL round data. |
| `GET /clans/{clanTag}/capitalraidseasons` | Clan Capital raid weekend results and per-member contribution. |

Tag encoding: player and clan tags start with `#`, which must be URL-encoded as `%23` in the request path (e.g. `#2Y8V8VGQ` → `%232Y8V8VGQ`). `lib/coc-client` should do this encoding internally so callers pass the human-readable tag.

## Rate limits and polling budget

Supercell does not publish an exact numeric rate limit for this API tier, but it is finite and shared across all keys tied to an account. The polling design in `04-activity-tracking-and-polling.md` is built around a conservative budget:

- One `members` call per poll cycle (cheap — one clan-wide call).
- Full `players/{tag}` detail calls are **not** fetched for all members every cycle — only on a slower cadence (see next doc) or on demand when a user opens a member's detail popup and the cached copy is stale.
- `currentwar` is polled more frequently only while a war is actually active, not 24/7.

This keeps steady-state usage low and leaves headroom for manual "refresh" actions triggered by users.

## Player tags as the stable identity key

The CoC API identifies people by **player tag**, not name (names can be changed in-game, tags cannot). Every table in the database keyed to a person should use player tag as the stable identifier/foreign key. Display names are cached but never used as a join key.

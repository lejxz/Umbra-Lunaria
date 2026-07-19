# 07 — Clan War Details

## War history (regular + league)

Backed by `wars` (see `03-data-model-and-database.md`), populated two ways:

1. **Backfill from `GET /clans/{clanTag}/warlog`** — only works if the clan's `isWarLogPublic` is `true`. If it's private, this endpoint returns nothing useful and history starts from zero. This is a Supercell/clan-setting limitation, not something the app can work around — surface it in the UI ("war log is private — history will build up from wars fought after [date]") rather than showing a silently empty list with no explanation.
2. **Ongoing capture from `currentwar`/CWL endpoints** while polling — this is what actually builds rich, per-attack history over time, independent of the public/private warlog setting, since `currentwar` is always visible to a clan member's API key regardless of that setting.

List view: opponent, result (win/loss/tie), war size, own stars vs opponent stars, date, type (regular/CWL). Click through to a detail page reusing the same attack-table component as the live view below.

## Current war — live detail view, refreshed on demand

Per the brief: **refreshed by an explicit refresh button**, not continuously polled by the browser. This is a deliberate rate-limit-friendly choice — see the note below.

Contents:
- War state (preparation / in war / war over), time remaining.
- Both clans' attack progress: attacks used / attacks remaining, total stars, destruction %.
- Full roster with per-member attack status: attacks used (0/1/2), stars earned, best attack so far, "has not attacked yet" flag prominently surfaced (this is the thing leaders actually check for mid-war).
- Attack log: attacker, defender, stars, destruction %, timestamp, in order.

**Why a manual refresh button and not live polling from the browser:** if 15 members all have the war page open and it live-polls the CoC API every few seconds, that's a rate-limit problem multiplied by concurrent viewers, on top of the background ingestion poll already running. A manual refresh button that calls a server route (which itself might serve a cached response if called again within a short TTL, e.g. 30–60 seconds, to protect against several people mashing refresh at once) is the right tradeoff for a feature that genuinely needs fresh data but doesn't need sub-minute live updates for a war that runs over a full day or two.

## Other war features (candidates)

- CWL: round-by-round view across the league group, not just the current round.
- Per-member historical war stats surfaced here too, pulling from the same `war_attacks` table the planning tool uses (`09-war-planning-and-auto-select.md`) — average stars per attack, 3-star rate, participation rate.

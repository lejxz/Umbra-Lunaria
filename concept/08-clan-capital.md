# 08 — Clan Capital Details

## Data source

`GET /clans/{clanTag}/capitalraidseasons` gives completed raid weekend results with per-member offense/defense contribution. This is the entire API surface for Clan Capital. There is **no endpoint anywhere in the public API for live district upgrade state, remaining upgrade cost, or the current capital gold bank** — not even indirectly through some other field. Everything below is scoped to what that one endpoint actually supports.

## Capital activity dashboard (mirrors the main dashboard, scoped to capital)

- Per-raid-weekend summary: total capital gold looted, attacks used vs. available (6 per member per weekend), medals earned.
- Per-member contribution leaderboard for the current/most recent raid weekend, and trended over past weekends (stored history, same retention rules as everything else in `03-data-model-and-database.md`).
- Participation rate: members who used 0 of 6 attacks are exactly the "needs a nudge" list leadership wants visible here.

## Feature dropped: district upgrade progress tracking

The original brief asked for "current upgrading buildings and progress of contribution to that building." This has been removed from scope entirely, not built as a manual substitute. Reasoning: the API genuinely cannot see this — no field, no endpoint, no indirect signal, unlike activity tracking (`04-activity-tracking-and-polling.md`) which at least has real fields to infer from. A manual leader-entered version was considered and rejected for this plan, since it would be Umbra Lunaria's own guessed/typed-in data sitting next to real API data with no way for a viewer to tell which is which unless the UI worked hard to constantly disclaim it — better to just not build a feature that isn't actually the thing it claims to be. If this is wanted later, it should be scoped and presented explicitly as a separate manual notes feature, not folded into "Clan Capital Details" as if it were sourced from the game.

# 08 — Clan Capital Details

## Data source

`GET /clans/{clanTag}/capitalraidseasons` — completed raid weekend results, per-member offense/defense contribution. This is the entire API surface for Clan Capital; no endpoint exposes live district upgrade state or remaining cost.

## Capital activity dashboard

- Per-raid-weekend summary: total capital gold looted, attacks used vs. available (6 per member per weekend), medals earned.
- Per-member contribution leaderboard, current and trended over past weekends (same retention rules as `03-data-model-and-database.md`).
- Participation rate: members at 0/6 attacks used, surfaced directly.

## Not in scope

Live district/building upgrade progress — no API field or endpoint supports it.

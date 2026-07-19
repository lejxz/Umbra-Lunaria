# 08 — Clan Capital Details

## Data sources

- `GET /clans/{clanTag}/capitalraidseasons` — completed raid weekend results, per-member offense/defense contribution.
- `GET /clans/{clanTag}` — includes a `clanCapital` object with `capitalHallLevel` and a `districts[]` array, each carrying a `districtHallLevel`. This is the current, completed level per district — not a live "in progress, X gold remaining" view, which the API genuinely does not expose. Polling and diffing this field is what makes district-upgrade tracking possible below.

## Capital activity dashboard

- Per-raid-weekend summary: total capital gold looted, attacks used vs. available (6 per member per weekend), medals earned.
- Per-member contribution leaderboard, current and trended over past weekends (same retention rules as `03-data-model-and-database.md`).
- Participation rate: members at 0/6 attacks used, surfaced directly.

## District upgrade tracking

Daily poll of `clanCapital.districts[].districtHallLevel` (`capital_district_snapshots`, `03-data-model-and-database.md`). A level increase between snapshots is logged as an upgrade event with a date — "Barbarian Camp reached level 4 on [date]". This is real, diffed API data, not manual entry.

What's still not possible: remaining gold cost or % progress toward the next level. Only completed level-ups are visible.

## Not in scope

Live, in-progress upgrade cost/progress — no API field or endpoint supports it.

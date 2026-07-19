# 08 — Clan Capital Details

## Data source

`GET /clans/{clanTag}/capitalraidseasons` gives completed raid weekend results with per-member offense/defense contribution. There is **no API endpoint for live in-progress district upgrade state or the current capital gold bank** — the API exposes raid *season results*, not a live capital-hall/district builder-queue view. This matters for the second requested feature below.

## Capital activity dashboard (mirrors the main dashboard, scoped to capital)

- Per-raid-weekend summary: total capital gold looted, attacks used vs. available (6 per member per weekend), medals earned.
- Per-member contribution leaderboard for the current/most recent raid weekend, and trended over past weekends (stored history, same retention rules as everything else in `03-data-model-and-database.md`).
- Participation rate: members who used 0 of 6 attacks are exactly the "needs a nudge" list leadership wants visible here.

## "Current upgrading buildings and contribution progress" — scoped honestly

This was requested in the brief, and it needs a direct caveat: **the public API cannot see a clan's live district upgrade queue or remaining gold cost.** That data simply isn't exposed. Two honest paths forward, not a fake version of the feature:

1. **Ship the parts that are real:** raid-weekend gold totals and per-member contribution (above) are fully supported and genuinely useful.
2. **Manual entry for the rest:** if leadership wants to track "we're upgrading District X, need Y more gold," that has to be a manually-entered value in Umbra Lunaria's own database (a simple leader-editable field: current district, target, gold needed), not something pulled from Supercell. It's a real, buildable feature — it's just not an *API-sourced* one, and the UI should not imply it's live game data.

Building option 2 as if it were automatic would be presenting something false as fact, which isn't the plan here — call it what it is: a lightweight manual tracker sitting next to real API-sourced raid data.

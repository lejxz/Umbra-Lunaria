# 08 — Final Clan Capital Experience

## Purpose

The Capital page distinguishes current Capital facts from observed upgrade history and completed raid-weekend history. It never implies that the API exposes live building cost or in-progress upgrade percentage when it does not.

## Current Capital overview

Display the latest clan-response facts:

1. Capital Hall level.
2. Capital points and Capital league.
3. District count.
4. District names and current district hall levels.
5. Last successful Capital capture time.

The dashboard shows a compact version; this page contains the full district view.

## District upgrade history

Daily `clanCapital.districts[]` captures are diffed by district. A completed level increase produces an event such as:

```text
Barbarian Camp reached level 4 on 2026-07-20.
```

The page provides a chronological timeline and district filter. If there is only one snapshot, it explains that upgrade history will begin after the next observed change.

## Raid-weekend history

After `capitalraidseasons` ingestion is active, show:

1. Completed raid weekends and dates.
2. Total Capital Gold looted.
3. Attacks used versus attacks available.
4. Offensive and defensive medals/rewards where returned.
5. District completion information where returned.
6. Per-member contribution leaderboard.
7. Historical contribution trend.
8. Members at zero attacks and participation rate.

Before the endpoint is ingested, the page shows the current Capital overview and district history with a clear raid-data pending state; it does not fabricate a raid leaderboard from lifetime player totals.

## Member contribution rules

1. Completed-season `capitalResourcesLooted` and attacks used drive the raid-weekend leaderboard.
2. The player response’s `clanCapitalContributions` is a current/lifetime-style player fact and may appear in profile context, but it is not a substitute for a season leaderboard.
3. Capital contribution in Member Activity Score uses only comparable completed-season data and is reweighted out when unavailable.

## Explicitly unavailable

The API does not provide live remaining upgrade cost, progress percentage, or a reliable live weekend countdown in every response. These values are omitted unless an authoritative API value or configured calendar rule supplies them.

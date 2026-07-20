# 13 — Live API Reference: Umbra Lunaria

**Captured:** 2026-07-20 (+08:00)
**Clan:** `#2JPCYP98L` — Umbra Lunaria
**Leader:** `#YPCC8QYU2` — Yeon
**Source:** RoyaleAPI Clash of Clans proxy

This is the readable implementation reference. The complete unmodified response bodies remain in [`docs/api-snapshots/2026-07-20-clan-and-leader-api-response.md`](../docs/api-snapshots/2026-07-20-clan-and-leader-api-response.md).

## Clan response

```json
{
  "tag": "#2JPCYP98L",
  "name": "Umbra Lunaria",
  "type": "open",
  "location": {
    "id": 32000006,
    "name": "International",
    "isCountry": false
  },
  "isFamilyFriendly": false,
  "clanLevel": 11,
  "clanPoints": 9150,
  "clanBuilderBasePoints": 5977,
  "clanCapitalPoints": 217,
  "capitalLeague": { "id": 85000001, "name": "Bronze League III" },
  "requiredTrophies": 0,
  "warFrequency": "always",
  "warWinStreak": 1,
  "warWins": 22,
  "warTies": null,
  "warLosses": null,
  "isWarLogPublic": false,
  "warLeague": { "id": 48000011, "name": "Crystal League II" },
  "members": 5,
  "clanCapital": {
    "capitalHallLevel": 8,
    "districts": [
      { "name": "Capital Peak", "districtHallLevel": 8 },
      { "name": "Barbarian Camp", "districtHallLevel": 4 },
      { "name": "Wizard Valley", "districtHallLevel": 4 },
      { "name": "Balloon Lagoon", "districtHallLevel": 4 },
      { "name": "Builder's Workshop", "districtHallLevel": 3 },
      { "name": "Dragon Cliffs", "districtHallLevel": 3 },
      { "name": "Golem Quarry", "districtHallLevel": 3 },
      { "name": "Skeleton Park", "districtHallLevel": 2 }
    ]
  }
}
```

## Current member list

| Tag | Name | Role | Town Hall | XP | Trophies | Builder trophies | Rank | Donations | Received |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `#YPCC8QYU2` | Yeon | leader | 17 | 214 | 0 | 3199 | 1 | 59 | 469 |
| `#L8YYY8CGY` | KnieieGurow | coLeader | 16 | 109 | 0 | 1795 | 2 | 0 | 0 |
| `#QU80CGJV8` | Juskepz | coLeader | 14 | 165 | 0 | 2390 | 3 | 32 | 0 |
| `#QVJGULLUV` | ⊶⊰ q.p ⊱⊷ | admin | 15 | 104 | 0 | 1493 | 4 | 0 | 0 |
| `#LURG82P98` | Yeon's Slave | coLeader | 18 | 211 | 0 | 3080 | 5 | 437 | 59 |

## Leader response: Yeon

```json
{
  "tag": "#YPCC8QYU2",
  "name": "Yeon",
  "townHallLevel": 17,
  "role": "leader",
  "warPreference": "in",
  "warStars": 1889,
  "attackWins": 0,
  "defenseWins": 0,
  "bestTrophies": 5558,
  "builderHallLevel": 10,
  "versusTrophies": null,
  "bestVersusTrophies": null,
  "troops": "80 returned items: home, siege, super troops, and Builder Base troops",
  "heroes": "8 returned items, including Barbarian King 87/110 and Archer Queen 97/110",
  "heroEquipment": "37 returned items",
  "spells": "17 returned items",
  "achievements": [
    {
      "name": "Gold Grab",
      "stars": 3,
      "value": 2000000000,
      "target": 100000000,
      "village": "home"
    },
    {
      "name": "War Hero",
      "stars": 3,
      "value": 1889,
      "target": 1000,
      "village": "home"
    }
  ]
}
```

## Important behavior

- `warWins` is currently `22`.
- `warTies` and `warLosses` were null/absent in the captured clan response; they must not be guessed as zero.
- `isWarLogPublic` was `false` in the captured clan response. The raw snapshot records the separate war-log response returned during the capture.
- The player response contains complete progression arrays for troops, heroes, hero equipment, spells, and achievements. This readable reference shows only two achievements; use the raw snapshot when implementing the full detail view.

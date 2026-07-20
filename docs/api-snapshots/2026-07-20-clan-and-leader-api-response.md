# Live API Snapshot — Umbra Lunaria Clan and Leader

**Captured:** 2026-07-20 16:30 (+08:00)
**Proxy:** `https://cocproxy.royaleapi.dev/v1`
**Clan endpoint:** `GET /clans/%232JPCYP98L`
**Leader endpoint:** `GET /players/%23YPCC8QYU2`

This is a live reference snapshot for implementation. Values can change after the next game poll. The API token is intentionally not stored here.

## Clan response

```json
{
  "tag": "#2JPCYP98L",
  "name": "Umbra Lunaria",
  "type": "open",
  "description": "🌕 Umbra Lunaria / Moon's Shadow … 05/25/2025 …",
  "location": { "id": 32000006, "name": "International", "isCountry": false },
  "isFamilyFriendly": false,
  "badgeUrls": {
    "small": "https://api-assets.clashofclans.com/badges/70/FVnpcW6MK5U1nHVLlYtks5TrfPpKUnwR1gGi6mHH4TI.png",
    "medium": "https://api-assets.clashofclans.com/badges/200/FVnpcW6MK5U1nHVLlYtks5TrfPpKUnwR1gGi6mHH4TI.png",
    "large": "https://api-assets.clashofclans.com/badges/512/FVnpcW6MK5U1nHVLlYtks5TrfPpKUnwR1gGi6mHH4TI.png"
  },
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
      ["Capital Peak", 8], ["Barbarian Camp", 4], ["Wizard Valley", 4],
      ["Balloon Lagoon", 4], ["Builder's Workshop", 3], ["Dragon Cliffs", 3],
      ["Golem Quarry", 3], ["Skeleton Park", 2]
    ]
  }
}
```

### Returned member list

| Tag | Name | Role | TH | XP | Trophies | Builder trophies | Rank | Given | Received | Builder league |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `#YPCC8QYU2` | Yeon | leader | 17 | 214 | 0 | 3199 | 1 | 59 | 469 | Iron League I |
| `#L8YYY8CGY` | KnieieGurow | coLeader | 16 | 109 | 0 | 1795 | 2 | 0 | 0 | Copper League III |
| `#QU80CGJV8` | Juskepz | coLeader | 14 | 165 | 0 | 2390 | 3 | 32 | 0 | Brass League II |
| `#QVJGULLUV` | ⊶⊰ q.p ⊱⊷ | admin | 15 | 104 | 0 | 1493 | 4 | 0 | 0 | Stone League I |
| `#LURG82P98` | Yeon's Slave | coLeader | 18 | 211 | 0 | 3080 | 5 | 437 | 59 | Iron League I |

## Leader response

The leader found from the clan response is **Yeon**, tag `#YPCC8QYU2`.

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
  "bestVersusTrophies": null
}
```

### Leader collection payloads

The player response also returned the following complete collections. Each item has the API-provided `name`, `level`, `maxLevel`, and village where applicable.

- `troops`: 80 items, including home troops, siege machines, super troops, and Builder Base troops.
- `heroes`: 8 items: Barbarian King `87/110`, Archer Queen `97/110`, Grand Warden `58/85`, Battle Machine `28/35`, Royal Champion `39/55`, Battle Copter `35/35`, Minion Prince `63/95`, Dragon Duke `11/25`.
- `heroEquipment`: 37 items, including Giant Gauntlet `20/27`, Rocket Spear `27/27`, Spiky Ball `27/27`, Frozen Arrow `20/27`, Electro Boots `26/27`, and the remaining equipment returned by the API.
- `spells`: 17 items: Lightning `11/13`, Healing `8/12`, Rage `6/7`, Jump `5/5`, Freeze `7/8`, Poison `11/12`, Earthquake `7/8`, Haste `5/7`, Clone `7/9`, Skeleton `8/8`, Bat `5/8`, Invisibility `4/4`, Recall `4/7`, Overgrowth `3/5`, Revive `1/5`, Ice Block `1/6`, Totem `1/4`.
- `achievements`: 54 items; the full API achievement array was returned, including `Gold Grab` value `2000000000`, `Friend in Need` value `53503`, `War Hero` value `1889`, `War League Legend` value `544`, and the remaining home, Builder Base, and Clan Capital achievements.

## Important implementation facts

1. `warWins` is present and currently equals `22`.
2. `warTies` and `warLosses` are not returned in this live clan payload, so the UI must not calculate or display a complete win rate from this response.
3. `isWarLogPublic` is `false`; historical war-log backfill is therefore unavailable through the public war-log endpoint.
4. The API provides `clanCapital.capitalHallLevel` and completed district levels; it does not provide live upgrade progress or remaining cost.
5. Player `heroes` include nested equipment in addition to the separate `heroEquipment` collection; the data layer must preserve both shapes.

## Reproducible raw fetch

Run this locally with `.env.local` loaded. It prints the complete live responses without placing the token in source control:

```powershell
$headers = @{ Authorization = "Bearer $env:COC_API_TOKEN" }
$clan = Invoke-RestMethod "$env:COC_API_BASE_URL/clans/%232JPCYP98L" -Headers $headers
$leaderTag = ($clan.memberList | Where-Object role -eq "leader").tag
$leader = Invoke-RestMethod "$env:COC_API_BASE_URL/players/$([uri]::EscapeDataString($leaderTag))" -Headers $headers
$clan | ConvertTo-Json -Depth 30
$leader | ConvertTo-Json -Depth 30
```

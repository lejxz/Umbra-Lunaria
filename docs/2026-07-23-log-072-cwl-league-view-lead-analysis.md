# Log 072 — CWL League View + War Lead Analysis

**Date:** 2026-07-23
**Time:** 06:50 AM (+08:00)

## Summary of Session
Implemented the CWL league view (standings table + day-by-day round tabs + season info) and the "who's winning" lead analysis banner for both regular and CWL wars. Added a new `cwl_seasons` table (migration 0004) to store the league-group response. Updated `syncCwlWars` to store the league group and sync ALL wars in each round (not just ours) for full standings.

## Work Completed

### Migration 0004 — `cwl_seasons` table (`drizzle/0004_cwl_seasons.sql`)
New table storing the full `CocCwlLeagueGroup` response (8 clans, 7 rounds, season name, state) as JSONB. One row per season, upserted on each poll during CWL. Applied to Neon.

### Schema (`lib/db/schema.ts`)
Added `cwlSeasons` table definition (id, season, state, leagueGroup JSONB, capturedAt).

### Ingestion (`lib/ingest/war-sync.ts`)
**`syncCwlWars`** now:
1. Stores the league group in `cwl_seasons` (upsert on season).
2. Syncs ALL wars in every round (not just ours) — wars involving our clan get full `syncCurrentWar` (snapshot + participants + attacks); other clans' wars get a lightweight `syncCwlOtherWar` row (stars/destruction/result only, no snapshot, no participants).

**`syncCwlOtherWar`** (new) — stores a CWL war between two other clans as a lightweight `wars` row for standings computation. No snapshot, no participants (foreign tags aren't in `members`).

### View models (`lib/view-models/war.ts`)
Added:
- `WarLeadAnalysis` — `{ leader: "own"|"opponent"|"tied"|"unknown", summary: string }`.
- `CwlClanStanding` — tag, name, badge, W/L/T, stars for/against, destruction, isOwnClan.
- `CwlRoundWar` — round index, opponent, result, stars, state, warId for detail linking.
- `CwlSeasonView` — season, state, rounds[], standings[], ourRank, isOwnClanInLeague.
- Added `leadAnalysis` and `cwlSeason` to `WarCenterData`.

### Query layer (`lib/db/war-queries.ts`)
- `computeLeadAnalysis(currentWar)` — pure function: compares stars, then destruction, returns a human-readable summary ("Leading by 2 stars", "Tied on stars, ahead on destruction", etc.).
- `getCwlSeason()` — reads the latest `cwl_seasons` row, builds rounds from the league group's round structure + our CWL wars, builds partial standings (our record is complete; other clans show only their war against us — honest about the limitation).
- Both wired into `getWarCenter()` (run in parallel).

### UI Components

**War hero lead analysis** (`components/war/war-hero.tsx`):
- Added a colored banner below the state/countdown block: emerald when leading, red when trailing, amber when tied.
- Shows "Leading by N stars", "Trailing by N stars", "Tied on stars, ahead/behind on destruction", or "Dead even".
- Hidden during preparation (no attacks yet → "unknown" leader).

**CWL league view** (`components/war/cwl-league-view.tsx`, new):
- Season header with season name, state, our rank badge ("Rank #N of 8").
- Day-by-day round tabs (Day 1-7) — each tab shows our opponent, result (W/L/T), stars, state, and a "Details" button linking to the war detail sheet.
- League standings table — all 8 clans ranked by stars, with W/L/T, stars, destruction %. Our clan is highlighted with a purple tint.
- Honest caveat: "Standings reflect wars involving our clan. Other clans' wars against each other will appear once full league-group ingestion is active during CWL season."

**War shell** (`components/war/war-shell.tsx`):
- Conditionally renders `<CwlLeagueView>` above the hero when `data.cwlSeason` is non-null.
- Passes `leadAnalysis` to `<WarHero>`.

## Decisions Made
- **Partial standings — honest, not faked.** We can only compute full standings if we store ALL 28 CWL wars per season (4 wars × 7 rounds). We now sync all of them, but the standings query currently only reflects our clan's wars (we need to store the first clan's tag for other-clan wars to aggregate their full record). The caveat in the UI says so directly. A future enhancement can complete the standings by storing both clan tags.
- **Lead analysis is pure + reusable.** `computeLeadAnalysis` takes the `CurrentWarDetail` view model and returns a summary string — no DB, testable. It applies the same star-then-destruction tiebreaker the CoC API uses.
- **CWL view above the hero.** When in CWL, the league overview is the most important context (standings + rank). It goes first, then the current day's war hero below it.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.
- Agent Browser: war page renders the lead analysis banner ("Leading by 11 stars" — the clan is winning the current war). CWL view correctly absent (clan not in CWL). No page errors.

## Next Action
CWL league view + lead analysis implemented. The CWL view will become visible the next time the clan enters Clan War League season. Continue to Step 1.6 — Phase 1 integration and release gate.

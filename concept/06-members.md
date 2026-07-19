# 06 — Clan Members List

## Main list view

Table/grid of the roster, filtering and sorting mirroring the in-game clan member screen:

- **Sort by:** role, donations (given/received), trophies, Town Hall level, name, join date, activity, wars missed.
- **Filter by:** role, Town Hall level range, activity threshold, rushed % range, wars missed (e.g. "2+ missed in last 5 wars"), war preference (in/out) — this is the direct way to spot inactive members from the list itself.
- War preference (`in`/`out`, from the player object) shown as a small badge per row — members set to "out" shouldn't need a click to identify.
- Row click opens the member detail popup.

## Member detail popup

### Activity

Daily / weekly / monthly activity, from `04-activity-tracking-and-polling.md`, scoped to this member.

### Login activity graph

Calendar/graph of estimated login dates, built from daily donation deltas (`04-activity-tracking-and-polling.md`). Dates, not a streak count. Labeled as estimated.

### War participation

From `war_participants` (`03-data-model-and-database.md`): wars missed (0 attacks used) out of wars since tracked, attack-slot usage rate (attacks used ÷ attacks allowed, across all wars), and a recent-wars strip (last 10 wars, attacked/missed per war) for a fast visual read. This is exact data pulled from each war's roster, not inferred.

### Career stats

Lifetime totals from the player object and `achievements[]`, refreshed daily (`career_stats`, `03-data-model-and-database.md`): war stars, attack wins, defense wins, best trophies, plus a couple of achievement totals worth showing (lifetime capital gold looted, lifetime troops donated). These are Supercell-tracked since the account existed — not limited by when this tool started polling, unlike everything else on this page. Labeled clearly as "career" / "lifetime" so it isn't confused with the tracked-since-here stats above.

### Rushed / non-rushed analysis

For a member at Town Hall level *T*, compare each troop/hero/spell/pet's current level against the max level achievable at Town Hall *T* (not the global max, which may require a higher TH).

```
rushed_% = (Σ weight_i × max(0, cap_at_TH(i) − current_level_i))
           ───────────────────────────────────────────────────── × 100
           Σ weight_i × cap_at_TH(i)
```

- `cap_at_TH(i)`: statically maintained reference table, keyed by unit `name` (matching the API's field) and Town Hall level — the API doesn't expose per-TH max level, so this has to be sourced once from public game-data references and checked in as static JSON:

```json
// lib/reference-data/troop-caps.json — shape, not full data
{
  "Barbarian": { "12": 9, "13": 10, "14": 10, "15": 11, "16": 11, "17": 11 },
  "Archer":    { "12": 9, "13": 10, "14": 10, "15": 11, "16": 11, "17": 11 }
}
```
  Same pattern for heroes, spells, pets, and equipment — separate JSON files under `lib/reference-data/`, one per unit category, since they're updated independently and it keeps diffs small when a balance patch changes one file.
- `weight_i`: flat/equal weighting is the Phase 1 default; per-category weighting is a later refinement if the clan wants it.
- Show both the overall percentage and a per-category breakdown (elixir troops, dark elixir troops, heroes, spells, pets, siege machines).

### Troop / hero / spell / pet levels — in-game card layout

Grid of cards matching the in-game player profile: icon, current level, maxed-for-TH indicator, grouped by category (Home Village: Elixir Troops, Dark Elixir Troops, Siege Machines, Heroes, Hero Equipment, Spells, Pets; Builder Base: its own set).

Icons are not provided by the API — source separately (extracted assets or a maintained community icon set), keyed to a stable internal ID mapped against the API's unit `name` field.

### Builder Base — minimal

Builder Hall level, versus trophies, versus league. No full second dashboard.

# 06 — Clan Members List

## Main list view

Table/grid of the roster, with filtering and sorting mirroring the in-game clan member screen:

- **Sort by:** role, donations (given/received), trophies, Town Hall level, name, join date, activity (this tool's estimate).
- **Filter by:** role, Town Hall level range, activity threshold (e.g., "inactive 3+ days"), rushed % range.
- Row click opens the member detail popup.

## Member detail popup

### Daily / weekly / monthly activity

Reuses the same activity-flag data and windowing as the main dashboard graph (`04-activity-tracking-and-polling.md`), scoped to this one member.

### Login streak

The estimated streak described in `04-activity-tracking-and-polling.md`, labeled clearly as an estimate, plus best/longest streak on record.

### Rushed / non-rushed analysis

**Definition used here (standard community approach, not a Supercell-provided stat):** for a member at Town Hall level *T*, compare each troop/hero/spell/pet's *current level* against the *maximum level achievable at Town Hall T* (not the global max level, which may require a higher Town Hall than the member currently has). A unit under that TH-specific cap counts as "rushed" for that unit.

```
rushed_% = (Σ weight_i × max(0, cap_at_TH(i) − current_level_i))
           ───────────────────────────────────────────────────── × 100
           Σ weight_i × cap_at_TH(i)
```

- `cap_at_TH(i)` comes from a **statically maintained reference table**, not the live API (the API doesn't expose "max level per TH" directly). This table needs manual updates after Supercell balance changes — see `12-roadmap-and-modularity.md`.
- `weight_i` lets heroes and war-relevant troops count more than, say, a rarely-used siege machine, if the clan wants that nuance. A flat weight (all units equal) is a perfectly reasonable Phase 1 default — don't over-engineer the weighting before anyone's asked for it.
- Present both the single overall percentage **and** the detailed breakdown per category (elixir troops, dark elixir troops, heroes, spells, pets, siege machines) — a single number hides *what* is rushed, which is the actually useful part for a leader deciding who needs help.

**Honesty note:** this number is only as good as the reference table behind it. If the table falls out of date after a balance patch, every rushed % in the app is quietly wrong until someone updates it. This is a real maintenance obligation, not a one-time build task.

### Troop / hero / spell / pet levels — displayed as in-game cards

Grid of cards mirroring the in-game player profile layout: icon, current level, level-up arrow/highlight if not maxed for TH, grouped into the same categories the game uses (Home Village: Elixir Troops, Dark Elixir Troops, Siege Machines, Heroes, Hero Equipment, Spells, Pets; Builder Base: its own troop/hero set).

Icons: see the earlier discussion in this conversation — the CoC API does not provide troop/spell/hero icon images. Source icons separately (extracted game assets or a maintained community icon set) and keep them keyed by a stable internal ID that maps to the API's unit `name` field, since that mapping is exactly the kind of thing that breaks silently when Supercell adds a new unit — see `12-roadmap-and-modularity.md`.

### Builder Base — minimal, as specified

Per the brief, this is intentionally light: Builder Hall level, versus trophies, versus league. Not a full mirrored second dashboard — the brief is explicit that Home Village is the focus.

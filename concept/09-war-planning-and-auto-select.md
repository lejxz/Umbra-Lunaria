# 09 — Next Clan War Planning

## Drag-and-drop roster builder

- Two-panel layout: available roster (left) → war lineup slots (right), ordered by war-map position. Members with `warPreference = out` are shown but visually deprioritized (bottom of the list, muted), not hidden — leadership can still add them if needed.
- `@dnd-kit` for interaction, with a tap-to-add fallback for touch (`10-mobile-support.md`).
- Member detail popup (same component as `06-members.md`) reachable from within the planner.
- War size selection: standard game sizes; warn before truncating a partially filled roster on a size change.
- Save as draft (`war_rosters` table, `03-data-model-and-database.md`), finalize when ready.

## Auto-select scoring

Ranks members using only data observed since the tool started polling — no retroactive history. Members with `warPreference = out` (`members.war_preference`, `03-data-model-and-database.md`) are excluded from the suggested roster automatically, not just deprioritized — the auto-select is meant to be a fast fill from people who've opted in.

| Factor | Source | Normalized to |
|---|---|---|
| Recent activity | `member_snapshots.activity_flag`, trailing 14 days | % of trailing-14-day windows active |
| War attack participation rate | `war_participants` since tracked | attacks used ÷ attacks allowed |
| Average stars per attack | `war_attacks` since tracked | stars ÷ 3, capped at 1.0 |
| 3-star rate | `war_attacks` since tracked | 3-star attacks ÷ total attacks |
| Rushed % | `06-members.md` methodology | `1 − rushed_%/100` (less rushed scores higher) |

Town Hall level is used for opponent matching in the roster builder, not folded into the composite score — mixing "how strong is this account" with "what TH bracket do they belong in" the same way would blur two different questions.

```
score = 0.30 × activity + 0.25 × participation_rate
      + 0.20 × avg_stars_normalized + 0.15 × three_star_rate
      + 0.10 × (1 − rushed_% / 100)
```

Weights are a starting default, not fixed — they're exposed as runtime settings (`11-config-specification.md`) since which factor matters most is a judgment call for the clan, not something to hardcode permanently.

Composite score is the default sort in the available-roster panel, paired with the per-factor breakdown per member so leadership can see why someone ranked where they did. It's a sort/pre-fill suggestion, not an autonomous pick — final roster is still built manually.

## Confidence flagging

Members with fewer than `minWarsForConfidentRanking` (default 3, `11-config-specification.md`) observed wars are marked "limited data" wherever their score appears.

## Phasing

Depends entirely on accumulated data — realistically a Phase 2+ feature (`12-roadmap-and-modularity.md`).

# 09 — Next Clan War Planning

## Drag-and-drop roster builder

- Two-panel layout: available roster (left) → war lineup slots (right), ordered by war-map position.
- `@dnd-kit` for interaction, with a tap-to-add fallback for touch (`10-mobile-support.md`).
- Member detail popup (same component as `06-members.md`) reachable from within the planner.
- War size selection: standard game sizes; warn before truncating a partially filled roster on a size change.
- Save as draft (`war_rosters` table, `03-data-model-and-database.md`), finalize when ready.

## Auto-select scoring

Ranks members using only data observed since the tool started polling — no retroactive history.

| Factor | Source |
|---|---|
| Recent activity | `member_snapshots.activity_flag`, trailing 14 days |
| War attack participation rate | `war_participants` since tracked |
| Average stars per attack | `war_attacks` since tracked |
| 3-star rate | `war_attacks` since tracked |
| Rushed % | `06-members.md` methodology |
| Town Hall level | live/cached |

Composite score as a default sort, paired with the per-factor breakdown per member so leadership can see why someone ranked where they did. It's a sort/pre-fill suggestion, not an autonomous pick — final roster is still built manually.

## Confidence flagging

Members with fewer than `minWarsForConfidentRanking` (default 3, `11-config-specification.md`) observed wars are marked "limited data" wherever their score appears.

## Phasing

Depends entirely on accumulated data — realistically a Phase 2+ feature (`12-roadmap-and-modularity.md`).

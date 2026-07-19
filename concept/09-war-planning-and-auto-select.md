# 09 — Next Clan War Planning

## Drag-and-drop roster builder

- Two-panel layout: available roster (left) → war lineup slots (right), ordered by war-map position.
- `@dnd-kit` (see `01-tech-stack.md`) for the interaction, with a tap-to-add fallback on mobile/touch where free-drag is fiddly on small screens — see `10-mobile-support.md`. Drag should not be the *only* way to build a roster on mobile.
- Member detail popup (same component as `06-members.md`) reachable from within the planner, so leadership can check troop levels / recent war stats without leaving the planning flow.
- War size selection: 5v5 up to 50v50 in the game's normal steps; changing size after slots are partially filled should warn before it truncates the roster, not silently drop people.
- Save as a draft (`war_rosters` table, `03-data-model-and-database.md`) so a plan can be revisited and edited before the war officially starts, and finalized when ready.

## Auto-select: ranking members for a suggested roster

This is the most computationally interesting piece in the whole app, and also the one with the most important caveat.

### What it can score, honestly

The brief asks for ranking based on: activity, previous war scores, war activity, and 3-star frequency during their time in the clan. All four are things Umbra Lunaria can compute — **but only from data it has personally observed since it started polling** (see the cold-start note in `00-overview.md` and `04-activity-tracking-and-polling.md`). It cannot see a member's war history from before this tool existed, even if that member has been in the clan for two years, unless the clan's warlog was public *and* stayed public the whole time (and even public warlogs don't include per-member attack detail — only `currentwar` snapshots capture that). This should be visible in the UI, not hidden: a member who joined last week and a member who's fought 40 wars with this clan look identical to a brand-new deployment of this tool, and the ranking should say so rather than silently treating them the same as if it had full confidence.

### Proposed scoring factors

| Factor | Source | Notes |
|---|---|---|
| Recent activity | `member_snapshots.activity_flag`, trailing 14 days | Someone who hasn't shown any activity signal recently is a real risk for a "did not attack" war penalty. |
| War attack participation rate | `war_attacks` since tracked | Attacks used ÷ attacks available, across all observed wars. |
| Average stars per attack | `war_attacks` since tracked | |
| 3-star rate | `war_attacks` since tracked | Stars = 3 ÷ total attacks. |
| Rushed % | `06-members.md` methodology | A heavily rushed account at a given TH is a real signal for lower expected performance against equal or higher TH opponents, independent of recent activity. |
| Town Hall level | live/cached | Used for matching against likely opponent TH spread, not as a standalone score. |
| Sample size / confidence | count of observed wars | Directly surfaced, not hidden inside the score — see below. |

**A single weighted composite score is a reasonable default output**, but it should never be presented as the *only* thing shown — pair it with the individual factor breakdown per member (a small table or expandable row), so leadership can see *why* someone ranked where they did and override the suggestion with actual judgment. The auto-select is a **suggestion to sort/pre-fill the roster panel**, not an autonomous decision — leadership still drags, swaps, and finalizes manually.

### Confidence / sample-size flagging

Members with fewer than some threshold of observed wars (configurable, reasonable default: 3) should be visibly marked "limited data" wherever their score appears, rather than ranked with the same apparent confidence as a member with 40 wars of history. Getting this wrong — presenting a low-sample-size score as equally reliable — is the single easiest way for this feature to actively mislead the people using it to make real decisions about who fights.

## Phasing note

Because this feature is entirely dependent on data the tool has accumulated itself, it is realistically a **Phase 2+** feature, not something to build and expect to be useful on week one. See `12-roadmap-and-modularity.md`.

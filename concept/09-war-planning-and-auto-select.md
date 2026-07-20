# 09 — Final War Planning & Auto-Select Concept

## Purpose

War Planning is an administrator-controlled workspace for assembling the next roster. It makes the underlying data visible and provides a recommendation, but leadership always decides the final lineup.

## Manual roster builder

### Layout

1. **Available roster** — all retained members with Town Hall, war preference, recent activity, war summary, and limited-data state.
2. **Selected lineup** — ordered map-position slots for the chosen war size.
3. **Context panel** — selected member detail, available filters, and current preparation-day opponent data when a war is available.

### Interactions

1. Drag members between panels on desktop.
2. Offer tap-to-add and tap-to-remove controls on touch devices.
3. Allow map-position reordering.
4. Support standard sizes: 10, 15, 20, 25, 30, 40, and 50.
5. Warn before truncating a selected lineup when war size decreases.
6. Open the same reusable member detail sheet without losing the draft state.
7. Save a named draft and finalize it through an administrator-protected action.

Members marked `warPreference = out` remain visible for manual leader choice but are visually deprioritized.

## Auto-select recommendation

Auto-select proposes an eligible roster; it never finalizes one.

### Eligibility

1. Retained current members are eligible by default.
2. Members marked `warPreference = out` are excluded from the automatic suggestion but remain manually selectable.
3. Members with incomplete history remain eligible but carry a limited-data label.

### Composite score

The default ranking uses only data observed since tracking began:

| Factor | Default weight | Source |
|---|---:|---|
| Recent activity | 30% | Trailing 14-day activity evidence. |
| War attack participation | 25% | Attacks used ÷ attacks allowed. |
| Average stars per attack | 20% | Tracked war attacks. |
| Three-star rate | 15% | Tracked war attacks. |
| Account readiness | 10% | `1 − rushed_percent / 100`. |

```text
score = 0.30 × activity
      + 0.25 × participation
      + 0.20 × average_stars
      + 0.15 × three_star_rate
      + 0.10 × account_readiness
```

1. Component values normalize to `0..1` before weighting.
2. If a required component is unavailable, the suggestion shows incomplete data rather than silently assigning a false zero.
3. Town Hall level is used for roster balance and matchup discussion, not folded into the quality score.
4. Every suggested member exposes the factor breakdown.

## Confidence and explanation

1. Fewer than `minWarsForConfidentRanking` observed wars produces a `Limited data` label.
2. The UI states the tracking window used for each recommendation.
3. A leader can override any recommendation without warning or penalty.
4. A finalized roster preserves the score snapshot and configuration version used at finalization for later review.

## Relationship to Member Activity Score

The dashboard’s Member Activity Score measures general observed clan support. Auto-select is a distinct war-readiness recommendation and uses the war-specific formula above. The two scores must never be presented as interchangeable.

## Write protection

Viewing planned rosters may be public if leadership chooses, but creating, editing, finalizing, or deleting a draft requires an administrator session.

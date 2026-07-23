# 05 — Final Dashboard Specification

## Purpose

The dashboard is the clan’s command center: a readable summary of current state and recent signals, not a duplicate of the Members, War, or Capital pages. It follows the visual direction in `design_proposal.html` and uses the live API reference only for real fields, never invented values.

## Information hierarchy

### 1. Clan identity card

The first, most prominent card contains:

1. Clan badge, name, and tag.
2. Description, type, location, and family-friendly status.
3. Clan level and member count.
4. Label icons and labels.
5. War frequency, war league, Capital league, and required trophies.
6. A clear capture-time indicator and link to the Members page.

### 2. All-time war record card

Show API-provided wins, ties, losses, and current win streak. Compute win rate only when all required totals are available:

```text
wins / (wins + ties + losses)
```

If an API value is absent, show `Unavailable` and suppress a misleading win-rate calculation. Link the card to the War Center.

### 3. Clan Capital card

Show Capital Hall level, Capital points, Capital league, district count, and the latest district snapshot. Include a raid-weekend status:

1. Countdown to the next expected raid weekend when inactive.
2. Time remaining when a weekend is active and the endpoint provides the needed state.
3. A clear pending-data state before raid-season ingestion is available.
4. Link to the Capital page.

### 4. Donation analytics — primary dashboard panel

This is the largest analytical panel. It contains:

1. A 24-hour / 7-day / 30-day control.
2. Total donations given and received for the selected window.
3. Donation ratio and selected-window comparison.
4. Hourly buckets for 24 hours; daily buckets for 7 and 30 days.
5. Accessible hover/focus detail for each bucket.
6. Reset-aware totals from `04-activity-tracking-and-polling.md`.
7. A tracking-start or partial-history state when data is insufficient.

### 5. Member Activity Score leaderboard

The dashboard’s companion ranking panel is named **Member Activity Score**. It is a transparent, rolling 30-day measure of observed clan support—not a claim about player skill or worth.

Initial score components total 100 points:

| Component | Weight | Source |
|---|---:|---|
| Donations given | 35 | Reset-aware member donation totals. |
| Observed activity | 25 | Active-day/interval rate from snapshots. |
| War commitment | 25 | Attacks used ÷ attacks allowed in tracked wars. |
| Capital contribution | 15 | Completed raid-season contribution. |

Rules:

1. Donations received are shown as a separate leaderboard metric; they do not earn contribution points.
2. A temporarily unavailable component is excluded and the available component weights are re-normalized rather than scored as zero.
3. Each row shows its component breakdown, selected period, and limited-data state.
4. Members marked `warPreference = out` are not penalized by the score; war preference is an explicit planning decision.
5. Rankings are clickable and open the reusable member detail sheet.

### 6. Activity timeline

Show active-member count and percent of the retained roster for 24-hour, 7-day, and 30-day windows. Label it as observed activity and use an explicit empty/partial state rather than an empty graph.

### 7. Needs attention

Use separate, readable lists for:

1. Members inactive beyond the administrator-configured threshold.
2. Members in an active war with attacks remaining.
3. Members whose war preference is `out`.

Every member item opens the same detail sheet. An opt-out is informational, not an error state.

### 8. Hall of Fame

Five all-time award categories, each a top-5 leaderboard (not just a single record holder), populated by the daily batch and persisted in `hall_of_fame_records` (`03-data-model-and-database.md`). Definitions taken directly from the implementation (`lib/db/records-updater.ts`), not re-derived:

| Award | Measures |
|---|---|
| **Philanthropist** | Highest all-time cumulative donations given (reset-aware, from the `cumulative_donations_given` checkpoint). |
| **Vanguard** | Most 3-star war attacks all-time, with best 3-star % as the tiebreak. |
| **Dedicated** | Longest consecutive daily login streak on record. |
| **Capitalist** | Highest capital gold looted in a single raid weekend. |
| **Unsleeping** | Highest raw activity score — a sum of raw component values (not the normalized 100-point Member Activity Score from section 5; a separate, cumulative measure). |

Each entry is clickable and opens the member detail sheet, same as every other member reference on this page. Entries preserve `holder_name` even after the underlying member row is purged (`03-data-model-and-database.md` retention contract), so a historical record doesn't silently disappear the way a live member reference would.

### 9. Clan activity log

Render a most-recent-first feed of joins and departures with name, player tag, event type, and timestamp — sourced from `membership_events` (`03-data-model-and-database.md`), not the mutable `members` row directly. That distinction is what makes the click behavior below actually work: the event log is immutable and never pruned, so a "left 20 days ago" entry stays visible and correct even after the member's own row has been purged. A click opens:

1. The normal member detail sheet for a retained player.
2. A purpose-built "left on [date]; data removed under the retention policy" state for a purged player.

The default feed is the latest 20 events or 30 days, whichever is smaller.

### 10. Navigation summaries

The dashboard ends with two clear navigation strips:

1. **Current war** — state, preparation/battle countdown, stars, attacks, and link to `/war`.
2. **Capital raid weekend** — current/countdown state and link to `/capital`.

## Interaction and state rules

1. Tabs, tooltips, rows, and cards are keyboard accessible.
2. Hover interactions always have a touch and keyboard equivalent.
3. Missing values use an em dash or an explicit unavailable label, never a fake zero.
4. The dashboard does not contain the full member table, full war log, or full Capital history.
5. Mobile layout preserves the donation panel as the primary analytical card and stacks secondary panels beneath it.

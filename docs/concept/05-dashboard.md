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

### 6. Clan Pulse — activity × roster (combined panel)

One panel answers both "how many members are active?" and "is the clan growing or shrinking?" (2026-09-14: replaces the separate Activity timeline + Roster growth panels). For 24-hour, 7-day, and 30-day windows it shows, on one chart:

1. **Bars** — active members per bucket (observed activity; hourly buckets for 24h, daily for 7d/30d).
2. **Roster line** — distinct members per clan-timezone day, carried forward onto the activity buckets (a step line).
3. **Engagement rate line** — active ÷ roster per bucket, on a 0–100% right axis: the normalization that separates a *big* clan from an *engaged* one (growth from 30 → 45 while "active" goes 12 → 15 is disengagement, not health).
4. **Verdict pill** — the growth × engagement 2×2, computed by the pure engine `lib/scoring/clan-pulse.ts`: Thriving (both up) · Growing, diluting (roster up, engagement down) · Tightening core (roster down, engagement up) · Fading (both down) · Steady / Steady roster / Steady engagement (within thresholds: roster |Δ| < max(1, 5% of window-start roster); engagement |trend| < 5pp) · Warming up (not enough history — never a false "Steady"). The pill's tooltip carries a plain-language one-liner.
5. **Stat chips** — `Active X/Y` · `Roster N (Δ)` · `Engagement R% avg (±Tpp)`, each delta colored.

Label it as observed activity and use an explicit empty/partial state rather than an empty graph. The Top-5 Member Activity Score leaderboard sits in the panel's right column (section 5) — one window state drives both the chart and the leaderboard. Data assembly: `getDashboard` composes the already-fetched activity timelines with the single roster-trend query (zero extra queries); `member_snapshots` day keys come from `to_char(..., 'YYYY-MM-DD')` so alignment never round-trips a naive pg timestamp through a Date.

### 7. Needs attention

Use separate, readable lists for:

1. Members inactive beyond the administrator-configured threshold.
2. Members in an active war with attacks remaining.
3. Members whose war preference is `out`.
4. Members below the donation ratio (Phase 2.2): received at least `receivedFloor` (default 200) troops over the configured window (default 30 days, reset-aware donation accounting) while giving back less than `minRatio` (default 0.5) of what they took. Request-light members under the floor are never flagged — flagging someone who received 20 troops is noise, not signal. The group is sorted worst-first (lowest given/received ratio at the top) and is absent entirely when the category is disabled. Settings live in `runtime_settings` under key `needsAttention.donationRatio` (JSONB: `{ enabled, minRatio, windowDays, receivedFloor }`), edited with SQL per the no-admin-UI design; code defaults apply when the key is absent.

Every member item links to the member's profile on `/members` (Phase 2.1 — see `06-members.md` "Deep-linkable profiles"). An opt-out is informational, not an error state.

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

1. The retained player's profile in the dashboard-local member detail sheet (2026-09-14: the same interaction as the donation/activity leaderboards — `GET /api/members/[tag]` serves any non-purged member, **departed members included**, which a `/members?tag=` redirect cannot do since that page's roster validation only knows current clan members).
2. A purpose-built "data removed under the retention policy" state for a purged player (no link — there is no profile to open).

The default feed is the latest 20 events or 30 days, whichever is smaller. The `/members?tag=` deep-link URL contract itself remains (the members page opens the sheet for a `?tag=` on load) for shareable links — see `lib/member-links.ts`.

### 9b. Clan history timeline (Phase 4 / F10)

Directly under the clan log: the same `membership_events` data as a daily density chart — one stacked bar per clan-timezone calendar day (join / rejoin / leave / TH upgrade / rename) with the capital-contribution density overlaid (distinct members whose contributions rose that day, from the daily batch's delta events). The log answers "what happened"; the timeline answers "how often, over time" — the 2026-07-20 mass departure and raid-weekend contribution spikes read at a glance.

Window select: 30d / 90d / all (precomputed server-side, tab switches cost zero fetches) plus a custom day range through the same shared range control and `GET /api/analytics` endpoint the donation panel uses. Days without events render as gaps (zero-filled x-axis); the "all" window starts at the first observed event day. A header badge shows the window's net roster change (joins + rejoins − leaves).

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

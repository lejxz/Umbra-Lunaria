# Final Feature List

This document is the implementation feature inventory. It separates values returned directly by the Clash of Clans API from historical data created by polling and metrics calculated by Umbra Lunaria.

## 1. API and data foundation

1. Connect to the Clash of Clans API through the RoyaleAPI proxy.
2. Store and refresh the clan response.
3. Store the complete current member roster.
4. Store each member's API-provided profile data.
5. Store each member's progression arrays.
6. Store player career data.
7. Store clan data.
8. Treat missing API values as unavailable. Never guess missing values as zero.

## 2. Polling and historical tracking

1. Poll the clan roster approximately every 15 minutes.
2. Run a daily full refresh.
3. Detect new members, departures, and rejoining members.
4. Store member snapshots over time.
5. Infer estimated activity from snapshot changes.
6. Track estimated login days.
7. Track donation changes with weekly-reset handling.
8. Poll and store current wars during preparation and battle phases.
9. Store war participants and attacks.
10. Store Capital district snapshots.
11. Retain departed-member records temporarily.
12. Purge member data after the retention period.
13. Preserve anonymized war results after a member is purged.

## 3. Main dashboard

### 3.1 Clan identity card

1. Clan badge.
2. Clan name and tag.
3. Clan description.
4. Clan type and family-friendly status.
5. Clan location.
6. Clan level.
7. Member count.
8. Clan labels with API-provided icons.
9. War frequency.
10. War league.
11. Capital league.
12. Required trophies.
13. Link to the Members page.

### 3.2 War record card

1. War wins.
2. War losses.
3. War ties.
4. Current win streak.
5. Computed win rate.
6. Unavailable state when a value is not returned by the API.
7. Link to the War page.

The win rate is calculated as:

```text
wins / (wins + ties + losses)
```

### 3.3 Clan Capital card

1. Capital level and points.
2. Capital league.
3. District count and latest known district progress.
4. Capital raid-weekend status.
5. Countdown until the next raid weekend.
6. Remaining time during an active raid weekend.
7. Link to the Capital page.

Historical Capital details should come from stored snapshots when they are not directly present in the clan response.

### 3.4 Donation analytics

1. Total donations given.
2. Total donations received.
3. Donation ratio.
4. 24-hour view with hour-by-hour data.
5. 7-day view with day-by-day data.
6. 30-day view with day-by-day data.
7. Hoverable graph details.
8. Selected-window summary.
9. Empty state when insufficient snapshots exist.
10. Weekly-reset-safe calculations.

### 3.5 Member Activity Score leaderboard

1. Calculating donataions:
   1. Daily top donors.
   2. Weekly top donors.
   3. Monthly top donors.
   4. Top receivers.
2. Calculating War activity.
3. Donation totals per member.
4. Clan Capital contribution.
5. All the data that can be used to rank them in the clan for hiighest contributions.
6. main card shows the Application-calculated contribution score ranking.

The contribution score must be defined separately; it is not an API value.

### 3.6 Activity panel

1. Hourly activity graph for the last 24 hours.
2. Daily activity graph for the last 7 days.
3. Daily activity graph for the last 30 days.
4. Active-member count and percentage.
5. Estimated-data label.
6. Cold-start state when historical snapshots are insufficient.

### 3.7 Needs-attention panels

1. Members inactive for the configured threshold.
2. Estimated last activity time.
3. Members in an active war who have not attacked.
4. Attacks remaining and war time remaining.
5. Members whose war preference is `out`.
6. Click-through to each member's detail popup.

### 3.8 Clan activity log

1. Recent joins.
2. Recent departures.
3. Member name and player tag.
4. Event type and timestamp.
5. Most-recent-first sorting.
6. Clickable entries.
7. Member popup for active or recently departed members.
8. “Data removed” message for purged members.
9. Configurable event limit or time window.

### 3.9 Navigation summaries

1. Current war state, countdown, stars, and attack progress.
2. Link to the War page.
3. Capital raid-weekend state and countdown.
4. Link to the Capital page.

The dashboard is a summary and navigation hub. Detailed tables belong on their dedicated pages.

## 4. Members page

1. Display the current clan roster.
2. Sort by name, role, Town Hall, donations, trophies, activity, join date, wars missed, and rushed percentage.
3. Filter by role, Town Hall range, activity threshold, war preference, wars missed, and rushed percentage.
4. Display name, role, Town Hall, league, trophies, donations, activity, war preference, and clan rank.
5. Open the member detail popup by selecting a row.

## 5. Member detail popup

### 5.1 Profile summary

1. Name and player tag.
2. Role and membership status.
3. Town Hall and experience level.
4. Home Village league and league tier.
5. Trophies, clan rank, and join date.

### 5.2 Activity

1. Estimated last active time.
2. Daily, weekly, and monthly activity history.
3. Login-day calendar or graph.
4. Clear label explaining that activity is estimated from snapshots.

### 5.3 Donations

1. Donations given and received.
2. Daily, weekly, and monthly donation history.
3. Donation ratio.
4. Contribution ranking.

### 5.4 War participation

1. Wars participated in.
2. Wars missed.
3. Attack slots used.
4. Attack-slot usage rate.
5. Recent-war participation strip.
6. Stars earned.
7. Current-war attack status.

### 5.5 Career statistics

1. War stars.
2. Attack wins.
3. Defense wins.
4. Best trophies.
5. Builder Hall level and Builder Base trophies.
6. Selected achievement totals.
7. Expandable full achievements section.

### 5.6 Progression cards

Display icons, names, levels, and maxed-for-Town-Hall status for:

1. Home Village troops.
2. Dark Elixir troops.
3. Siege machines.
4. Heroes.
5. Hero equipment.
6. Spells.
7. Pets.
8. Builder Base troops.
9. Builder Base heroes.
10. Use icons from clash of clans: https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets

## 6. Rushed-account analysis

1. Compare each unit level against the maximum level allowed at the member's Town Hall.
2. Calculate the overall rushed percentage.
3. Show category breakdowns for troops, heroes, equipment, spells, and pets.
4. Show maxed-for-Town-Hall indicators.
5. Add rushed-percentage sorting and filtering to the Members page.
6. Maintain Town Hall cap reference data separately from the API response.
7. Label rushed percentage as application-derived analysis.

## 7. Clan War page

### 7.1 War history

1. Regular war history.
2. Clan War League history.
3. Opponent clan, war type, war size, and result.
4. Own stars, opponent stars, and destruction percentage.
5. Start and end dates.
6. Click-through war details.
7. Clear explanation when the public war log is unavailable.
8. Clan war preparation timer
9. Clan war duration timer.

### 7.2 Current war

1. War state and preparation/battle countdown.
2. Own and opponent progress.
3. Stars, attacks used, and destruction.
4. Full participant list.
5. Attacks used by each member.
6. Stars earned by each member.
7. Members who have not attacked.
8. Attack log.
9. Manual refresh button.
10. Refresh cooldown or cache.
11. Clan war league support view.
12. 
### 7.3 Preparation-day scouting

1. Own clan roster.
2. Opponent roster.
3. Map positions.
4. Town Hall levels.
5. League information.
6. Town Hall mismatch highlighting.
7. Side-by-side comparison.

## 8. Clan Capital page

1. Capital overview.
2. Capital level, points, and league.
3. District list and levels.
4. District upgrade history.
5. District timeline.
6. Snapshot timestamps.
7. Capital contribution summary.
8. Per-member contribution tracking.
9. Placeholder state until full raid data is ingested.

## 9. Capital raid-weekend features

These require additional API ingestion:

1. Raid-weekend history.
2. Total Capital gold looted.
3. Attacks used and attacks available.
4. Medals earned.
5. District completion.
6. Per-member contribution leaderboard.
7. Historical contribution trends.
8. Members with zero attacks.
9. Participation rate.

## 10. War planning page

1. Available-member roster.
2. Selected-war roster.
3. Drag-and-drop roster building.
4. Tap-to-add support for mobile.
5. War-size selection from 10v10 through 50v50.
6. War-preference-aware ordering.
7. Member detail popup inside the planner.
8. Save roster as a draft.
9. Edit saved drafts.
10. Finalize roster.
11. Persistent roster history.

## 11. Automatic roster selection

1. Activity score.
2. War participation rate.
3. Average stars.
4. Three-star rate.
5. Rushed percentage.
6. Configurable scoring weights.
7. Suggested lineup and backup members.
8. Limited-data confidence flag.
9. Per-member scoring breakdown.
10. Deprioritize members marked `warPreference = out`.

## 12. Settings and configuration

1. Inactivity threshold.
2. War-selection weights.
3. Minimum wars required for confident ranking.
4. Poll interval.
5. Retention period.
6. Feature toggles.
7. Clan configuration.
8. Database-backed runtime settings.
9. Protected administrative settings.

## 13. Responsive and mobile behavior

1. Responsive desktop and mobile layouts.
2. Mobile bottom navigation.
3. Mobile-friendly tables.
4. Full-screen member sheets on mobile.
5. Touch-friendly roster planning.
6. Mobile refresh controls.
7. Responsive charts.
8. Optional installable PWA support.
9. Real-device testing on iOS Safari and Android Chrome.

## 14. Data limitations

1. Activity and last-seen values are inferred from snapshots.
2. Historical donations begin only after polling starts.
3. Historical war details depend on public war-log availability.
4. War-log privacy must be shown clearly to users.
5. Current-war information exists only while the API provides it.
6. Rushed percentages require external Town Hall cap reference data.
7. Unit icons are not supplied by the API and require project assets or an icon mapping.
8. Contribution score is application-derived.
9. Some Capital raid-weekend features require additional ingestion.
10. Missing values must display as unavailable rather than guessed.

## 15. Architecture requirements

1. Keep API client, database, scoring, UI, and configuration layers separate.
2. Keep server-side reads behind reusable query functions.
3. Keep presentation components independent from Drizzle schema details.
4. Document API limitations and configuration decisions.
5. Keep feature toggles available for incomplete or optional features.
6. Keep the design extensible for future multi-clan support, while treating one clan as the current scope.

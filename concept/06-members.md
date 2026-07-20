# 06 — Final Members Experience

## Purpose

The Members page is the full clan roster and the primary entry point for member-level detail. The dashboard links into it; it does not duplicate the roster table.

## Roster list

### Default presentation

Each roster row or mobile card shows:

1. Name and stable player tag.
2. Role and clan rank.
3. Town Hall level.
4. Home Village league/trophies where available.
5. Donations given and received for the current reset period.
6. Estimated activity state.
7. War preference badge.
8. Recent missed-war or attack-status indicator when enough tracked data exists.
9. Rushed percentage only after reference data and a valid calculation exist.

Selecting a member opens the reusable member detail sheet. Desktop uses a centered modal; mobile uses a full-screen sheet.

### Sort and filter contract

Supported sorting:

1. Name.
2. Role.
3. Town Hall level.
4. Donations given and received.
5. Trophies.
6. Clan rank.
7. First observed join date.
8. Observed activity.
9. Wars missed.
10. Rushed percentage.

Supported filters:

1. Role.
2. Town Hall range.
3. Activity threshold.
4. War preference (`in` / `out`).
5. Wars missed over a selected tracked-war window.
6. Rushed-percentage range.

Sorts and filters that depend on history must explain when tracking has not accumulated enough data.

## Member detail sheet

Each section identifies its source: **API fact**, **tracked history**, or **derived analysis**.

### 1. Profile summary — API fact

1. Name, player tag, role, and current membership status.
2. Town Hall and experience level.
3. Home Village league, league tier, trophies, and best trophies.
4. Builder Hall and Builder Base trophies.
5. Clan rank and first observed join date.
6. Current war preference.
7. Clan badge and clan relationship where returned by the player API.

### 2. Activity — tracked history

1. Estimated last observed activity.
2. Daily, weekly, and monthly activity timeline.
3. Estimated login-day calendar from donation increases.
4. Tracking-start date and partial-data state.

The UI never presents a snapshot change as a guaranteed login or an online presence.

### 3. Donations and contribution — tracked history / derived

1. Given and received totals for 24 hours, 7 days, and 30 days.
2. Donation ratio.
3. Donation trend.
4. Member Activity Score rank and transparent component breakdown.
5. Capital and war contribution summaries when tracked.

### 4. War participation — tracked history

1. Wars tracked and wars missed.
2. Attack slots used and attack-slot usage rate.
3. Stars earned and average stars per attack.
4. Three-star rate.
5. Recent-war strip showing attacked or missed outcomes.
6. Current-war status when a war is active.

These facts come from the full war roster, not merely attack rows, so a zero-attack member is represented accurately.

### 5. Career statistics — API fact

1. War stars.
2. Attack wins and defense wins.
3. Best trophies and Builder Base records.
4. Current clan Capital contribution total where returned.
5. A concise achievement summary.
6. An expandable full-achievements view.

Career values are lifetime Supercell totals and must be labeled separately from data tracked since Umbra Lunaria began observing the player.

### 6. Progression cards — API fact

Render an in-game-inspired card grid for:

1. Home Village Elixir troops.
2. Dark Elixir troops.
3. Siege machines.
4. Heroes.
5. Hero equipment.
6. Spells.
7. Pets.
8. Builder Base troops.
9. Builder Base heroes.

Every card shows unit icon, name, current level, API-reported global maximum where useful, and a separate maxed-for-current-Town-Hall indicator once cap data exists. Pets are grouped for display even when the raw player payload provides them in the troop-style progression array.

Icons come from the approved Supercell Fankit source, copied into local project assets and referenced through a maintained API-unit-name mapping. The page must fall back to a text label when an asset mapping is missing.

### 7. Rushed-account analysis — derived

For a member at Town Hall `T`, compare each eligible unit level with its known maximum at `T`:

```text
rushed_percent =
  sum(weight_i × max(0, cap_at_TH(i) − current_level_i))
  ─────────────────────────────────────────────────────── × 100
  sum(weight_i × cap_at_TH(i))
```

The initial model uses equal weights. It displays an overall percentage and category breakdowns for troops, heroes, equipment, spells, pets, and siege machines.

This feature requires maintained Town Hall cap reference files. Until those files are complete for the player’s Town Hall, the UI shows `Not available yet` rather than a partial or misleading percentage.

## Departed member state

1. A retained departed member opens the normal detail sheet with a departure notice.
2. A purged member opens a minimal record stating the departure date and that detailed data was removed under the retention policy.
3. Historic clan-log and war aggregate information remains readable without recreating a deleted profile.

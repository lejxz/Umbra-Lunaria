# Log 024 — Clan Identity Rework + League Tier Fix

**Date:** 2026-07-21
**Time:** 02:20 PM (+08:00)

## Summary of Session

Reworked the Clan Identity card to match the in-game Clash of Clans clan view: badge + name + tag + meta chips + description at the top, then a grid of individual stat mini-cards (each in its own bordered container). Removed the footer ("Captured" + "View members" link). Fixed the league display to use `leagueTier` (the new ranking system) instead of `league` (the old system) in the activity score leaderboard and member detail sheet.

## Work Completed

### Clan Identity card rework
- Rewrote `components/dashboard/clan-identity-card.tsx`:
  - **Top section**: badge (72px, `object-contain`, no forced container) + name + tag + meta chips + description with `whitespace-pre-line`
  - **Meta chips**: replaced the inline `·`-separated text with clean pill `Chip` components — location, type, family-friendly (tone-colored: green for family-friendly, muted for not), chat language
  - **Stat mini-cards**: 8 individual bordered containers in a 4-column grid (2 columns on mobile):
    - Clan level, Members, War league, Capital league
    - War wins (green), War losses (red), Win streak (purple), Req. trophies
  - **Removed**: footer with "● Captured" timestamp + "View members →" link
  - Each stat card has its own `rounded-xl border border-umbra-line bg-umbra-ink/40` container — no longer a single shared details box

### League tier fix (new ranking system)
- The CoC API returns two league fields:
  - `league` — the old ranking system (e.g. "Legend League", "Unranked")
  - `leagueTier` — the new ranking system (e.g. "Dragon League 30", "Witch League 17")
- Updated `activity-score-leaderboard.tsx`: now shows `leagueTier` icon + name instead of `league`
- Updated `member-detail-sheet.tsx`: the league section now shows `leagueTier` icon + name, labeled "LEAGUE TIER" (the old `league` field is no longer displayed)
- Verified live: leaderboard shows "Dragon League 30", "Witch League 17", "Golem League 20" instead of "Legend League", "Unranked", "Unranked"

## Decisions Made

- **Individual stat mini-cards over a single details container**: The user specifically asked for each stat to have its own little card within the big card. This gives each fact visual weight and makes the card feel more substantial. The 4-column grid (2 on mobile) keeps it compact while giving each stat breathing room.
- **Removed footer from clan identity card**: The "Captured" timestamp and "View members" link were redundant — the timestamp is in the Data Freshness panel at the bottom, and Members is in the navigation sidebar. Removing them makes the identity card cleaner and more focused on identity.
- **Meta chips instead of inline text**: The "International · Invite only · Not family-friendly · English" line was hard to scan. Individual pill chips with color tones (green for family-friendly, muted for not) make each attribute visually distinct and easier to read at a glance.
- **leagueTier as the primary league display**: The user clarified that `leagueTier` is the current ranking system and `league` is the old one. All league display now uses `leagueTier` for both the icon and the name. The old `league` field is kept in the data model for audit purposes but not rendered in the UI.

## Next Action

Proceed to Step 1.3: Implement Members and member detail — the full roster table and complete member detail sheet.

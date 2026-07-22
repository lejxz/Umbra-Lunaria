# Log 033 — Redesign Bottom Cards + Clan Card Background

**Date:** 2026-07-21
**Time:** 05:17 PM (+08:00)

## Summary of Session

Redesigned the three bottom dashboard cards (Member Activity Score, Clan Log, Needs Attention) for visual consistency — all now use `flex flex-col` with `minHeight: 380px`, `flex-1` scrollable content areas, and matching spacing. Also redesigned the Clan Identity card to use `Clan-Card-Background.png` as a cover image with a dark gradient overlay for readability.

## Work Completed

### Three bottom cards — consistent design
All three cards now share the same structural pattern:

- **`flex flex-col` with `minHeight: 380px`**: Equal height in the 3-column grid
- **`flex-1` content area**: The list/leaderboard fills remaining vertical space and scrolls if needed
- **Consistent header**: eyebrow + title + badge (all same spacing)
- **Consistent empty states**: centered `EmptyState` using `flex-1 items-center justify-center`
- **Consistent item styling**: `rounded-lg bg-white/[.035] px-3 py-2` with `hover:bg-white/[.06]`
- **Removed player tags from Needs Attention**: was too cramped, just name + detail + TH level now

### Activity Score Leaderboard
- Changed to `flex flex-col` with `minHeight: 380px`
- Leaderboard uses `flex-1 overflow-y-auto` to fill height and scroll
- Tighter spacing: `py-2` instead of `py-2.5`, `gap-2.5` instead of `gap-3`
- Removed player tag line (kept in member detail sheet)
- Component bars: `w-3` instead of `w-4`, `h-1` instead of `h-1.5`

### Clan Log
- Changed to `flex flex-col` with `minHeight: 380px`
- Log feed uses `flex-1 overflow-y-auto` (removed fixed `max-h-80`)
- Same item styling as the other two cards

### Needs Attention
- Changed to `flex flex-col` with `minHeight: 380px`
- Content area uses `flex-1 overflow-y-auto`
- Removed player tag from each member (was too cramped)
- Shorter labels: "Attacks remaining" (was "Attacks remaining in active war"), "Inactive (7d+)" (was "Inactive (7d+ threshold)")
- Empty state uses centered flex

### Clan Identity Card — background image
- Uses `Clan-Card-Background.png` as a cover image (`object-cover`, `fill`)
- Dark gradient overlay: `from-umbra-ink/70 via-umbra-ink/80 to-umbra-ink/95` — ensures text readability over any background
- Removed the `glass` class (the background image replaces it)
- Badge gets `drop-shadow-lg` for depth over the background
- Name gets `drop-shadow-md` for readability
- Description container: `bg-umbra-ink/50 backdrop-blur-sm` — semi-transparent with blur
- Labels: `bg-umbra-ink/50 backdrop-blur-sm` — matching semi-transparent treatment
- Divider: `border-umbra-line/50` — softer over the background

## Decisions Made

- **`minHeight: 380px` for all 3 bottom cards**: Ensures they're equal height in the 3-column grid regardless of content length. The `flex-1` content area fills the space and scrolls if needed.
- **Removed player tags from Needs Attention**: The 3-column layout is narrow (~380px each). Player tags made entries wrap awkwardly. The tags are still in the member detail sheet when clicked.
- **Background image with gradient overlay**: A 7MB PNG needs careful treatment. Used `object-cover` + `fill` so it fills the card without distortion, with a `from-ink/70 via-ink/80 to-ink/95` gradient that's darker at the bottom (where the stats are) for readability.
- **`backdrop-blur-sm` on description + labels**: Gives a frosted-glass effect over the background image, matching the observatory theme.
- **`unoptimized` on background image**: The image is 7MB — Next.js image optimization would be slow. Using `unoptimized` serves it directly.

## Next Action

Proceed to Step 1.3: Implement Members and member detail.

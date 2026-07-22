# Log 036 — Redesign Progression Cards, Modal Width, Members Page

**Date:** 2026-07-21
**Time:** 06:41 PM (+08:00)

## Summary of Session

Redesigned the progression cards to match the in-game Clash of Clans style: square tiles with the unit icon centered, level number in a small box at the bottom-left, and a gold "MAX" box when the unit is maxed. Also widened the member detail modal from max-w-lg (512px) to max-w-3xl (768px), and redesigned the members roster page for better readability.

## Work Completed

### Progression cards — in-game CoC style
- Each card is a square tile (`aspect-square`) with:
  - Unit icon centered (or a large letter fallback for unmapped units)
  - **Level box at the bottom-left** — small rounded box showing the level number, styled with `bg-umbra-ink/90 text-umbra-lilac`
  - **Max level number at the top-right** — small dim number showing the cap (when not maxed)
  - **Maxed state**: the level box turns gold (`bg-amber-400 text-umbra-ink`) and shows "MAX" instead of the number; the tile border also turns gold (`border-amber-400/60`)
- Unit name appears below the tile in small text
- Grid: 3 columns on mobile, 5 on sm, 6 on md
- Verified live: maxed units show "MAX" in gold, non-maxed show the level number

### Modal width
- Added `maxWidth` prop to the `Modal` component (default `max-w-lg`)
- Member detail sheet (members page): `maxWidth="max-w-3xl"` (768px)
- Dashboard member detail sheet: `maxWidth="max-w-xl"` (576px)
- Verified: modal is 768px wide

### Members page redesign
- **Filter bar**: cleaner layout with "Filter" label, dropdown selects with full labels ("All roles", "All war pref" instead of just "All"), active-only checkbox
- **Desktop table**: removed redundant columns, better visual hierarchy:
  - Rank number
  - Member (league icon + name + tag + role in one cell)
  - TH badge (styled like the in-game TH badge — purple rounded box)
  - Trophies + league tier name
  - Donations (↑given ↓received with arrows)
  - Activity indicator (glowing dot + date)
  - Wars missed (amber if >0, green if 0)
  - War preference badge
- **Mobile cards**: cleaner layout with league icon, name, TH/role, donations, activity dot, war pref
- **Role sorting**: now uses role hierarchy (leader > coLeader > admin > member) instead of alphabetical
- **Activity indicator**: glowing green dot for active members, dim for inactive

### Modal component update
- `components/ui/modal.tsx`: added `maxWidth?: string` prop to both `Modal` and `CommonProps`
- Default remains `max-w-lg` for backwards compatibility
- The dialog panel now uses `${maxWidth}` instead of hardcoded `max-w-lg`

## Decisions Made

- **In-game CoC progression card style**: The level box at the bottom-left is the signature CoC design pattern. When maxed, it turns gold and shows "MAX" — this is exactly how the game shows it. The max level number at the top-right gives context for how far a unit is from max.
- **max-w-3xl for member detail**: The member detail sheet has 7 sections with grids of stats and progression cards. max-w-lg (512px) was too narrow — the progression grid only fit 3-4 columns. max-w-3xl (768px) fits 6 columns comfortably.
- **Role hierarchy sorting**: Sorting roles alphabetically (admin, coLeader, leader, member) is not useful. Sorting by hierarchy (leader, coLeader, admin, member) matches how the game and dashboard present roles.
- **Gold for maxed, purple for TH**: The in-game TH badge is purple, and the maxed indicator is gold. Used `bg-umbra-purple/15` for TH badges and `bg-amber-400` for maxed level boxes to match.

## Next Action

Proceed to Step 1.4: Implement War Center.

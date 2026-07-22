# Log 037 — Unified Popups, Fixed Scrollbars, Placeholder Icons

**Date:** 2026-07-21
**Time:** 07:31 PM (+08:00)

## Summary of Session

Fixed three major UI consistency issues: (1) reimplemented the Modal component to eliminate double scrollbars, (2) unified the dashboard and members popups to use the same MemberDetailContent component, and (3) removed all AI-generated icons and replaced them with a single SVG placeholder. Also made progression cards smaller and more compact.

## Work Completed

### Modal reimplementation — fixed double scrollbar
- Root cause: both the outer panel (`overflow-hidden`) and inner content (`overflow-auto`) had scroll properties, causing two scrollbars
- Fix: The Modal panel is now `flex flex-col overflow-hidden` with a single inner `<div className="overflow-y-auto p-6">` content area
- The close button is absolutely positioned at `top-3 right-3 z-10` so it stays visible while scrolling
- No nested overflow elements — exactly one scrollbar

### Unified dashboard + members popups
- Created `MemberDetailContent` export in `components/members/member-detail-sheet.tsx` — the 7-section content without the Modal wrapper
- Dashboard's `MemberDetailSheet` now: (1) takes just `playerTag`, (2) fetches full detail from `/api/members/[tag]` on click, (3) renders `MemberDetailContent` inside its own Modal
- Members page's `MemberDetailSheet` wraps the same `MemberDetailContent` in a Modal
- Both popups now show the exact same 7-section layout — UI consistency achieved
- Created API route `app/api/members/[tag]/route.ts` that returns `MemberDetailView` JSON
- Removed the old dashboard `memberMap` (no longer needed — data comes from the API)

### Placeholder icons
- Removed all 18 AI-generated PNG icons from `public/assets/unit-icons/`
- Created a single `placeholder.svg` — a simple purple circle on dark background
- Updated `getUnitIcon()` to return the placeholder path (not `null`) for unmapped units
- Every progression card now renders an image — no broken images, no text-only fallbacks
- Updated tests to expect the placeholder path instead of null

### Smaller progression cards
- Grid: 4/6/8 columns (was 3/5/6) — more cards per row, smaller cards
- Removed the unit name text below each card — the name shows in a `title` tooltip on hover instead
- Tighter spacing: `gap-1.5` (was `gap-2`)
- Level box: `text-[9px]` (was `text-[10px]`), `px-1` (was `px-1.5`)
- Category labels now show count: "Troops (25)"

### Layout fixes
- `FactCell` now uses `flex h-full flex-col justify-center` so all cells in a grid row have the same height — no more uneven card heights
- Activity squares: `h-3.5 w-3.5` and `gap-0.5` — more compact
- Section labels have `border-b border-umbra-line/50 pb-1` for clear separation
- Donation score components: 4-column grid instead of vertical list

## Decisions Made

- **Single scrollable area in Modal**: The Modal panel is `overflow-hidden` with one inner `overflow-y-auto` div. This is the standard pattern for modals with fixed headers — exactly one scrollbar, attached to the content area.
- **Client-side fetch for dashboard popup**: The dashboard doesn't have full member details in its server data. Instead of fetching all member details server-side (expensive for the dashboard page), the popup fetches on click via `/api/members/[tag]`. This is fast (one DB query) and keeps the dashboard page light.
- **Placeholder SVG for all unmapped units**: Rather than text fallbacks or broken images, every card gets the same placeholder image. This looks consistent and clean. When real Fankit icons are added later, just drop the PNGs into `public/assets/unit-icons/` — the map will resolve them automatically.
- **Removed unit names from progression cards**: The cards are small tiles. Showing the name below each one took too much vertical space. The `title` attribute provides the name on hover, which is sufficient for a dense grid view.
- **Unified MemberDetailContent export**: By exporting the content separately from the Modal wrapper, both the dashboard and members page can reuse the exact same layout. This ensures UI consistency without code duplication.

## Next Action

Proceed to Step 1.4: Implement War Center.

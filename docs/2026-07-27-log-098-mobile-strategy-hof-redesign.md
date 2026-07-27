# Log 098 — Mobile Fixes, Strategy Status Bug, Hall of Fame Card Redesign

**Date:** 2026-07-27
**Time:** 12:35 AM (+08:00)

## Summary of Session
Three user-reported issues + one design improvement: (1) the Star distribution
chart was invisible on mobile and the bottom nav was cut off; (2) the Strategy
"Review Needed" table showed "Active" for inactive players; (3) the Hall of
Fame cards were redesigned from a fixed-height list into a podium + list layout.

## Work Completed

### 1. Mobile: Star distribution chart hidden
- **`components/dashboard/dashboard-shell.tsx`** — the donut chart container
  used `flex-1` which has no height on mobile (single-column, no row-height to
  flex against). Changed to `h-48 sm:h-56 lg:h-auto lg:flex-1` so the chart has
  a definite height on mobile/tablet (192px / 224px) and uses flex-1 on desktop
  where the grid row provides equal height.
- VLM-verified: the donut ring is now visible on 375px mobile.

### 2. Mobile: Bottom navigation cut off
- **`components/navigation.tsx`** — the nav had `max-w-md` (capping at 448px)
  and labels at `text-sm` (15px). Six items × long labels ("Hall of Fame",
  "War Center") overflowed narrow screens, pushing later items off-screen.
- Fixes:
  - Removed `max-w-md`; nav is now `w-full` on mobile.
  - Each link is now `flex min-w-0 flex-1` so all 6 share space equally.
  - Labels changed from `text-sm whitespace-nowrap` to `text-micro truncate
    lg:text-sm lg:whitespace-nowrap` — 9px on mobile (fits), 15px on desktop.
  - Gap reduced from `gap-1` to `gap-0.5`, padding from `p-2` to `p-1`.
- VLM-verified: all 6 items (Dashboard, Members, War Center, Strategy, Capital,
  Hall of Fame) are fully visible on 375px with no truncation.

### 3. Strategy: Status column bug
- **`components/strategy/strategy-shell.tsx`** `ReviewRow` — the old logic
  `isActive = m.daysInactive === null || m.daysInactive < 4` had two bugs:
  1. `daysInactive === null` (no tracked activity) was treated as **Active** —
     falsely reporting inactive/uncold-started players as active.
  2. The 4-day threshold didn't match the query layer's 7-day threshold
     (`strategy-queries.ts` uses `isActive = lastActiveDate ? now - last < 7d : false`).
- Fix: replaced with a three-state status:
  - `daysInactive === null` → **Unknown** (amber, no tracking data)
  - `daysInactive < 7` → **Active** (emerald, matches query layer)
  - `daysInactive >= 7` → **Inactive** (muted)
- Note: "Low activity" (low activity *score*) is a different metric from
  "Inactive" (not *seen* for 7+ days). A player can be recently active but have
  a low activity score — both flags are correct simultaneously.

### 4. Hall of Fame card redesign
- **`components/hall-of-fame/record-card.tsx`** — complete redesign from a
  fixed-height (350px) uniform list into a **podium + list** layout:
  - **Champion (#1)** — featured row with a glowing crown icon badge (IconCrown,
    not emoji), "Champion" label, large value, gold-tinted gradient background.
  - **Runner-ups (#2-3)** — compact rows with medal-colored rank badges
    (silver for #2, bronze for #3).
  - **Rest (#4-10)** — minimal rows separated by a divider, just rank + name +
    value in muted tones.
  - **No fixed height** — card sizes to content; empty cards are compact.
  - **Glow on hover** — card border brightens to purple + soft shadow.
  - **Header** — icon in a glowing circular badge + title + subtitle, matching
    the section-label pattern used elsewhere.
  - **View-all modal** — cleaned up with a border-b header + close button.
- **`components/hall-of-fame/hall-of-fame-shell.tsx`** — added `items-start` to
  all four section grids so cards don't stretch to equal heights (the old
  fixed-height cards needed `items-stretch`; the new content-sized cards need
  `items-start`).

## Decisions Made
- **Three-state status** (Active/Inactive/Unknown) over a binary fix — "Unknown"
  is more honest than "Inactive" for cold-start members with no tracking data,
  and it distinguishes "we know they're gone" from "we don't have data yet".
- **Podium + list** over the old uniform list — gives the #1 holder the visual
  emphasis a record deserves, while keeping #4-10 scannable without wasting
  vertical space.
- **Crown icon (not emoji)** — the 👑 emoji was the last emoji in the codebase;
  replaced with `IconCrown` from the celestial icon set for consistency.
- **Content-sized cards** — removed the 350px fixed height so short leaderboards
  don't waste space and long ones don't double-scroll.

## Verification
- All six routes return HTTP 200.
- `bun run typecheck` → clean.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `bun run test` → 147/147 pass.
- VLM-verified: mobile donut chart visible, all 6 nav items visible on 375px,
  HoF cards show champion + runner-ups + rest, strategy status shows three states.

## Next Action
Continue incremental polish. The HoF redesign is a good foundation; future
work could add per-category accent glows on the champion row or a "defended"
indicator when a record holder hasn't changed between batches.

# Log 095 — Autonomous Glassmorphism Redesign & Hardening

**Date:** 2026-07-26
**Time:** 07:03 PM – 09:33 PM (+08:00)

## Summary of Session
After the Celestial Observatory redesign was reverted (log 094), a separate
manual design agent drove 30 commits that independently re-implemented a
glassmorphism UI layer on top of the original umbra theme, plus a batch of
data-display bug fixes. This log documents those commits retroactively — they
were committed directly to `main` without per-phase docs entries.

## Work Completed

### Assets
- Replaced `public/assets/Logo.png` and `public/assets/Clan-Card-Background`
  (transitioned through `.jpg` → `.png`). New background is a 2752×1536
  moon/constellation illustration.
- Updated `app/globals.css` background-image reference to the `.png` extension.

### Glassmorphism design layer
- **`app/globals.css` `.glass`** — redefined to `bg-white/[.02]` +
  `backdrop-blur-[2px]` + `shadow-2xl` + purple hover glow
  (`hover:border-umbra-purple/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]`).
  Blur intentionally tuned down to exactly 2px (commits `75e80e2`, `7d498c7`)
  after testing softer borders.
- **Navigation** (`78d4168`) — glassmorphism + logo background treatment.
- **Dashboard** (`18895b3`, `69da8ac`) — rebuilt with glass cards + equal-height
  columns capped at 450px.
- **Strategy page** (`7423157`) — redesigned into glass containers + two data
  tables ("Suggested Participants" / "Review Needed").
- **War detail modal** (`4bfb23e`) — redesigned, attack log aligned, roster
  toggles animated.
- **Recent seasons** (`577eee1`) — converted from cards into a data table.
- **CWL standings** (`d8fcd30`) — standardized `data-container` styling.
- **Pop-up components** (`d532df8`) — unified glass applied; roster horizontal
  scroll fixed.
- **Nested glass in modals** (`1af41cc`) — removed glass-in-glass nesting,
  fixed table column sizing.

### Table/list standardization
- `da9c6f4` — all tables unified to the flatter `data-container` styling.
- `a0e5ba1` — war roster table scrollability fixed; `SectionLabel` adopted in
  war detail sheet.
- `f223edb` — war history card header layout cleaned up.
- `02ddbc3` — brand badge applied to roster growth current count.
- `bea6fa3` — ranking column added to "Review Needed"; pills and status updated.
- `cae550b` — all scattered metadata text unified into standard pill badges.
- `0213535` — vertical padding added to war-score line container to fix glowing
  aura clipping.

### Sidebar state
- `6478442` — sidebar collapse state now read from cookies (server-side) so the
  rail renders in the correct state on first paint, preventing the load
  animation flash.

### Bug fixes
- `82ea0ce` — deduplicate fastest-3-star hall-of-fame records by player.
- `82be70d` — correctly display admin role as "Elder" in the UI.
- `a139ce4` — add missing `formatRole` to member details sheet (build fix).
- `1243eaa` — build errors, eslint compatibility, and missing prop types.
- `5d5608d` — explicit date parsing for longest-tenure live record (drizzle
  returns `min(timestamp)` as a string; normalized via `new Date()`). This was
  the same `r.firstSeen.getTime is not a function` error flagged in log 094.
- `cfe7ae1`, `eaf2b9d` — background image extension references corrected.

### New primitive
- `components/ui/section-label.tsx` — `SectionLabel` component: a display-font
  heading with a bottom border, used to title sections inside modals/panels.

## Decisions Made
- Kept the original umbra token set (single `line` opacity) rather than
  introducing a multi-tier line system; layered glassmorphism on top instead.
- Kept lucide-react icons (no bespoke icon set).
- Kept the raster `Logo.png` in the sidebar (no CSS emblem).
- Blur tuned to 2px — enough frosted-glass feel without hurting readability or
  performance.
- Dashboard columns capped at 450px to prevent the page from growing too tall
  on wide screens.

## Verification
- All six routes return HTTP 200.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `r.firstSeen.getTime` error on `/hall-of-fame` resolved.

## Next Action
Documented here so the timeline is continuous. The subsequent session (log 096)
compresses the background asset, refactors the freshness footer into a global
footer, and unifies popup headers.

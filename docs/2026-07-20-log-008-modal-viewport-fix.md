# Log 008 — Modal Viewport Fix

**Date:** 2026-07-20
**Time:** 07:50 PM (+08:00)

## Summary of Session

Fixed the member-record modal so it is positioned against the browser viewport instead of being constrained by the dashboard card that opened it.

## Work Completed
- Moved `Modal` and `Sheet` rendering into a `document.body` portal.
- Preserved the full-screen overlay and centered desktop modal behavior at the viewport level.
- Added Escape-key dismissal to `Modal` and dialog accessibility attributes.
- Kept mobile sheet behavior available for the upcoming member detail implementation.

## Decisions Made
- Used a React portal rather than removing the card’s glass/backdrop styling; the portal is the correct boundary for overlays and prevents ancestor `backdrop-filter` from creating a fixed-position containing block.

## Deviations and Verification
- No dashboard data or page behavior was changed beyond overlay positioning and dismissal behavior.
- `npm run typecheck` passed.
- Database migrations and `npm run build` passed with `.env.local` loaded into the process.
- `git diff --check` passed. No secrets or `.env.local` were staged.

## Next Action

Continue with the full Step 1.2 member detail sheet using this viewport-level overlay foundation.

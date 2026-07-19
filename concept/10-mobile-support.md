# 10 — Mobile Support Planning

Clan members will overwhelmingly check this on a phone, not a desktop — it's a companion to a mobile game. Mobile is not an afterthought pass at the end; it shapes a few decisions made earlier in this plan.

## Approach: responsive web, not a separate app

A single responsive Next.js app, not a separate native app or a separate mobile codebase. Justification: the feature set (tables, cards, charts, one drag-and-drop screen) is well within what responsive web handles well, and a second codebase would double the maintenance burden for a hobby clan project. If usage later justifies a PWA (installable, offline-tolerant shell) that's a cheap incremental step on top of this — not a rebuild — but it is not a Phase 1 commitment.

## Places this affects earlier decisions in this plan

- **Drag-and-drop roster builder (`09-war-planning-and-auto-select.md`):** `@dnd-kit` was picked specifically because it supports touch, and the plan explicitly calls for a tap-to-add fallback, not drag as the only interaction. Free-drag reordering on a small touchscreen is a known pain point.
- **Charts (`05-dashboard.md`, `04-activity-tracking-and-polling.md`):** hourly/daily bar or line charts need to degrade gracefully at narrow widths — fewer visible labels, horizontal scroll or a "zoom to a range" interaction rather than cramming 30 daily bars into 360px.
- **Member cards/tables (`06-members.md`):** the troop/hero/spell card grid needs a genuine mobile layout (fewer columns, larger tap targets), not just a shrunk desktop grid. Table views (sortable member list) should collapse to a card-per-member layout below a breakpoint rather than a horizontally-scrolling table, which is a common and avoidable mobile-web mistake.
- **Popups/modals:** on mobile, the member detail "popup" should behave like a full-screen sheet, not a small centered dialog — small centered modals on a phone are cramped and hard to dismiss cleanly.

## Practical build guidance

- Design mobile-first (build the 375–430px layout first, then expand up), rather than designing desktop and retrofitting — retrofitting is where most of the above problems come from in practice.
- Tailwind's breakpoint system (`sm`/`md`/`lg`) is sufficient; no need for a separate mobile detection library.
- Test on an actual phone, not just a resized browser window, at least once per major feature — browser dev-tool device emulation misses real touch-target and scroll-behavior issues.
- Keep the manual war-refresh button (`07-clan-war.md`) large and unambiguous — this is the single most likely action someone takes one-handed, mid-war, on a phone.

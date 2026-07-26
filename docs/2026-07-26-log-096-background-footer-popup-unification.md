# Log 096 — Background Compression, Global Freshness Footer, Popup Header Unification

**Date:** 2026-07-26
**Time:** 11:35 PM (+08:00)

## Summary of Session
Three targeted improvements following the top-down analysis: compressed the
oversized background asset, promoted the dashboard-only poll-status strip into a
global footer shown on every page, and unified the modal/popup header pattern
across the member-detail and score-leaderboard sheets.

## Work Completed

### 1. Background image compression
- `public/assets/Clan-Card-Background.png` was 7.4 MB (2752×1536, 32-bit RGBA).
- Resized to 1920px wide + palette-quantized to 8-bit PNG via sharp.
- **Result: 7.08 MB → 528 KB (93% smaller)**, no visible banding through the
  90% dark overlay (VLM-verified). The `.png` extension is preserved so the
  `globals.css` `background-image` reference stays valid.

### 2. Global freshness footer
- **New query** `getPollStatuses()` in `lib/db/queries.ts` — a lightweight
  two-query read (clan row + `min`/`max` over `wars.lastSyncedAt`) that returns
  `{ lastPoll, lastBatch, trackingStart, warSynced }`. Avoids pulling the full
  dashboard query bundle on non-dashboard routes.
- **New component** `components/layout/footer.tsx` — a client `<Footer>` that
  renders the poll-status chips + live next-update countdown as a real page
  footer (`<footer>` with `border-t`, `mt-auto`, `bg-umbra-ink/60` +
  `backdrop-blur-sm`). Retains the clock-drift-tolerant `useServerClock` logic
  and the overdue auto-refresh behavior from the old `FreshnessFooter`.
- **`app/layout.tsx`** — fetches `getPollStatuses()` (best-effort, falls back to
  nulls on DB error) and renders `<Footer>` inside `<main>` after the page
  content. `<main>` is now `flex min-h-screen flex-col` with the content in a
  `flex-1` wrapper so the footer sticks to the bottom on short pages and is
  pushed down naturally on long pages. The `pb-20 lg:pb-0` on main clears the
  mobile bottom nav.
- **`components/dashboard/dashboard-shell.tsx`** — removed the old
  `FreshnessFooter` function, the `Chip` helper, the `<FreshnessFooter>` usage,
  and the separate "Umbra Lunaria · Clan Observatory" footer. Removed the now-
  unused `useEffect`/`useServerClock` imports and the `serverNow` prop.
- **`app/page.tsx`** — dropped the `serverNow={Date.now()}` prop from
  `<DashboardShell>`.

The footer now appears on **all six routes** (`/`, `/members`, `/war`,
`/capital`, `/hall-of-fame`, `/strategy`), not just the dashboard.

### 3. Popup header unification
Assessment of the modal/popup landscape: all popups share the same `Modal`/
`Sheet` primitive (`.glass` panel, fixed close button, single scroll area), but
header treatment was inconsistent — `war-detail-sheet` had a clean
`border-b` separator + mono eyebrow, `member-detail-sheet` had no separator,
and `score-leaderboard` had neither separator nor eyebrow.

- **`components/members/member-detail-sheet.tsx`** — added
  `border-b border-umbra-line/40 pb-4` to the profile header row so the
  identity header (icon + name + TH badge) is cleanly separated from the dense
  stats grid below, matching the war-detail pattern.
- **`components/members/score-leaderboard.tsx`** — replaced the bare `mb-6`
  title block with a `border-b border-umbra-line/40 pb-4` header containing a
  mono purple eyebrow ("Member Activity Score") + the title, matching the
  war-detail header treatment.

Title sizes are intentionally kept: the member name uses `text-2xl` (primary
identity), the generic modal titles use `text-xl` — a justified hierarchy, not
an inconsistency.

## Decisions Made
- **Footer data fetching in the layout**: the root layout is a server component,
  so it can call `getPollStatuses()` directly. Wrapped in try/catch so a DB
  outage renders the footer with "—" fields instead of breaking every page.
- **Kept the `.png` background extension** rather than switching to WebP/JPEG —
  avoids touching `globals.css` and respects the asset work done in log 095.
  Palette-quantized PNG gives 93% savings on this dark atmospheric image.
- **Light popup unification over a full redesign**: the modal infrastructure is
  already consistent; only the header separators needed aligning. The hall-of-
  fame record-card keeps its unique colored-band header intentionally (it's an
  award-card variant).

## Verification
- All six routes return HTTP 200.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- Footer confirmed present on `/` and `/war` (checked via rendered HTML); old
  "Clan Observatory · Single-clan" footer text confirmed absent from dashboard.
- Background image VLM-verified: no visible artifacts through the overlay.

## Next Action
Continue incremental polish. Candidate areas: the empty "Roster Growth" chart
(sandbox-only, works in Vercel), low-contrast badge audit, and the dense
metadata footer could wrap more gracefully on narrow mobile widths.

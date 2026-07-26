# Log 093 — Celestial Observatory Redesign

**Date:** 2026-07-26
**Time:** 06:15 PM (+08:00)

## Summary of Session
A complete UI/UX redesign of Umbra Lunaria following the "Moon's Shadow" clan identity. The visual language is now a dark, moonlit celestial observatory: a true-void starfield, 3-tier glass cards with glow, unified tables and lists with purple row-accent bars, a lunar-emblem sidebar, and a bespoke celestial icon set. Layouts and data logic are unchanged; every surface, control, table, and list was restyled.

## Work Completed

### Design-system foundation
- **`tailwind.config.ts`** — new celestial token set: `umbra-void #050309`, `umbra-ink`, `umbra-surface`, `umbra-elevated`, `umbra-raised`, astral accents (`purple #B678FF`, `violet #7552DF`, `indigo #4B2FA0`, `moonlight #F2EEFF`, `lilac`, `muted`, `faint`, `ghost`), calibrated line opacities (`line`, `line-bright`, `line-soft`), glow shadows, 3 radii, lunar easing curves, and keyframes for `twinkle`, `spin-slow`, `pulse-soft`, `drift-up`, `glow-breathe`, `bar-rise`.
- **`app/globals.css`** — full rewrite: fixed starfield-void background with twinkling pinpricks, nebula radial gradients, `.glass`/`.lunar-card` (L1 — gradient glass, top moonlight edge, hover lift + purple halo), `.lunar-tile`/`.tile` (L2 inner stat box), `.lunar-panel` (L3 modal), unified `.data-container`/`.data-thead`/`.data-th`/`.data-tbody`/`.data-tr`/`.data-td` table system with sticky header + 2px purple row-accent bar on hover, `.data-li` list item with left accent + translateX hover, `.lunar-divider` (diamond-node ornament), `.section-head`, `.btn-primary` (violet→purple gradient glow), `.btn-ghost`, `.btn-icon`, `.badge` tones with glowing dots, `.chip`, `.th-badge` ramp, `.focus-ring`, `.select-input`. `prefers-reduced-motion` disables all animations.

### Icon system
- **`components/ui/icons.tsx`** — bespoke celestial icon set. Every icon shares a 24×24 viewBox, 1.6 stroke, round caps, `currentColor`. Navigation sigils are custom SVGs: `NavIconDashboard` (moon-phase compass), `NavIconMembers` (crescent + ascending roster dots), `NavIconWar` (crossed crescent blades), `NavIconPlanning` (star over planisphere), `NavIconCapital` (ziggurat under rising moon), `NavIconHallOfFame` (chalice crowned by star). Award icons (Gift, Flame, Coins, Eye, Zap, Crown, Trophy) redrawn with lunar fills. Utility icons (chevrons, X, loader, sync, alert, arrows, grip, plus, trash, save, filter, search) re-exported from lucide-react for crispness.

### Navigation
- **`components/navigation.tsx`** — lunar sidebar rebuilt: CSS crescent-moon mini-emblem (orbital ring + moon disc + cardinal star) replaces the raster logo; active state paints a 2px purple glow bar + violet gradient wash via `framer-motion` `layoutId`; collapse toggle animates width with staggered label fade (`AnimatePresence`); status footer pulses softly (`animate-pulse-soft`); mobile bottom bar retains the active treatment with safe-area padding.

### Core primitives
- **`button.tsx`** — `primary` (gradient glow, lifts on hover), `ghost` (glass), `icon` (square tile), all 140ms lunar easing.
- **`badge.tsx`** — semantic pill with a glowing dot; tones good/warn/danger/info/brand/muted.
- **`stat-card.tsx`** — L2 tile with glowing icon (scale on hover), mono value, trend line.
- **`tabs.tsx`** — glass inset; active tab gets violet wash + glow ring.
- **`empty-state.tsx`** — calm glass tile with a glowing circular icon.
- **`data-table.tsx`** — migrated to `.data-container`/`.data-thead`/`.data-tr`/`.data-td`; selected row gets inset purple bar; mobile cards use `.data-li`.
- **`page-scaffold.tsx`** — section eyebrow in mono purple, moonlight title, ghost-glass "Back to overview" chip; `ComingSoon` restyled with `.lunar-tile` trio.
- **`chart-theme.ts`** — added `violet`, `info`, `moonlight`, `grid` constants for richer series + faint gridlines.

### Feature components (via parallel subagents 7-a / 7-b / 7-c)
- **Dashboard** (16 files): hero `clan-identity-card` (badge in purple glow, sigil description in mono tile, clean ledger); `war-record`/`capital-summary`/`current-war` cards (`.lunar-card lunar-hover` + `.lunar-tile` stat boxes); `donation-analytics`/`activity-analytics` (glassed totals strip, `.data-li` leaderboard rows with rank gradients); `war-performance`/`war-attack-distribution`/`roster-size`/`donation` charts (animation props + glass containers); `needs-attention`/`clan-log` (`.data-li` buttons); `nav-summaries` (ghost buttons + `.lunar-divider`); `member-detail-sheet` (loader + alert states); `score-leaderboard` (crown-glow champion podium). `dashboard-shell` wraps every card in `<CardMount>` for staggered entry.
- **Members + War** (12 files): `members-roster` (filter bar with leading search icon, `.th-badge` ramp TH14+/11-13/10-, mobile `.lunar-tile` cards); `score-leaderboard` (crown podium with `animate-glow-breathe`); `member-detail-sheet` (all sections → `.lunar-tile`, achievements → `.data-li`, crown icon); `war-hero`/`war-rosters`/`war-attack-log`/`war-history`/`cwl-league-view`/`war-detail-sheet` (`.lunar-card`, raw tables → `.data-*`, result pills → `.badge`, `.lunar-divider` under detail header).
- **Capital + Hall of Fame + Strategy** (10 files): `capital-overview-card` (glowing circular badge); `district-list`/`raid-history` (`.data-li` rows, `IconTrophy` replaces emoji); `raid-timer-banner` (glass banner + `animate-pulse-soft` status dot); `upgrade-timeline` (`.data-li` with glowing node dots); `record-card` (trophy-case glass card, circular award badge blooms `shadow-glow` on hover, large mono value); `strategy-shell` (glass panel + `.lunar-tile` headline trio + `.data-li` review rows).

### Bug fix
- **`lib/db/hall-of-fame-queries.ts`** — `computeLongestTenure()` crashed with `r.firstSeen.getTime is not a function` because drizzle returns raw `min(timestamp)` as a string. Normalized via `new Date(...)` so both Date and string paths work. The red error toast on `/hall-of-fame` is gone.

## Decisions Made
- Kept `.glass` as an alias for `.lunar-card` so existing markup keeps working; new cards use `.lunar-card` + `lunar-hover` explicitly.
- Wrote celestial component classes in `globals.css` with **direct CSS values** (not `@apply`) for all custom umbra colours — Tailwind v3's `@apply` cannot reliably resolve custom extended colour utilities (especially quoted hyphen keys like `line-bright`) during dev hot-reloads.
- The clan's in-game description (which uses box-drawing characters as the clan's own sigil art) is now rendered in `font-mono whitespace-pre` inside a `.lunar-tile` so it displays as an intentional branded element rather than broken text.
- Icon set is hand-built SVG (not lucide) for the navigation sigils and award icons so the celestial motif is cohesive; utility icons reuse lucide-react for crispness.
- Layouts were intentionally kept the same per the brief — only surfaces, typography, tables, lists, navigation, icons, hover/glow, and animations changed.

## Verification
- All six routes return HTTP 200: `/`, `/members`, `/war`, `/capital`, `/hall-of-fame`, `/strategy`.
- `bun run lint` → 0 errors, 11 pre-existing warnings (all unused-import warnings in unrelated query files).
- `npx tsc --noEmit` passes clean.
- Agent-browser screenshots + VLM review rate the redesign 8–9/10 for cohesion across all pages; the sidebar emblem, active glow bar, glass cards, top moonlight edge, and purple row-accent hovers all confirmed visually.
- `prefers-reduced-motion` disables starfield twinkle, card lifts, pulse, and framer-motion slide.

## Next Action
Hand off to the recurring webDevReview cron (every 15 min) for continued QA, bug fixes, and incremental feature/feature-detail expansion per the redesign direction.

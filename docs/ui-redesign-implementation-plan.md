# UI Redesign Implementation Plan — "Crystalline Observatory"

**Date:** 2026-07-25
**Status:** Implementation plan (ready to execute)
**Predecessor:** `docs/ui-redesign-planning.md` (audit + design rationale)

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Navigation Redesign](#2-navigation-redesign)
3. [Shared Components](#3-shared-components)
4. [CSS Utilities](#4-css-utilities)
5. [Page-by-Page Refactor](#5-page-by-page-refactor)
6. [Interactivity Layer](#6-interactivity-layer)
7. [Readability Pass](#7-readability-pass)
8. [Execution Checklist](#8-execution-checklist)

---

## 1. Design System

### 1.1 Color tokens (Tailwind config — no new tokens, just rules)

| Token | Hex | Role |
|---|---|---|
| `umbra-ink` | `#090811` | Page background (Level 0 — void) |
| `umbra-surface` | `#12101C` | Card surface base (Level 1 — panel) |
| `umbra-elevated` | `#211B34` | Hover/active surface (Level 1.5) |
| `umbra-line` | `rgba(190,151,255,.15)` | Border on all Level 1 surfaces |
| `umbra-purple` | `#B678FF` | Primary accent — links, icons, active states |
| `umbra-lilac` | `#EEE5FF` | Primary text color |
| `umbra-muted` | `#A89CC4` | Secondary text color |
| `white/[.025]` | — | Level 2 tile background (inner stat boxes) |
| `white/[.04]` | — | Hover-subtle (rows, tiles) |
| `white/[.08]` | — | Hover-emphasis (buttons, cards) |

### 1.2 Section accent colors (stained-glass top-edge)

| Section | Color | Tailwind class | Hex |
|---|---|---|---|
| Dashboard / General | Purple | `border-t-umbra-purple/30` | `#B678FF` |
| War Center | Amber | `border-t-amber-400/30` | `#fbbf24` |
| Capital | Yellow | `border-t-yellow-400/30` | `#facc15` |
| Hall of Fame | Purple | `border-t-umbra-purple/30` | `#B678FF` |
| Members | Sky | `border-t-sky-400/30` | `#38bdf8` |
| Donations (within dashboard) | Emerald | `border-t-emerald-400/30` | `#34d399` |
| Danger / Alert | Rose | `border-t-rose-400/30` | `#fb7185` |

### 1.3 Radius scale (3 values only)

| Radius | Tailwind | Usage |
|---|---|---|
| 16px | `rounded-2xl` | All card/panel surfaces |
| 8px | `rounded-lg` | All inner tiles, inputs, rows, buttons |
| full | `rounded-full` | All pills, badges, icon-only buttons, nav items |

**Rule:** if it's a container → `rounded-2xl`. If it's inside a container → `rounded-lg`. If it's a pill/badge → `rounded-full`. No `rounded-xl`, `rounded-md`, or custom values.

### 1.4 Typography rules

| Content type | Class | Example |
|---|---|---|
| Page title (h1) | `font-display text-3xl sm:text-4xl text-umbra-lilac` | "Hall of Fame" |
| Section header (h2) | `font-display text-xl text-umbra-lilac` | "All-Time Legends" |
| Card title (h3) | `font-display text-lg text-umbra-lilac` | "The Philanthropist" |
| Card subtitle | `text-xs text-umbra-muted` | "Highest all-time donations" |
| Eyebrow/kicker | `font-mono text-label uppercase tracking-[.16em] text-umbra-purple` | "DASHBOARD" |
| Stat value | `font-display text-lg text-umbra-lilac tabular-nums` | "47,800" |
| Body text | `text-xs text-umbra-muted` | Descriptions, subtext |
| Label/meta | `font-mono text-label text-umbra-muted` | "Last update" |
| Numeric display | `font-mono tabular-nums` | Countdowns, stats |

### 1.5 Hover scale (2 values only)

| Class | Opacity | Usage |
|---|---|---|
| `.hover-subtle` | `bg-white/[.04]` | Rows, tiles, nav items |
| `.hover-emphasis` | `bg-white/[.08]` | Buttons, clickable cards |

---

## 2. Navigation Redesign

### 2.1 Current problems

- **Desktop sidebar:** fixed width (60px collapsed / 240px expanded), no visual depth, collapse toggle button floats awkwardly on the border, nav items use custom `rounded-[10px]` (not in the radius scale), active state is barely distinguishable from inactive.
- **Mobile bottom bar:** items are cramped, icons are tiny, no labels on some items, no safe-area padding for iOS.
- **Logo area:** uses `<img>` (should be `<Image>`), no visual connection to the rest of the sidebar.
- **Status footer:** "Systems nominal" text is hidden when collapsed — no indicator at all.

### 2.2 Proposed desktop sidebar

```
┌──────────────────────────────────┐
│  ┌──────┐                        │
│  │ Logo │  UMBRA LUNARIA         │ ← logo + wordmark, clickable → /
│  └──────┘  (font-display)         │
│  ──────────────────────────────  │ ← thin border
│                                   │
│  ┌─────────────────────────────┐ │
│  │ ◈  Dashboard                │ │ ← active: bg-purple/10 + left accent bar
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ ◈  Members                  │ │ ← inactive: transparent, hover: bg-white/4
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ ⚔  War center               │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ 🏛  Capital                  │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ 🏆  Hall of Fame             │ │
│  └─────────────────────────────┘ │
│                                   │
│  ──────────────────────────────  │ ← thin border
│  ● Systems nominal                │ ← status indicator (emerald dot)
│  Tracking quietly.                │
│                                   │
│              [◀ collapse]         │ ← collapse toggle at bottom-right
└──────────────────────────────────┘
```

### 2.3 Desktop sidebar spec

| Element | Spec |
|---|---|
| Width | 240px expanded, 64px collapsed (was 60px — round number) |
| Background | `bg-umbra-ink/95 backdrop-blur-xl` (keep current) |
| Border | `border-r border-umbra-line` (keep current) |
| Position | `sticky top-0 h-screen` (keep current) |
| Nav item radius | `rounded-lg` (was `rounded-[10px]` — now follows the radius scale) |
| Nav item padding | `px-3 py-2.5` expanded, `py-2.5 justify-center` collapsed |
| Nav item active | `bg-umbra-purple/10 text-umbra-lilac` + **left accent bar** (`border-l-2 border-l-umbra-purple`) |
| Nav item inactive | `text-umbra-muted hover:bg-white/[.04] hover:text-umbra-lilac` |
| Nav item icon | `w-5 h-5 text-umbra-purple` (active: `text-umbra-purple`, inactive: `text-umbra-muted/70`) |
| Nav item gap | `gap-3` (icon ↔ label) |
| Collapse toggle | Moved to bottom of sidebar (not floating on border). `rounded-full h-8 w-8` icon button. |
| Logo | Use `<Image>` component (not `<img>`). `h-10 w-10 rounded-full shadow-glow`. |
| Status indicator | When collapsed: just the emerald dot (no text). When expanded: dot + "Systems nominal" + tagline. |

### 2.4 Proposed mobile bottom bar

```
┌────────────────────────────────────────────┐
│  ◈        👤        ⚔        🏛        🏆  │
│ Dashboard  Members  War    Capital  HoF    │
└────────────────────────────────────────────┘
     ↑ safe-area padding (env(safe-area-inset-bottom))
```

### 2.5 Mobile bottom bar spec

| Element | Spec |
|---|---|
| Position | `fixed inset-x-0 bottom-0 z-20` (keep current) |
| Background | `bg-umbra-ink/95 backdrop-blur-xl border-t border-umbra-line` (keep current) |
| Padding bottom | `pb-[env(safe-area-inset-bottom)]` (NEW — iOS safe area) |
| Item layout | `flex justify-around` (keep current) |
| Item structure | Icon (w-5 h-5) + label below (text-label) |
| Item active | Icon: `text-umbra-purple`, label: `text-umbra-lilac` |
| Item inactive | Icon: `text-umbra-muted/60`, label: `text-umbra-muted/40` |
| Item radius | None (flat bar — no rounded items on mobile) |
| Item hover | Not applicable (touch) — active state only |
| Item gap | `gap-1` (icon ↔ label) |
| Item padding | `px-2 py-1.5` |
| Page bottom padding | `pb-20` on `<main>` (keep current — prevents overlap) |

### 2.6 Active-route accent color per page

Each nav item gets a colored left-accent bar on desktop when active, matching the section's stained-glass color:

| Nav item | Active accent | Color |
|---|---|---|
| Dashboard | `border-l-umbra-purple` | Purple |
| Members | `border-l-sky-400` | Sky |
| War center | `border-l-amber-400` | Amber |
| Capital | `border-l-yellow-400` | Yellow |
| Hall of Fame | `border-l-umbra-purple` | Purple |

---

## 3. Shared Components

### 3.1 `<Button>`

**File:** `components/ui/button.tsx`

```tsx
interface ButtonProps {
  variant?: "primary" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  // ...standard button props
}
```

| Variant | Border | Background | Text color | Hover |
|---|---|---|---|---|
| `primary` | `border-umbra-purple/40` | `bg-umbra-purple/10` | `text-umbra-purple` | `hover:border-umbra-purple/60 hover:bg-umbra-purple/20` |
| `ghost` | `border-umbra-line` | transparent | `text-umbra-muted` | `hover:text-umbra-lilac hover:border-umbra-purple/30 hover:bg-white/[.04]` |
| `icon` | `border-transparent` | transparent | `text-umbra-muted` | `hover:text-umbra-lilac hover:bg-white/[.06]` |

| Size | Padding | Font | Gap |
|---|---|---|---|
| `sm` | `px-3 py-1.5` | `text-2xs font-semibold uppercase tracking-wider` | `gap-1` |
| `md` | `px-4 py-2` | `text-label font-semibold uppercase tracking-wider` | `gap-1.5` |
| `lg` | `px-5 py-2.5` | `text-xs font-semibold uppercase tracking-wider` | `gap-2` |

All buttons: `rounded-full inline-flex items-center focus-ring transition disabled:opacity-40 disabled:cursor-not-allowed`.

**Replaces:** The 8+ inline button styles currently spread across dashboard-shell, war-hero, hall-of-fame-shell, page-scaffold, etc.

### 3.2 `<Eyebrow>`

**File:** `components/ui/eyebrow.tsx`

```tsx
<Eyebrow>Dashboard</Eyebrow>
<Eyebrow accent="amber">War center</Eyebrow>
```

| Prop | Default | Options |
|---|---|---|
| `accent` | `"purple"` | `purple \| amber \| yellow \| emerald \| sky \| rose` |
| `children` | required | string |

Output: `<p className="font-mono text-label uppercase tracking-[.16em] {accent-color}">`

**Replaces:** 37+ inline `font-mono text-label uppercase tracking-[.16em] text-umbra-purple` instances.

### 3.3 `<Panel>`

**File:** `components/ui/panel.tsx`

```tsx
<Panel accent="amber">
  {/* card content */}
</Panel>
```

| Prop | Default | Options |
|---|---|---|
| `accent` | `undefined` (no glow) | `purple \| amber \| yellow \| emerald \| sky \| rose` |
| `className` | — | Additional classes |
| `children` | required | content |

Base: `rounded-2xl border border-umbra-line bg-umbra-surface/40 shadow-lg backdrop-blur-md`
With accent: adds `border-t-2 border-t-{color}/30` (the stained-glass top edge)
Hover: `transition hover:border-umbra-line/40`

**Replaces:** All `.glass` usage + manual border/bg classes on card sections.

### 3.4 `<StatTile>`

**File:** `components/ui/stat-tile.tsx`

```tsx
<StatTile label="Clan Level" value={18} />
<StatTile label="Total loot" value={48000} format="locale" />
```

| Prop | Type | Description |
|---|---|---|
| `label` | string | Stat label (uppercase, mono) |
| `value` | number \| string | The stat value |
| `format` | `"raw" \| "locale"` | `locale` = `.toLocaleString()` |

Output:
```
┌──────────────┐
│ CLAN LEVEL   │ ← font-mono text-label text-umbra-muted
│ 18           │ ← font-display text-lg text-umbra-lilac tabular-nums
└──────────────┘
```

Base: `rounded-lg border border-white/[.04] bg-white/[.025] p-3`

**Replaces:** All `bg-white/[.035]` inline stat boxes across dashboard cards.

### 3.5 `<Pill>`

**File:** `components/ui/pill.tsx`

```tsx
<Pill tone="emerald">Active</Pill>
<Pill tone="rose">Rushed 75%</Pill>
```

| Tone | Border | Background | Text |
|---|---|---|---|
| `purple` | `border-umbra-purple/40` | `bg-umbra-purple/10` | `text-umbra-purple` |
| `amber` | `border-amber-400/40` | `bg-amber-400/10` | `text-amber-300` |
| `emerald` | `border-emerald-400/40` | `bg-emerald-400/10` | `text-emerald-300` |
| `rose` | `border-rose-400/40` | `bg-rose-400/10` | `text-rose-300` |
| `muted` | `border-umbra-line` | `bg-umbra-surface/40` | `text-umbra-muted` |

Base: `rounded-full px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider`

**Replaces:** All inline badge/pill styles across components.

---

## 4. CSS Utilities

### 4.1 Add to `globals.css` `@layer components`

```css
/* Level 1 — panel (card surface). Replaces .glass for new components. */
.panel {
  @apply rounded-2xl border border-umbra-line bg-umbra-surface/40 shadow-lg backdrop-blur-md;
}

/* Level 2 — inner tile (stat box inside a panel) */
.tile {
  @apply rounded-lg border border-white/[.04] bg-white/[.025] p-3;
}

/* Hover scale — only 2 values */
.hover-subtle {
  @apply transition hover:bg-white/[.04];
}
.hover-emphasis {
  @apply transition hover:bg-white/[.08];
}
```

### 4.2 Keep existing utilities

- `.glass` — kept for backward compat (alias of `.panel` without accent)
- `.focus-ring` — unchanged
- `.select-input` — unchanged
- `.th-badge` / `.th-high` / `.th-mid` / `.th-low` / `.th-base` / `.th-unknown` — unchanged

### 4.3 Tailwind config changes

```ts
// No new color tokens needed. The accent colors (amber, yellow, emerald,
// sky, rose) are all built-in Tailwind colors already available.
// Only change: bump umbra-muted slightly for better small-text contrast.
umbra: {
  muted: "#B8ACD4",  // was #A89CC4 — slightly lighter for text-xs and below
}
```

---

## 5. Page-by-Page Refactor

### 5.1 Dashboard (`/`)

| Component | Current | New |
|---|---|---|
| `clan-identity-card.tsx` | `.glass` + inline stat rows | `<Panel accent="purple">` + `<StatTile>` |
| `war-record-card.tsx` | `.glass` + `bg-white/[.035]` tiles | `<Panel accent="amber">` + `<StatTile>` |
| `current-war-card.tsx` | `.glass` + `bg-white/[.035]` tiles | `<Panel accent="amber">` + `<StatTile>` |
| `capital-summary-card.tsx` | `.glass` + `bg-white/[.035]` tiles | `<Panel accent="yellow">` + `<StatTile>` |
| `donation-analytics.tsx` | `.glass` + inline rows | `<Panel accent="emerald">` + `.hover-subtle` rows |
| `activity-analytics.tsx` | `.glass` + inline rows | `<Panel accent="emerald">` + `.hover-subtle` rows |
| `needs-attention.tsx` | `.glass` + `bg-white/[.035]` rows | `<Panel accent="rose">` + `.hover-subtle` rows |
| `clan-log.tsx` | `.glass` + `bg-white/[.035]` rows | `<Panel accent="purple">` + `.hover-subtle` rows + alternating rows |
| `nav-summaries.tsx` | `.glass` + inline | `<Panel>` per summary |
| `hall-of-fame-link.tsx` | `.glass` inline link | `<Panel accent="purple">` wrapping a `<Button variant="ghost">` |
| All inline buttons | 8+ variants | `<Button>` component |
| All eyebrows | 37+ inline | `<Eyebrow>` component |

### 5.2 Members (`/members`)

| Component | Current | New |
|---|---|---|
| `members-roster.tsx` | `.glass` table + `hover:bg-white/[.04]` | `<Panel accent="sky">` + `.hover-subtle` rows + alternating rows |
| `member-detail-sheet.tsx` | Inline sections + `bg-white/[.035]` | `<Panel>` per section + `<StatTile>` for profile stats |
| `score-leaderboard.tsx` | Inline badge styles | `<Pill>` component |

### 5.3 War (`/war`)

| Component | Current | New |
|---|---|---|
| `war-hero.tsx` | `.glass` + inline | `<Panel accent="amber">` |
| `war-rosters.tsx` | `.glass` + inline | `<Panel accent="amber">` |
| `war-attack-log.tsx` | `.glass` + inline | `<Panel accent="amber">` |
| `war-history.tsx` | `.glass` + inline | `<Panel accent="amber">` |
| `cwl-league-view.tsx` | `.glass` + inline | `<Panel accent="amber">` |
| `war-refresh-button.tsx` | Inline button | `<Button variant="ghost" size="md" icon={<IconSync />}>` |

### 5.4 Capital (`/capital`)

| Component | Current | New |
|---|---|---|
| `capital-overview-card.tsx` | `.glass` + inline | `<Panel accent="yellow">` + `<StatTile>` |
| `district-list.tsx` | `.glass` + inline | `<Panel accent="yellow">` |
| `raid-timer-banner.tsx` | `.glass` + inline | `<Panel accent="yellow">` + `<StatTile>` for countdown |
| `raid-history.tsx` | `.glass` + inline | `<Panel accent="yellow">` + `.hover-subtle` rows |
| `upgrade-timeline.tsx` | `.glass` + inline | `<Panel accent="yellow">` |
| `raid-pending-card.tsx` | `.glass` + `<EmptyState>` | `<Panel>` + `<EmptyState>` |

### 5.5 Hall of Fame (`/hall-of-fame`)

| Component | Current | New |
|---|---|---|
| `hall-of-fame-shell.tsx` | `<PageScaffold>` + inline sections | `<Eyebrow>` + `<Panel accent="purple">` per section |
| `record-card.tsx` | Inline card + inline rows | `<Panel>` + `.hover-subtle` rows + `<Pill>` for rank badges |

---

## 6. Interactivity Layer

### 6.1 Framer Motion setup

Install `framer-motion` (if not already in package.json).

### 6.2 Animations

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Page transition | `opacity: 0 → 1` | 150ms | `ease-out` |
| Card mount | `opacity: 0 → 1` + `translateY: 8px → 0` | 200ms | `ease-out` |
| Card hover | `border-color` brighten + `translateY: 0 → -1px` | 150ms | `ease` |
| Row hover | `bg` change + left accent bar (`width: 0 → 2px`) | 100ms | `ease` |
| Button hover | `scale: 1 → 1.02` | 100ms | `ease` |
| Button press | `scale: 1.02 → 0.98` | 50ms | `ease` |
| Tab switch | `layoutId` underline slide | 200ms | `spring` |
| Modal open | `scale: 0.95 → 1` + `opacity: 0 → 1` | 150ms | `ease-out` |
| Modal close | `scale: 1 → 0.95` + `opacity: 1 → 0` | 100ms | `ease-in` |
| Stat count-up | Number animates from previous value | 300ms | `ease-out` |
| Loading skeleton | Shimmer (`bg-gradient` slide) | 1.5s loop | `linear` |

### 6.3 Reduced motion

All animations check `prefers-reduced-motion: reduce`:
```tsx
const prefersReducedMotion = useReducedMotion();
// If true, disable all transforms + scale. Keep opacity transitions (they're
// not motion). Duration → 0ms.
```

---

## 7. Readability Pass

| Issue | Fix | Scope |
|---|---|---|
| `text-umbra-muted` (#A89CC4) low contrast at 9-10px | Bump to `#B8ACD4` in tailwind.config.ts | Global |
| `text-xs` and `text-sm` mixed for same content | Standardize: titles=`text-sm`, subtitles=`text-xs`, stats=`font-display text-lg` | All components |
| Numeric displays not tabular | Add `tabular-nums` to all `<StatTile>` + countdowns + stat values | All components |
| Long names truncated inconsistently | Standardize `truncate` + `title={name}` tooltip | Leaderboards, roster, clan log |
| Dense leaderboards hard to scan | Add `even:bg-white/[.015]` to alternating rows | HoF cards, clan log, contribution table |
| Card padding inconsistent (p-4 vs p-5 vs p-6) | Standardize: panels = `p-5`, tiles = `p-3` | All cards |
| Gap between grid items inconsistent (gap-4 vs gap-5) | Standardize: `gap-4` for card grids, `gap-2` for tile grids | All grids |

---

## 8. Execution Checklist

### Phase A: Foundation

- [ ] A1. Install `framer-motion` if not present
- [ ] A2. Add `.panel`, `.tile`, `.hover-subtle`, `.hover-emphasis` to `globals.css`
- [ ] A3. Update `tailwind.config.ts`: bump `umbra.muted` to `#B8ACD4`
- [ ] A4. Create `components/ui/button.tsx` (`<Button>`)
- [ ] A5. Create `components/ui/eyebrow.tsx` (`<Eyebrow>`)
- [ ] A6. Create `components/ui/panel.tsx` (`<Panel>`)
- [ ] A7. Create `components/ui/stat-tile.tsx` (`<StatTile>`)
- [ ] A8. Create `components/ui/pill.tsx` (`<Pill>`)
- [ ] A9. Run `bun run typecheck && bun run lint` — verify clean

### Phase B: Navigation redesign

- [ ] B1. Rewrite `components/navigation.tsx` — desktop sidebar per §2.2-2.3
- [ ] B2. Rewrite mobile bottom bar per §2.4-2.5 (add safe-area padding)
- [ ] B3. Add per-page active accent colors per §2.6
- [ ] B4. Replace `<img>` logo with `<Image>` component
- [ ] B5. Move collapse toggle to bottom of sidebar
- [ ] B6. Update nav item radius from `rounded-[10px]` to `rounded-lg`
- [ ] B7. Browser-verify desktop + mobile layouts

### Phase C: Dashboard refactor

- [ ] C1. Refactor `clan-identity-card.tsx` → `<Panel>` + `<StatTile>` + `<Eyebrow>`
- [ ] C2. Refactor `war-record-card.tsx` → `<Panel accent="amber">` + `<StatTile>`
- [ ] C3. Refactor `current-war-card.tsx` → `<Panel accent="amber">` + `<StatTile>`
- [ ] C4. Refactor `capital-summary-card.tsx` → `<Panel accent="yellow">` + `<StatTile>`
- [ ] C5. Refactor `donation-analytics.tsx` → `<Panel accent="emerald">` + `.hover-subtle`
- [ ] C6. Refactor `activity-analytics.tsx` → `<Panel accent="emerald">` + `.hover-subtle`
- [ ] C7. Refactor `needs-attention.tsx` → `<Panel accent="rose">` + `.hover-subtle`
- [ ] C8. Refactor `clan-log.tsx` → `<Panel accent="purple">` + `.hover-subtle` + alternating rows
- [ ] C9. Refactor `nav-summaries.tsx` → `<Panel>` per summary
- [ ] C10. Replace all inline buttons with `<Button>`
- [ ] C11. Replace all inline eyebrows with `<Eyebrow>`
- [ ] C12. Replace all inline badges with `<Pill>`
- [ ] C13. Browser-verify dashboard

### Phase D: Other pages

- [ ] D1. Refactor members roster → `<Panel accent="sky">` + `.hover-subtle`
- [ ] D2. Refactor member detail sheet → `<Panel>` per section + `<StatTile>`
- [ ] D3. Refactor war hero → `<Panel accent="amber">`
- [ ] D4. Refactor war rosters/attack-log/history → `<Panel accent="amber">`
- [ ] D5. Refactor capital overview → `<Panel accent="yellow">` + `<StatTile>`
- [ ] D6. Refactor capital raid-history → `<Panel accent="yellow">` + `.hover-subtle`
- [ ] D7. Refactor capital raid-timer-banner → `<Panel accent="yellow">`
- [ ] D8. Refactor HoF shell → `<Eyebrow>` + `<Panel accent="purple">`
- [ ] D9. Refactor record-card → `<Panel>` + `.hover-subtle` + `<Pill>` for rank badges
- [ ] D10. Browser-verify all pages

### Phase E: Interactivity

- [ ] E1. Add Framer Motion page transition wrapper in `app/layout.tsx`
- [ ] E2. Add card mount animation (`opacity` + `translateY`)
- [ ] E3. Add card hover lift (`translateY: -1px` + border brighten)
- [ ] E4. Add row hover left-accent bar
- [ ] E5. Add button hover scale (`1.02`)
- [ ] E6. Add tab underline slide (`layoutId`)
- [ ] E7. Add modal open/close animation
- [ ] E8. Add count-up animation for `<StatTile>`
- [ ] E9. Add skeleton shimmer loading states
- [ ] E10. Add `prefers-reduced-motion` guards
- [ ] E11. Browser-verify all animations

### Phase F: Polish

- [ ] F1. Add `tabular-nums` to all numeric displays
- [ ] F2. Standardize `truncate` + `title` tooltip on all name displays
- [ ] F3. Add `even:bg-white/[.015]` alternating rows on all leaderboards
- [ ] F4. Standardize card padding: panels=`p-5`, tiles=`p-3`
- [ ] F5. Standardize grid gaps: cards=`gap-4`, tiles=`gap-2`
- [ ] F6. Final color contrast pass (WCAG AA check)
- [ ] F7. Final `bun run typecheck && bun run lint && bun run test`
- [ ] F8. Final browser smoke test on all 5 pages

---

## Verification

After each phase:
1. `bun run typecheck` — must pass
2. `bun run lint` — 0 new errors
3. `bun run test` — 147/147 pass
4. Agent Browser smoke test — page renders, no console errors

After Phase F:
5. Mobile 375px viewport test
6. Desktop 1920px viewport test
7. Keyboard navigation test (tab order, focus visible)
8. Color contrast WCAG AA verification

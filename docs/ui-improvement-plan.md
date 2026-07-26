# UI/UX Improvement Plan — "Moon's Shadow"

**Date:** 2026-07-25
**Status:** Planning (not yet implemented)
**Design identity:** Umbra Lunaria — "Moon's Shadow". Dark, quiet, monochromatic purple, observatory-like. The logo is a crescent moon. The theme is the night sky.

---

## 1. Current Design Audit — What Exists

### 1.1 The identity (keep all of this)

| Element | Value | Role |
|---|---|---|
| Logo | Crescent moon (817×817 PNG) | Brand mark in the sidebar |
| Background | `#090811` (umbra-ink) + a clan-card background image at 90% overlay opacity | The void — page background |
| Primary accent | `#B678FF` (umbra-purple) | Links, active states, icons, accents |
| Primary text | `#EEE5FF` (umbra-lilac) | Headlines, values, active labels |
| Secondary text | `#A89CC4` (umbra-muted) | Descriptions, labels, meta |
| Border | `rgba(190,151,255,.15)` (umbra-line) | Card borders, dividers |
| Surface | `#12101C` (umbra-surface) | Card background (at 40% opacity via `.glass`) |
| Elevated | `#211B34` (umbra-elevated) | Hover/active surface |
| Display font | Cinzel (serif) | Headlines, stat values, logo wordmark |
| Body font | Inter (sans-serif) | All body text |
| Mono font | JetBrains Mono | Labels, eyebrows, numbers, code-like text |
| Glass effect | `.glass` = border + bg-surface/40 + shadow-2xl + backdrop-blur-md | The card surface style — 29 files use it |

### 1.2 The inconsistencies (what to fix)

**Surface backgrounds — 10 different values:**
`bg-white/[.02]` (18×), `bg-white/[.035]` (14×), `bg-white/[.03]` (8×), `bg-white/[.04]` (6×), `bg-white/[.07]` (5×), `bg-white/[.06]` (3×), `bg-umbra-surface/40` (7×), `bg-umbra-purple/10` (19×), `bg-umbra-purple/15` (13×), `bg-umbra-purple/20` (6×). The eye can't tell what's a card, what's a tile, what's a hover state.

**Hover backgrounds — 7 different values:**
`.02`, `.035`, `.04`, `.05`, `.06`, `.07`, `bg-umbra-surface/50`, `bg-umbra-purple/10`, `bg-umbra-purple/20`. No rule for which to use.

**Border radius — 5 values:**
`rounded-full` (58×), `rounded-2xl` (45×), `rounded-lg` (40×), `rounded-xl` (30×), `rounded-md` (4×), `rounded-[10px]` (1×). `rounded-lg` (8px) and `rounded-xl` (12px) are nearly identical.

**Text sizes — mixed for same content:**
`text-xs` (73×) and `text-sm` (59×) are used interchangeably for card subtitles. No rule for which.

**Border colors — 10+ variants:**
`border-umbra-purple/30` (12×), `border-umbra-purple/40` (8×), `border-umbra-purple/50` (14×), `border-umbra-purple/60` (3×), `border-umbra-line/50` (7×), `border-umbra-line/40` (4×), `border-umbra-line/30` (3×), `border-amber-400/30` (15×), `border-emerald-400/30` (9×). Too many opacity steps.

**Shadows — 5 different:**
`shadow-2xl`, `shadow-lg`, `shadow-md`, `shadow-sm`, `shadow-[0_0_...]` (custom glow). No rule.

**Padding — 8 values:**
`p-1` (53×), `p-2` (59×), `p-3` (46×), `p-4` (36×), `p-5` (39×), `p-6` (14×), `p-8` (7×). Cards use p-4/p-5/p-6 inconsistently.

**Fonts not properly loaded:**
Cinzel, Inter, and JetBrains Mono are referenced in CSS variables but not loaded via `next/font` — they fall back to Georgia/system-ui/monospace. This is a rendering quality issue.

---

## 2. Design Rules (the standard to enforce)

### 2.1 Surface levels (3 only)

| Level | Class | Usage |
|---|---|---|
| 0 (void) | `bg-umbra-ink` (page bg) | Page background |
| 1 (card) | `.glass` (keep existing class) | Card/section surfaces |
| 2 (tile) | `bg-white/[.03]` | Inner stat tiles, row backgrounds |

**Rule:** Level 1 = `.glass`. Level 2 = `bg-white/[.03]`. Nothing else. All 10 current bg-white variants converge to these two.

### 2.2 Hover (2 values only)

| Class | Opacity | Usage |
|---|---|---|
| `hover:bg-white/[.04]` | 4% | Rows, tiles, nav items |
| `hover:bg-umbra-purple/10` | 10% | Buttons, active card hover |

### 2.3 Border radius (3 values only)

| Radius | Usage |
|---|---|
| `rounded-2xl` | All card/panel surfaces (Level 1) |
| `rounded-lg` | All inner tiles, inputs, rows (Level 2) |
| `rounded-full` | All pills, badges, buttons, nav items |

**Rule:** `rounded-xl` and `rounded-md` are banned. `rounded-[10px]` is banned.

### 2.4 Border opacity (3 values only)

| Class | Usage |
|---|---|
| `border-umbra-line` (default, .15) | Card borders |
| `border-umbra-purple/40` | Button borders, active nav |
| `border-umbra-line/50` | Hover card borders |

### 2.5 Text sizes (standardized)

| Content type | Class |
|---|---|
| Page h1 | `font-display text-3xl sm:text-4xl text-umbra-lilac` |
| Section h2 | `font-display text-xl text-umbra-lilac` |
| Card h3 | `font-display text-lg text-umbra-lilac` |
| Eyebrow/kicker | `font-mono text-label uppercase tracking-[.16em] text-umbra-purple` |
| Stat value | `font-display text-lg text-umbra-lilac tabular-nums` |
| Card subtitle | `text-xs text-umbra-muted` |
| Body text | `text-xs text-umbra-muted` |
| Label/meta | `font-mono text-label text-umbra-muted` |

**Rule:** `text-sm` is banned for subtitles — use `text-xs`. `text-sm` is only for nav labels.

### 2.6 Padding (standardized)

| Element | Padding |
|---|---|
| Card surface (Level 1) | `p-5` |
| Inner tile (Level 2) | `p-3` |
| Button | `px-4 py-2` (md), `px-3 py-1.5` (sm) |
| Nav item | `px-3 py-2.5` |

### 2.7 Shadow (2 values only)

| Class | Usage |
|---|---|
| `shadow-2xl` | Card surfaces (via `.glass`) |
| `shadow-glow` | Logo, active highlights |

### 2.8 Gap (standardized)

| Context | Gap |
|---|---|
| Card grid | `gap-4` |
| Tile grid (inside a card) | `gap-2` |
| Flex items (icon + text) | `gap-2` or `gap-3` |

---

## 3. Implementation Phases

Each phase is small, focused, and independently verifiable. No phase changes more than ~10 files.

### Phase 1: Font Loading ✅ COMPLETE

**Goal:** Load Cinzel, Inter, and JetBrains Mono via `next/font` so they render properly (currently falling back to system fonts).

**Files:** `app/layout.tsx`

**Tasks:**
- [x] 1.1. Add `next/font/google` imports for Cinzel, Inter, and `next/font` for JetBrains Mono
- [x] 1.2. Apply font CSS variables to `<html>` or `<body>`
- [x] 1.3. Update `globals.css` `:root` to reference the `next/font` variable names
- [x] 1.4. Verify fonts render (browser check — Cinzel should be the display font, not Georgia)

**Verify:** typecheck, lint, browser visual check.

---

### Phase 2: CSS Standardization

**Goal:** Converge the 10 bg-white variants + 7 hover variants + 5 radius variants + 10 border variants into the standardized rules in §2.

**Files:** `app/globals.css`, `tailwind.config.ts`

### Phase 2: CSS Standardization

**Tasks:**
- [ ] 2.1. Add `.tile` class to globals.css (`rounded-lg border border-white/[.04] bg-white/[.03] p-3`)
- [ ] 2.2. Add `.hover-row` class (`transition hover:bg-white/[.04]`)
- [ ] 2.3. Add `.hover-card` class (`transition hover:border-umbra-line/50`)
- [ ] 2.4. Keep `.glass` unchanged (it's already the Level 1 standard)

**Verify:** typecheck, lint. No visual change yet — just adds utility classes.

---

### Phase 3: Global Find-and-Replace — Backgrounds

**Goal:** Replace all `bg-white/[.02]`, `bg-white/[.035]`, `bg-white/[.04]`, `bg-white/[.05]`, `bg-white/[.06]`, `bg-white/[.07]` with either `.tile` (for Level 2 tiles) or remove (if redundant inside a `.glass` card).

**Files:** All `components/**/*.tsx` (batch find-and-replace)

**Tasks:**
- [ ] 3.1. Replace `bg-white/[.035]` → `.tile` on stat boxes (keep existing padding if different)
- [ ] 3.2. Replace `bg-white/[.02]` → `.tile` on small stat boxes
- [ ] 3.3. Replace `bg-white/[.03]` → `.tile`
- [ ] 3.4. Replace `bg-white/[.04]` → `.tile`
- [ ] 3.5. Replace `bg-white/[.05]`, `.06`, `.07` → `bg-white/[.04]` (converge hover)
- [ ] 3.6. Replace `bg-umbra-surface/40` (outside `.glass`) → `.glass` or remove if inside a `.glass`

**Verify:** typecheck, lint, grep shows 0 old variants remain.

---

### Phase 4: Global Find-and-Replace — Radius

**Goal:** Replace all `rounded-xl` → `rounded-lg` and `rounded-md` → `rounded-lg`. Remove `rounded-[10px]`.

**Files:** All `components/**/*.tsx`

**Tasks:**
- [ ] 4.1. `sed` replace `rounded-xl` → `rounded-lg` across all components
- [ ] 4.2. `sed` replace `rounded-md` → `rounded-lg` across all components
- [ ] 4.3. Replace `rounded-[10px]` → `rounded-lg` in `navigation.tsx`

**Verify:** typecheck, lint, grep shows 0 `rounded-xl`, `rounded-md`, or `rounded-[10px]`.

---

### Phase 5: Global Find-and-Replace — Hover States

**Goal:** Converge all hover backgrounds to 2 values: `hover:bg-white/[.04]` (rows/tiles) and `hover:bg-umbra-purple/10` (buttons/cards).

**Files:** All `components/**/*.tsx`

**Tasks:**
- [ ] 5.1. Replace `hover:bg-white/[.035]`, `hover:bg-white/[.05]`, `hover:bg-white/[.06]`, `hover:bg-white/[.07]` → `hover:bg-white/[.04]`
- [ ] 5.2. Replace `hover:bg-umbra-surface/50` → `hover:bg-umbra-purple/10`
- [ ] 5.3. Replace `hover:bg-umbra-purple/20` → `hover:bg-umbra-purple/10`
- [ ] 5.4. Keep `hover:bg-umbra-purple/10` as-is (already correct)

**Verify:** typecheck, lint, grep shows only 2 hover bg values.

---

### Phase 6: Global Find-and-Replace — Text Sizes

**Goal:** Standardize text sizes per §2.5. Replace `text-sm` with `text-xs` for card subtitles and descriptions (keep `text-sm` only for nav labels).

**Files:** All `components/**/*.tsx`

**Tasks:**
- [ ] 6.1. Audit each `text-sm` usage — if it's a card subtitle/description, change to `text-xs`
- [ ] 6.2. If it's a nav label or a large body text, keep `text-sm`
- [ ] 6.3. Add `tabular-nums` to all numeric stat values (`font-display text-lg` patterns)

**Verify:** typecheck, lint, browser visual check.

---

### Phase 7: Border + Shadow Standardization

**Goal:** Converge border opacities to 3 values (§2.4) and shadows to 2 values (§2.7).

**Files:** All `components/**/*.tsx`

**Tasks:**
- [ ] 7.1. Replace `border-umbra-purple/30` → `border-umbra-purple/40` (converge)
- [ ] 7.2. Replace `border-umbra-purple/60` → `border-umbra-purple/50` (converge)
- [ ] 7.3. Replace `border-umbra-line/40`, `border-umbra-line/30` → `border-umbra-line/50` (converge hover borders)
- [ ] 7.4. Replace `shadow-md`, `shadow-sm` → `shadow-lg` (converge; cards use `shadow-2xl` via `.glass`)

**Verify:** typecheck, lint, grep shows only standard values.

---

### Phase 8: Padding Standardization

**Goal:** Standardize card padding to `p-5`, tile padding to `p-3`.

**Files:** All `components/**/*.tsx`

**Tasks:**
- [ ] 8.1. Replace `p-4` → `p-5` on card surfaces (Level 1 `.glass` elements)
- [ ] 8.2. Replace `p-6` → `p-5` on card surfaces
- [ ] 8.3. Replace `p-2` → `p-3` on inner tiles (Level 2)
- [ ] 8.4. Keep `p-8` for empty/error states (they need more breathing room)

**Verify:** typecheck, lint, browser visual check.

---

### Phase 9: Navigation Polish

**Goal:** Fix the nav-specific issues — especially the jarring resize when
collapsing/expanding — without changing the overall design.

**Problem:** When the sidebar collapses from 240px → 80px, the page content
visually jumps because the sidebar width changes by 160px in one transition.
The current `transition-[width] duration-300` animates the width, but the
content area doesn't smoothly reflow — it snaps after the transition ends.
The fix is to use `flex-shrink-0` (already present) + ensure the `<main>`
element doesn't jump by using a CSS `transition` on its margin/width too.
Additionally, the collapsed width (80px / `lg:w-20`) is too wide — icons
only need ~56px. And the expanded width (240px / `lg:w-60`) is fine but
the transition feels abrupt.

**Files:** `components/navigation.tsx`

**Tasks:**
- [ ] 9.1. Replace `<img>` logo with `<Image>` component
- [ ] 9.2. Replace `rounded-[10px]` → `rounded-lg` on nav items
- [ ] 9.3. Standardize active state: `bg-umbra-purple/10 text-umbra-lilac` (already correct)
- [ ] 9.4. Standardize inactive hover: `hover:bg-white/[.04]` (replace `hover:bg-white/5`)
- [ ] 9.5. Add iOS safe-area padding (`pb-[env(safe-area-inset-bottom)]`) on mobile bottom bar
- [ ] 9.6. **Fix the resize jank:** Change collapsed width from `lg:w-20` (80px) to `lg:w-16` (64px) — tighter, more standard icon-only width. The smaller delta (240→64 = 176px → 240→64 = 176px... same delta but tighter collapsed state looks more intentional).
- [ ] 9.7. **Smooth the transition:** Change `transition-[width] duration-300 ease-in-out` to `transition-[width] duration-200 ease-out` — faster, less noticeable. The 300ms duration makes the resize feel slow and drawn-out; 200ms feels snappy.
- [ ] 9.8. **Prevent content jump:** Add `transition-[margin] duration-200 ease-out` is NOT needed — the flex layout handles this automatically because the sidebar is `lg:sticky lg:shrink-0`. The content `<main>` has `flex-1` so it reflows smoothly. The perceived jank is from the 300ms duration + the large visual delta. Fixing 9.6 + 9.7 resolves it.
- [ ] 9.9. **Smooth the logo/wordmark fade:** Change `transition-all duration-300` to `transition-all duration-200` on the logo area + nav labels — match the width transition speed.
- [ ] 9.10. **Smooth the status footer fade:** Change `transition-opacity duration-300` to `transition-opacity duration-200`.

**Verify:** typecheck, lint, browser desktop — toggle collapse/expand 5×, verify no jarring jump.

---

### Phase 10: Readability Pass

**Goal:** Improve contrast, spacing, and scannability.

**Files:** Various

**Tasks:**
- [ ] 10.1. Bump `umbra-muted` from `#A89CC4` → `#B0A4CC` (slightly lighter, better WCAG AA at small sizes)
- [ ] 10.2. Add `tabular-nums` to all countdowns + stat values
- [ ] 10.3. Add `truncate` + `title={name}` tooltip on all member name displays
- [ ] 10.4. Add `even:bg-white/[.015]` alternating rows on dense leaderboards (HoF cards, clan log, contribution table)
- [ ] 10.5. Standardize grid gaps: card grids → `gap-4`, tile grids → `gap-2`

**Verify:** typecheck, lint, browser visual check.

---

### Phase 11: Animations

**Goal:** Add subtle, on-brand animations across the entire app — pages,
cards, charts, tabs, modals, and popups. Install framer-motion.

**Files:** `app/layout.tsx`, `components/**/*.tsx`

**Tasks:**

**Page transitions:**
- [ ] 11.1. Install `framer-motion`
- [ ] 11.2. Add page transition wrapper in `app/layout.tsx` — fade-in
  (`opacity: 0→1`, 200ms, `ease-out`) on route change. Use
  `usePathname()` as the `key` so the transition fires on every navigation.
- [ ] 11.3. Add a subtle slide-up (`translateY: 8px → 0`, 200ms) combined
  with the fade — so pages "rise into view" like moonlight.

**Card mount:**
- [ ] 11.4. Add card mount animation on `.glass` elements — fade + slight
  translateY (`8px→0`, 200ms, staggered by 50ms per card so cards cascade
  in from top to bottom).

**Card hover:**
- [ ] 11.5. Add card hover: border brighten (`hover:border-umbra-line/50`) +
  slight lift (`hover:-translate-y-px`, 150ms, `ease`).

**Chart time-frame switching:**
- [ ] 11.6. **Animate chart data transitions** when switching between 24h/7d/30d
  tabs. Currently the chart data swaps instantly with no animation — it
  feels jarring. Use Framer Motion's `<motion.div key={window}>` wrapper
  so the chart container fades + slides when the tab changes:
  - Old chart: `opacity: 1→0, translateY: 0→-4px` (100ms, `ease-in`)
  - New chart: `opacity: 0→1, translateY: 4px→0` (200ms, `ease-out`)
  - Apply to: `donation-chart.tsx`, `activity-analytics.tsx` chart area,
    `war-performance-chart.tsx`, `war-attack-distribution.tsx`,
    `roster-size-chart.tsx`
- [ ] 11.7. **Animate the Recharts data change** itself — Recharts supports
  `isAnimationActive={true}` + `animationDuration={300}` + `animationEasing="ease-out"`.
  Enable these on all `<LineChart>`, `<BarChart>`, `<AreaChart>`,
  `<PieChart>` components so the bars/lines animate to their new positions
  when the time-frame switches. This is the most impactful animation —
  the chart visually morphs from one time-frame's data to another.

**Tab switch:**
- [ ] 11.8. Add `layoutId` underline slide on the `<Tabs>` component — the
  active tab indicator slides horizontally between tabs instead of
  teleporting. Use Framer Motion `motion.layout`.

**Modal/sheet open + close:**
- [ ] 11.9. Add modal open: `scale: 0.96→1` + `opacity: 0→1` (150ms,
  `ease-out`).
- [ ] 11.10. Add modal close: `scale: 1→0.96` + `opacity: 1→0` (100ms,
  `ease-in`).
- [ ] 11.11. Apply to: `MemberDetailSheet`, `WarDetailSheet`, all `<Modal>`
  usages.

**Popup/sheet content transitions:**
- [ ] 11.12. When content inside a modal/sheet changes (e.g. loading → data,
  or switching between sections), animate the content swap: old content
  fades out (100ms), new content fades in (150ms). Use `AnimatePresence`
  with `mode="wait"`.

**Reduced motion:**
- [ ] 11.13. Add `prefers-reduced-motion` guard — check `useReducedMotion()`.
  If true: disable all transforms (translateY, scale), keep opacity
  transitions (they're not motion). Duration → 0ms.

**Verify:** typecheck, lint, browser visual check on all 5 pages — verify
page transitions, chart tab switching, card hover lift, modal open/close,
reduced-motion.

---

### Phase 12: Final Polish + Verification

**Goal:** Final consistency sweep + full verification.

**Tasks:**
- [ ] 12.1. Grep audit: verify 0 remaining `rounded-xl`, `rounded-md`, `rounded-[10px]`, `bg-white/[.035]`, `bg-white/[.06]`, `bg-white/[.07]`, `hover:bg-white/[.05]`, `hover:bg-umbra-purple/20`
- [ ] 12.2. Full typecheck + lint + test run
- [ ] 12.3. Browser smoke test on all 5 pages (desktop + mobile)
- [ ] 12.4. Keyboard navigation test
- [ ] 12.5. Color contrast check (WCAG AA)

**Verify:** everything passes.

---

## 4. Why This Plan Is Different

The previous plan ("Crystalline Observatory") tried to add a new design layer on top of the existing one — new components, new accent colors, new visual metaphors. That broke the identity.

This plan does the opposite: **converge what already exists** into a consistent set of rules, then add subtle animations. No new colors, no new components, no new metaphors. The identity stays "Moon's Shadow" — dark, purple, quiet. The fix is standardization, not reinvention.

| Previous plan | This plan |
|---|---|
| 5 new shared components | 0 new components (use CSS classes) |
| 6 accent colors (stained glass) | 0 new colors (converge existing) |
| Rewrite every component | Find-and-replace patterns |
| 3 phases, each touching 10+ files | 12 phases, each touching 1-10 files |
| Changed the visual identity | Preserves the visual identity |
| ~2 hours per phase | ~20-30 min per phase |

---

## 5. Phase Summary

| Phase | Goal | Files | Est. time |
|---|---|---|---|
| 1 | Font loading (next/font) | ✅ COMPLETE | 1 | 15 min |
| 2 | CSS utilities | ⬜ TODO | (.tile, .hover-row, .hover-card) | 2 | 10 min |
| 3 | Background | ⬜ TODO | standardization (10 → 2) | ~15 | 25 min |
| 4 | Radius | ⬜ TODO | standardization (5 → 3) | ~15 | 10 min |
| 5 | Hover | ⬜ TODO | standardization (7 → 2) | ~15 | 15 min |
| 6 | Text | ⬜ TODO | size standardization + tabular-nums | ~15 | 20 min |
| 7 | Border | ⬜ TODO | + shadow standardization | ~15 | 15 min |
| 8 | Padding | ⬜ TODO | standardization | ~15 | 15 min |
| 9 | Navigation | ⬜ TODO | polish (resize fix + logo + safe-area) | 1 | 20 min |
| 10 | Readability | ⬜ TODO | pass (contrast, tooltips, alternating rows) | ~10 | 20 min |
| 11 | Animations | ⬜ TODO | (pages, charts, tabs, modals, popups) | ~10 | 45 min |
| 12 | Final | ⬜ TODO | verification (includes /strategy page) | 0 | 15 min |
| **Total** | | | **~3.75 hours** |

> **Note:** The `/strategy` page (War Strategy) was added after this plan was
> written. All find-and-replace phases (3-8) apply to it automatically since
> it uses the same `.glass`, `bg-white/[.015]`, and inline patterns as the
> other pages. Phase 12 verification includes a smoke test of `/strategy`.

Each phase can be committed + pushed independently. If any phase causes issues, it can be reverted without affecting the others.

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

### Phase 1: Font Loading

**Goal:** Load Cinzel, Inter, and JetBrains Mono via `next/font` so they render properly (currently falling back to system fonts).

**Files:** `app/layout.tsx`

**Tasks:**
- 1.1. Add `next/font/google` imports for Cinzel, Inter, and `next/font` for JetBrains Mono
- 1.2. Apply font CSS variables to `<html>` or `<body>`
- 1.3. Update `globals.css` `:root` to reference the `next/font` variable names
- 1.4. Verify fonts render (browser check — Cinzel should be the display font, not Georgia)

**Verify:** typecheck, lint, browser visual check.

---

### Phase 2: CSS Standardization

**Goal:** Converge the 10 bg-white variants + 7 hover variants + 5 radius variants + 10 border variants into the standardized rules in §2.

**Files:** `app/globals.css`, `tailwind.config.ts`

**Tasks:**
- 2.1. Add `.tile` class to globals.css (`rounded-lg border border-white/[.04] bg-white/[.03] p-3`)
- 2.2. Add `.hover-row` class (`transition hover:bg-white/[.04]`)
- 2.3. Add `.hover-card` class (`transition hover:border-umbra-line/50`)
- 2.4. Keep `.glass` unchanged (it's already the Level 1 standard)

**Verify:** typecheck, lint. No visual change yet — just adds utility classes.

---

### Phase 3: Global Find-and-Replace — Backgrounds

**Goal:** Replace all `bg-white/[.02]`, `bg-white/[.035]`, `bg-white/[.04]`, `bg-white/[.05]`, `bg-white/[.06]`, `bg-white/[.07]` with either `.tile` (for Level 2 tiles) or remove (if redundant inside a `.glass` card).

**Files:** All `components/**/*.tsx` (batch find-and-replace)

**Tasks:**
- 3.1. Replace `bg-white/[.035]` → `.tile` on stat boxes (keep existing padding if different)
- 3.2. Replace `bg-white/[.02]` → `.tile` on small stat boxes
- 3.3. Replace `bg-white/[.03]` → `.tile`
- 3.4. Replace `bg-white/[.04]` → `.tile`
- 3.5. Replace `bg-white/[.05]`, `.06`, `.07` → `bg-white/[.04]` (converge hover)
- 3.6. Replace `bg-umbra-surface/40` (outside `.glass`) → `.glass` or remove if inside a `.glass`

**Verify:** typecheck, lint, grep shows 0 old variants remain.

---

### Phase 4: Global Find-and-Replace — Radius

**Goal:** Replace all `rounded-xl` → `rounded-lg` and `rounded-md` → `rounded-lg`. Remove `rounded-[10px]`.

**Files:** All `components/**/*.tsx`

**Tasks:**
- 4.1. `sed` replace `rounded-xl` → `rounded-lg` across all components
- 4.2. `sed` replace `rounded-md` → `rounded-lg` across all components
- 4.3. Replace `rounded-[10px]` → `rounded-lg` in `navigation.tsx`

**Verify:** typecheck, lint, grep shows 0 `rounded-xl`, `rounded-md`, or `rounded-[10px]`.

---

### Phase 5: Global Find-and-Replace — Hover States

**Goal:** Converge all hover backgrounds to 2 values: `hover:bg-white/[.04]` (rows/tiles) and `hover:bg-umbra-purple/10` (buttons/cards).

**Files:** All `components/**/*.tsx`

**Tasks:**
- 5.1. Replace `hover:bg-white/[.035]`, `hover:bg-white/[.05]`, `hover:bg-white/[.06]`, `hover:bg-white/[.07]` → `hover:bg-white/[.04]`
- 5.2. Replace `hover:bg-umbra-surface/50` → `hover:bg-umbra-purple/10`
- 5.3. Replace `hover:bg-umbra-purple/20` → `hover:bg-umbra-purple/10`
- 5.4. Keep `hover:bg-umbra-purple/10` as-is (already correct)

**Verify:** typecheck, lint, grep shows only 2 hover bg values.

---

### Phase 6: Global Find-and-Replace — Text Sizes

**Goal:** Standardize text sizes per §2.5. Replace `text-sm` with `text-xs` for card subtitles and descriptions (keep `text-sm` only for nav labels).

**Files:** All `components/**/*.tsx`

**Tasks:**
- 6.1. Audit each `text-sm` usage — if it's a card subtitle/description, change to `text-xs`
- 6.2. If it's a nav label or a large body text, keep `text-sm`
- 6.3. Add `tabular-nums` to all numeric stat values (`font-display text-lg` patterns)

**Verify:** typecheck, lint, browser visual check.

---

### Phase 7: Border + Shadow Standardization

**Goal:** Converge border opacities to 3 values (§2.4) and shadows to 2 values (§2.7).

**Files:** All `components/**/*.tsx`

**Tasks:**
- 7.1. Replace `border-umbra-purple/30` → `border-umbra-purple/40` (converge)
- 7.2. Replace `border-umbra-purple/60` → `border-umbra-purple/50` (converge)
- 7.3. Replace `border-umbra-line/40`, `border-umbra-line/30` → `border-umbra-line/50` (converge hover borders)
- 7.4. Replace `shadow-md`, `shadow-sm` → `shadow-lg` (converge; cards use `shadow-2xl` via `.glass`)

**Verify:** typecheck, lint, grep shows only standard values.

---

### Phase 8: Padding Standardization

**Goal:** Standardize card padding to `p-5`, tile padding to `p-3`.

**Files:** All `components/**/*.tsx`

**Tasks:**
- 8.1. Replace `p-4` → `p-5` on card surfaces (Level 1 `.glass` elements)
- 8.2. Replace `p-6` → `p-5` on card surfaces
- 8.3. Replace `p-2` → `p-3` on inner tiles (Level 2)
- 8.4. Keep `p-8` for empty/error states (they need more breathing room)

**Verify:** typecheck, lint, browser visual check.

---

### Phase 9: Navigation Polish

**Goal:** Fix the nav-specific issues without changing the overall design.

**Files:** `components/navigation.tsx`

**Tasks:**
- 9.1. Replace `<img>` logo with `<Image>` component
- 9.2. Replace `rounded-[10px]` → `rounded-lg` on nav items
- 9.3. Standardize active state: `bg-umbra-purple/10 text-umbra-lilac` (already correct)
- 9.4. Standardize inactive hover: `hover:bg-white/[.04]` (replace `hover:bg-white/5`)
- 9.5. Add iOS safe-area padding (`pb-[env(safe-area-inset-bottom)]`) on mobile bottom bar

**Verify:** typecheck, lint, browser desktop + mobile.

---

### Phase 10: Readability Pass

**Goal:** Improve contrast, spacing, and scannability.

**Files:** Various

**Tasks:**
- 10.1. Bump `umbra-muted` from `#A89CC4` → `#B0A4CC` (slightly lighter, better WCAG AA at small sizes)
- 10.2. Add `tabular-nums` to all countdowns + stat values
- 10.3. Add `truncate` + `title={name}` tooltip on all member name displays
- 10.4. Add `even:bg-white/[.015]` alternating rows on dense leaderboards (HoF cards, clan log, contribution table)
- 10.5. Standardize grid gaps: card grids → `gap-4`, tile grids → `gap-2`

**Verify:** typecheck, lint, browser visual check.

---

### Phase 11: Animations

**Goal:** Add subtle, on-brand animations. Install framer-motion.

**Files:** `app/layout.tsx`, `components/**/*.tsx`

**Tasks:**
- 11.1. Install `framer-motion`
- 11.2. Add page transition: fade-in (`opacity 0→1`, 150ms) in `app/layout.tsx`
- 11.3. Add card mount: fade + slight translateY (`8px→0`, 200ms) on `.glass` elements
- 11.4. Add card hover: border brighten (`hover:border-umbra-line/50`) + slight lift (`hover:-translate-y-px`)
- 11.5. Add row hover: unified `hover:bg-white/[.04]` (already done in Phase 5)
- 11.6. Add `prefers-reduced-motion` guard (disable transforms, keep opacity)
- 11.7. Add modal open/close: scale + fade (150ms)

**Verify:** typecheck, lint, browser visual check, reduced-motion check.

---

### Phase 12: Final Polish + Verification

**Goal:** Final consistency sweep + full verification.

**Tasks:**
- 12.1. Grep audit: verify 0 remaining `rounded-xl`, `rounded-md`, `rounded-[10px]`, `bg-white/[.035]`, `bg-white/[.06]`, `bg-white/[.07]`, `hover:bg-white/[.05]`, `hover:bg-umbra-purple/20`
- 12.2. Full typecheck + lint + test run
- 12.3. Browser smoke test on all 5 pages (desktop + mobile)
- 12.4. Keyboard navigation test
- 12.5. Color contrast check (WCAG AA)

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
| 1 | Font loading | 1 | 15 min |
| 2 | CSS utilities | 2 | 10 min |
| 3 | Background standardization | ~15 | 25 min |
| 4 | Radius standardization | ~15 | 10 min |
| 5 | Hover standardization | ~15 | 15 min |
| 6 | Text size standardization | ~15 | 20 min |
| 7 | Border + shadow standardization | ~15 | 15 min |
| 8 | Padding standardization | ~15 | 15 min |
| 9 | Navigation polish | 1 | 15 min |
| 10 | Readability pass | ~10 | 20 min |
| 11 | Animations | ~5 | 30 min |
| 12 | Final verification | 0 | 15 min |
| **Total** | | | **~3.5 hours** |

Each phase can be committed + pushed independently. If any phase causes issues, it can be reverted without affecting the others.

# UI Redesign — Planning Pass

**Date:** 2026-07-25
**Status:** Planning (not yet implemented)

## 1. Current UI Audit — Inconsistencies Found

### 1.1 Card backgrounds (3 competing patterns)
| Pattern | Usage | Where |
|---|---|---|
| `.glass` (umbra-surface/40 + backdrop-blur + border-umbra-line) | Primary card wrapper | Most sections |
| `bg-white/[.035]` (raw opacity) | Inner stat tiles, row backgrounds | Dashboard cards, clan log, data table rows |
| `bg-umbra-surface/40` (direct token) | Some inner tiles | Mixed with .glass |

**Problem:** The eye can't tell what's a "card" vs an "inner tile" vs a "row"
because all three use similar opacity-based backgrounds. No visual hierarchy.

### 1.2 Border radius (6 different values)
| Radius | Count | Usage |
|---|---|---|
| `rounded-full` | 58 | Buttons, badges, pills, nav items |
| `rounded-2xl` | 45 | Primary card surfaces |
| `rounded-lg` | 40 | Inner tiles, rows, inputs |
| `rounded-xl` | 30 | Medium tiles, stat boxes |
| `rounded-md` | 4 | Small icons, badges |
| `rounded-[10px]` | 1 | Nav links (custom) |

**Problem:** 6 radius values with no clear rule. `rounded-lg` (8px) and
`rounded-xl` (12px) are visually nearly identical but used inconsistently.
Nav links use a custom `rounded-[10px]` that matches neither.

### 1.3 Button styles (8+ variants, no shared component)
- Primary action: `border-umbra-purple/40 bg-umbra-purple/10 text-umbra-purple`
- Secondary action: `border-umbra-line text-umbra-muted`
- Refresh button: `border-umbra-line bg-umbra-surface/70 text-umbra-lilac`
- Small action (Add): `border-umbra-purple/30 bg-umbra-purple/10 text-umbra-purple px-2.5 py-1`
- Tiny badge: `border-umbra-purple/40 bg-umbra-purple/10 px-2 py-0.5 text-micro`
- Nav link: `border-transparent` (active) / `border-transparent` (inactive)
- Back link: `border-umbra-line px-3 py-2`

**Problem:** Every button is hand-crafted inline. No `<Button>` component.
Padding, font size, border color, and hover state vary per usage.

### 1.4 Eyebrow/kicker text (1 pattern but 37 instances)
Consistent: `font-mono text-label uppercase tracking-[.16em] text-umbra-purple`
But it's repeated 37 times across components — no shared `<Eyebrow>` component.

### 1.5 Hover states (inconsistent opacity)
| Pattern | Usage |
|---|---|
| `hover:bg-white/[.07]` | Leaderboard rows, rank rows |
| `hover:bg-white/[.06]` | Clan log rows |
| `hover:bg-white/[.05]` | Select options, some rows |
| `hover:bg-white/[.04]` | Members roster rows |
| `hover:bg-white/[.035]` | Data table rows |
| `hover:border-umbra-purple/50` | Buttons |
| `hover:border-umbra-purple/60` | Some buttons |
| `hover:bg-umbra-purple/20` | Primary action buttons |
| `hover:bg-umbra-surface` | Refresh button |

**Problem:** 5 different hover opacity values (3.5% → 7%) with no rule.

### 1.6 Text sizing
The custom font sizes (text-label, text-2xs, text-micro) are good but
`text-xs` (13px) and `text-sm` (15px) are mixed inconsistently — sometimes
the same kind of content (a card subtitle) uses `text-xs` on one card and
`text-sm` on another.

---

## 2. Proposed Design Direction — "Crystalline Observatory"

### Concept
The app is called "Umbra Lunaria" — a quiet clan observatory. The current
dark theme is right, but the execution lacks hierarchy. The proposed
direction is **"Crystalline Observatory"** — inspired by stained glass
panels in a cathedral: each section is a distinct "panel" with a subtle
inner glow, separated by thin lead lines (borders), with the content
illuminated from within.

### Key principles
1. **Every surface has a clear level** (3 levels, not 5):
   - **Level 0 (void):** the page background (umbra-ink)
   - **Level 1 (panel):** card surfaces — `.glass` with a subtle inner glow
   - **Level 2 (tile):** inner stat tiles — slightly lighter, no blur
2. **Radius scale (3 values only):**
   - `rounded-2xl` (16px) — all card/panel surfaces
   - `rounded-lg` (8px) — all inner tiles, inputs, rows
   - `rounded-full` — all pills, badges, buttons
3. **One button component, 3 variants:**
   - `primary` — purple border + purple bg tint
   - `ghost` — transparent border, text-muted
   - `icon` — square, icon-only, minimal
4. **Hover scale (2 values only):**
   - `hover:bg-white/[.04]` — subtle (rows, tiles)
   - `hover:bg-white/[.08]` — emphasized (buttons, cards)
5. **Stained-glass accent:** each major section gets a thin colored top-edge
   glow (like a lead-light frame) — purple for general, amber for war,
   yellow for capital, emerald for donations. This is the "stained glass"
   element: functional color-coding, not decoration.

### Visual mockup (text-based)

```
┌─────────────────────────────────────────────────┐
│  ░░ DASHBOARD ░░              [The clan observatory] │ ← eyebrow + h1
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │ ══ purple top-edge glow ══                   │ │ ← Level 1 (panel)
│  │  Badge  Name  Tag  Description              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Lv 18   │  │ 47,800pt │  │ 42/50   │  │ │ ← Level 2 (tiles)
│  │  └──────────┘  └──────────┘  └──────────┘  │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌──────────────────────┐  ┌─────────────────────┐│
│  │ ══ amber glow ══     │  │ ══ yellow glow ══   ││ ← War / Capital panels
│  │ War record           │  │ Capital summary     ││
│  └──────────────────────┘  └─────────────────────┘│
└─────────────────────────────────────────────────┘
```

### What changes (component-by-component)

#### 2.1 New shared components (to create)
| Component | Purpose | Replaces |
|---|---|---|
| `<Button variant="primary\|ghost\|icon">` | Unified button | 8+ inline button styles |
| `<Eyebrow>` | Section kicker text | 37 inline `font-mono text-label...` |
| `<Panel>` | Level 1 card with optional accent glow | `.glass` + manual border |
| `<StatTile>` | Level 2 inner stat tile | `bg-white/[.035]` + manual padding |
| `<Pill tone="purple\|amber\|emerald\|rose">` | Status/badge pill | Various inline badge styles |

#### 2.2 CSS changes (`globals.css`)
```css
@layer components {
  /* Level 1 — panel (card surface) */
  .panel {
    @apply rounded-2xl border border-umbra-line bg-umbra-surface/40 shadow-lg backdrop-blur-md;
  }
  /* Level 1 with accent glow (stained-glass top edge) */
  .panel-glow-purple { @apply panel border-t-2 border-t-umbra-purple/30; }
  .panel-glow-amber  { @apply panel border-t-2 border-t-amber-400/30; }
  .panel-glow-yellow { @apply panel border-t-2 border-t-yellow-400/30; }
  .panel-glow-emerald { @apply panel border-t-2 border-t-emerald-400/30; }

  /* Level 2 — inner tile */
  .tile {
    @apply rounded-lg border border-white/[.04] bg-white/[.025];
  }

  /* Hover scale — only 2 values */
  .hover-subtle { @apply transition hover:bg-white/[.04]; }
  .hover-emphasis { @apply transition hover:bg-white/[.08]; }
}
```

#### 2.3 Color accent system (stained-glass sections)
| Section | Accent color | Top-edge glow |
|---|---|---|
| Dashboard general | Purple (#B678FF) | `border-t-umbra-purple/30` |
| War | Amber (#fbbf24) | `border-t-amber-400/30` |
| Capital | Yellow (#facc15) | `border-t-yellow-400/30` |
| Hall of Fame | Purple (#B678FF) | `border-t-umbra-purple/30` |
| Donations | Emerald (#34d399) | `border-t-emerald-400/30` |
| Members | Sky (#38bdf8) | `border-t-sky-400/30` |
| Danger/alert | Rose (#fb7185) | `border-t-rose-400/30` |

#### 2.4 Button component spec
```tsx
<Button variant="primary" size="sm" icon={<IconPlus />}>
  Add
</Button>
```

| Variant | Border | Background | Text | Hover |
|---|---|---|---|---|
| primary | `border-umbra-purple/40` | `bg-umbra-purple/10` | `text-umbra-purple` | `hover:bg-umbra-purple/20` |
| ghost | `border-umbra-line` | transparent | `text-umbra-muted` | `hover:text-umbra-lilac hover:border-umbra-purple/30` |
| icon | `border-transparent` | transparent | `text-umbra-muted` | `hover:text-umbra-lilac hover:bg-white/[.06]` |

| Size | Padding | Font | Gap |
|---|---|---|---|
| sm | `px-3 py-1.5` | `text-2xs` | `gap-1` |
| md | `px-4 py-2` | `text-label` | `gap-1.5` |
| lg | `px-5 py-2.5` | `text-xs` | `gap-2` |

#### 2.5 Interactivity improvements
| Element | Current | Proposed |
|---|---|---|
| Card hover | None | Subtle border brighten (`hover:border-umbra-line/40`) + slight lift (`hover:-translate-y-px`) |
| Row hover | `bg-white/[.04-.07]` (varies) | Unified `hover-subtle` (`.04`) + left accent bar appears |
| Button hover | Color change | Color change + subtle scale (`hover:scale-[1.02]`) |
| Tab switch | Instant | Framer Motion `layoutId` underline slide |
| Page transition | None | Framer Motion fade-in (`opacity 0→1, 150ms`) |
| Loading state | Spinner text | Skeleton shimmer on tiles |
| Modal open | Instant | Framer Motion scale + fade (150ms) |
| Number changes | Instant | Count-up animation (300ms) for stats |

#### 2.6 Readability improvements
| Issue | Fix |
|---|---|
| `text-xs` and `text-sm` mixed for same content type | Standardize: card titles = `text-sm`, subtitles = `text-xs`, stats = `font-display text-lg` |
| Low contrast on `text-umbra-muted` (#A89CC4) at small sizes | Bump muted to `#B8ACD4` (slightly lighter) for `text-xs` and below |
| Tabular numbers (countdowns, stats) | Add `tabular-nums` to all numeric displays |
| Long member names truncated inconsistently | Standardize `truncate` + `title` tooltip everywhere |
| Dense leaderboards hard to scan | Alternate row backgrounds (`even:bg-white/[.015]`) |

---

## 3. Implementation plan (not yet started)

### Phase A: Foundation (shared components + CSS)
1. Create `<Button>`, `<Eyebrow>`, `<Panel>`, `<StatTile>`, `<Pill>` in `components/ui/`
2. Add `.panel`, `.tile`, `.hover-subtle`, `.hover-emphasis` to `globals.css`
3. Add `border-t-{color}/30` accent system

### Phase B: Dashboard refactor
4. Refactor `clan-identity-card.tsx` to use `<Panel>` + `<StatTile>`
5. Refactor `war-record-card.tsx`, `current-war-card.tsx`, `capital-summary-card.tsx`
6. Refactor `donation-analytics.tsx`, `activity-analytics.tsx`
7. Refactor `needs-attention.tsx`, `clan-log.tsx`, `nav-summaries.tsx`
8. Replace inline buttons with `<Button>`

### Phase C: Other pages
9. Members roster + detail sheet → `<Panel>` + `<StatTile>`
10. War center → `<Panel>` with amber accent
11. Capital → `<Panel>` with yellow accent
12. Hall of Fame → `<Panel>` with purple accent

### Phase D: Interactivity
13. Add Framer Motion page transitions
14. Add tab underline slide
15. Add count-up animation for stats
16. Add skeleton loading states

### Phase E: Polish
17. Alternate row backgrounds on leaderboards
18. `tabular-nums` on all numeric displays
19. Consistent tooltips on truncated names
20. Final color contrast pass

---

## 4. Why "Crystalline Observatory" fits

- **Stained glass** = the thin colored top-edge on each panel. It's
  functional (color-codes sections) and evocative (cathedral windows). Not
  decorative.
- **Crystalline** = the glass-morphism surfaces (`.glass` with
  `backdrop-blur`) already work. The fix is hierarchy — 2 clear levels
  instead of 5 muddy ones.
- **Observatory** = the app IS an observatory. The dark background +
  illuminated panels + starfield-like purple accents already say this. The
  design just needs to be consistent to land the metaphor.
- **The current theme is good.** The colors, fonts, and dark background
  are all right. The problem is execution consistency, not direction. This
  plan keeps the theme and fixes the consistency.

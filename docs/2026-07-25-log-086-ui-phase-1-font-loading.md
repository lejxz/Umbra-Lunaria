# Log 086 — UI Phase 1: Font Loading

**Date:** 2026-07-25
**Time:** 09:30 PM (+08:00)

## Summary

Loaded Cinzel, Inter, and JetBrains Mono via `next/font/google` so they
render properly. Previously these fonts were only referenced in CSS
variables with no actual font loading — the browser fell back to
Georgia / system-ui / Times New Roman.

## Changes

### `app/layout.tsx`
- Imported `Cinzel`, `Inter`, `JetBrains_Mono` from `next/font/google`
- Configured each with appropriate weights:
  - Cinzel: 400, 600, 700 (display/headline font)
  - Inter: 400, 500, 600, 700 (body font)
  - JetBrains Mono: 400, 500, 600, 700 (mono/label font)
- Set `variable` option on each (e.g. `--font-display`, `--font-sans`, `--font-mono`)
- Applied font variables to `<html>` via className
- `display: "swap"` on all fonts (prevents FOIT — text renders immediately,
  font swaps in when loaded)

### `app/globals.css`
- Removed `:root` font variable definitions (they were overriding next/font's
  injection on `<html>`)
- Updated `body` `font-family` to `var(--font-sans, "Inter"), system-ui, sans-serif`
  (fallback if the variable isn't set during SSR)

### How it works
1. `next/font` downloads the font files at **build time** (not runtime)
2. Self-hosts them (no Google Fonts CDN request at runtime — faster + no privacy issue)
3. Injects CSS variables (`--font-display`, etc.) on `<html>` via className
4. Tailwind config references these variables: `fontFamily: { display: ["var(--font-display)"] }`
5. The CSS variable flows to all components that use `font-display`, `font-sans`, `font-mono`

### Before vs after (verified via browser)
| Element | Before | After |
|---|---|---|
| h1 (Cinzel) | Times New Roman | Cinzel, "Cinzel Fallback" |
| Body (Inter) | Times New Roman | Inter, "Inter Fallback", system-ui |
| Mono labels | Times New Roman | JetBrains Mono |

## Verification
- Typecheck: clean
- Lint: 0 errors
- Tests: 147/147 pass
- Browser: fonts render correctly (Cinzel for display, Inter for body, JetBrains Mono for labels). No console errors.

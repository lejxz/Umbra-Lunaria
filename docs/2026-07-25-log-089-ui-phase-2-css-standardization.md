# Log 089 — UI Phase 2: CSS Standardization

**Date:** 2026-07-25
**Time:** 11:00 PM (+08:00)

## Summary

Added 3 CSS utility classes to globals.css that will be used in Phases 3-8
to standardize all backgrounds, hovers, and tiles across the app.

## Changes

### `app/globals.css`
Added to `@layer components`:
- `.tile` — Level 2 inner tile (`rounded-lg border border-white/[.04] bg-white/[.03]`).
  Replaces the 10 different `bg-white/[.0X]` variants used across components.
- `.hover-row` — unified row hover (`transition hover:bg-white/[.04]`).
  Replaces the 7 different hover opacity values (.035, .04, .05, .06, .07).
- `.hover-card` — unified card hover (`transition hover:border-umbra-line/50`).
  Replaces the various `hover:border-umbra-purple/30-60` patterns.

No visual change yet — these are additive utility classes. Phases 3-8 will
use them in find-and-replace operations across all components.

## Verification
- Typecheck: clean
- Lint: 0 errors
- Tests: 147/147 pass

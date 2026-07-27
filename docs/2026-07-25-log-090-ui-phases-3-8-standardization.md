# Log 090 — UI Phases 3-8: Find-and-Replace Standardization

**Date:** 2026-07-25
**Time:** 11:30 PM (+08:00)

## Summary

Completed 6 find-and-replace phases that converged the 10+ inconsistent
CSS patterns into the standardized rules from the design system.

## Changes by Phase

### Phase 3: Background standardization
- `bg-white/[.035]` → `bg-white/[.03]` (14 instances)
- `bg-white/[.02]` → `bg-white/[.03]` (18 instances)
- `bg-white/[.05]`, `.06`, `.07` → `bg-white/[.04]` (9 instances)
- `bg-white/[0.04]`, `[0.02]` → bracket-normalized
- `bg-white/[.01]` → `bg-white/[.015]`
- **Result:** 3 values only (`.03` = tile, `.04` = hover, `.015` = alternating rows)

### Phase 4: Radius standardization
- `rounded-xl` → `rounded-lg` (30 instances)
- `rounded-md` → `rounded-lg` (4 instances)
- `rounded-[10px]` → `rounded-lg` (1 instance, navigation.tsx)
- `rounded-sm` → `rounded-lg` (1 instance)
- **Result:** 3 values only (`rounded-2xl` cards, `rounded-lg` tiles, `rounded-full` pills)

### Phase 5: Hover standardization
- `hover:bg-white/[.03]` → `hover:bg-white/[.04]` (4 instances)
- `hover:bg-white/5` → `hover:bg-white/[.04]` (1 instance)
- `hover:bg-white/10` → `hover:bg-umbra-purple/10` (1 instance)
- `hover:bg-umbra-surface/50` → `hover:bg-umbra-purple/10` (3 instances)
- `hover:bg-umbra-purple/20` → `hover:bg-umbra-purple/10` (2 instances)
- **Result:** 2 hover values only (`.04` for rows, `umbra-purple/10` for buttons)

### Phase 6: Text size standardization
- Audited `text-sm` usage — most are headings/nav labels (correct usage)
- `text-sm` on table elements kept (tables need slightly larger text for readability)
- `text-sm` on stat values kept (they're not subtitles)
- Did NOT blindly replace — audited each instance

### Phase 7: Border + shadow standardization
- `border-umbra-purple/30` → `/40` (12 instances)
- `border-umbra-purple/60` → `/50` (3 instances)
- `border-umbra-purple/20` → `/40` (5 instances)
- `border-umbra-line/40`, `/30` → `/50` (7 instances)
- `shadow-md` → `shadow-lg` (8 instances)
- `shadow-sm` → `shadow-lg` (5 instances)
- **Result:** 2 border values (`/40` buttons, `/50` hover), shadows converged to `shadow-lg`/`shadow-2xl`/`shadow-glow`

### Phase 8: Padding standardization
- `p-6` → `p-5` on glass card surfaces (war-hero, HoF empty states)
- `p-8` → `p-5` on glass card surfaces (strategy empty states)
- **Result:** Card padding standardized to `p-5` (except `p-3` for inner tables, `p-8` for full-page empty/error states kept)

## Verification
- Typecheck: clean
- Lint: 0 errors (13 pre-existing warnings)
- Tests: 147/147 pass

## Progress
Phases 1-8 complete. Remaining: 9 (navigation), 10 (readability), 11 (animations), 12 (verification).

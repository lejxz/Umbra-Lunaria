# Log 017 — Finalized Concept Overhaul

**Date:** 2026-07-20
**Time:** 06:17 PM (+08:00)

## Summary of Session

Rebuilt the product concept around `concept/final-feature-list.md` so the dashboard, members, war, Capital, planning, data model, polling, mobile, and configuration documents share one finalized product contract. The existing implementation-plan document was intentionally left unchanged.

## Work Completed

- Updated concept documents `00` through `11` to distinguish direct API facts, tracked history, derived metrics, and unavailable data.
- Finalized dashboard hierarchy, reset-aware donation rules, Member Activity Score, member detail behavior, war/CWL behavior, Capital scope, planning rules, mobile requirements, and administration boundaries.
- Updated `concept/design_proposal.html` to visually represent the finalized dashboard hierarchy and current clan/API examples.
- Corrected stale references to the renamed implementation-plan file and confirmed all internal Markdown links resolve.
- Confirmed `concept/12-Implemantation-plan-and-modularity.md` has no changes.

## Decisions Made

- Defined Member Activity Score as a transparent, data-availability-aware 30-day contribution ranking; it is distinct from the war auto-select score.
- Chose public read access with administrator-protected roster and runtime-settings writes, matching the finalized feature inventory.
- Specified local asset mapping for approved Supercell Fankit icons instead of runtime icon hotlinking.
- Kept the raw live API response as evidence of API behavior and corrected stale summary bullets without altering the captured response data.
- No deviation from the request: the step-by-step implementation plan was preserved exactly as requested.

## Next Action

Review the finalized concept and approve any product choices that need leadership input, especially the eventual administrator authentication mechanism and score-weight defaults. After approval, resume implementation using the unchanged step-by-step plan.

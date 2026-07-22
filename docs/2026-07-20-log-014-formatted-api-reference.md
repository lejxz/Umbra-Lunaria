# Log 014 — Formatted API Reference

**Date:** 2026-07-20
**Time:** 09:55 PM (+08:00)

## Summary of Session

Added a readable, formatted API reference under `concept/` while preserving the complete raw API capture separately for audit and future implementation work.

## Work Completed
- Added `concept/13-live-api-reference.md`.
- Included formatted clan data, all current member rows, leader progression fields, and clan capital districts.
- Limited the readable leader achievement examples to Gold Grab and War Hero.
- Linked the complete raw clan, leader, and war-log responses for detailed implementation reference.

## Decisions Made
- Kept raw and readable references separate: the concept file is optimized for design and implementation review, while the snapshot preserves the exact response bodies.

## Next Action

Use the formatted API reference when implementing member, war, and capital views.

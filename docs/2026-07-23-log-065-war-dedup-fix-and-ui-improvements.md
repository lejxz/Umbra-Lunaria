# Log 065 — War History Dedup Fix + War Page UI Improvements

**Date:** 2026-07-23
**Time:** 01:55 AM (+08:00)

## Summary of Session
Fixed a duplicate-war-history bug (every daily-batch backfill re-inserted all 50 backfilled wars because the dedup matched on a NULL opponent_tag), then improved all four War Center UI components (hero, rosters, history, attack log) for better layout, scannability, and visual hierarchy.

## Work Completed

### Bug fix — duplicate war history (`lib/ingest/war-sync.ts`)
**Root cause:** `backfillWarLog` deduped on `(opponent_tag, end_time)`, but older backfilled rows had `opponent_tag = null` (an earlier code version didn't store the tag from the warlog API response). Since `NULL ≠ NULL` in SQL, the dedup `eq(wars.opponentTag, ...)` never matched the null rows — so every daily batch re-inserted all 50 wars. The history list showed 100 rows (50 unique × 2).

**Fix:**
1. Added a `(opponent_name, end_time)` fallback dedup when the opponent tag is null. The name fallback catches the legacy null-tag rows and prevents duplicate inserts.
2. `backfillWarLog` now stores `opponent_tag` on every insert/update (the warlog API returns it; it just wasn't being persisted before).
3. Cleaned up the 50 existing duplicate rows in the live DB (kept the lowest id per `(opponent_name, end_time)` group, deleted the rest).
4. Backfilled the missing `opponent_tag` for all 50 legacy rows from a fresh warlog API fetch.

**Result:** history now shows exactly 50 unique rows (verified via Agent Browser).

### UI improvements — all war components

**Hero** (`components/war/war-hero.tsx`):
- Replaced the flat VS layout with a cleaner matchup: state banner + countdown in one block, compact stat chips, and a **star-progress bar** showing the lead (amber vs red, scaled to `teamSize × attacksPerMember` max).
- The star bar only renders once stars exist (preparation shows 0, so it's hidden — no fake progress).
- Compact "N atk · N left" line per clan.

**Rosters** (`components/war/war-rosters.tsx`):
- **Sticky column headers** (Our clan / Opponent) that stay visible while scrolling the roster.
- Combined the name + TH into one cell (name on top, "THn" below) to save horizontal space — the old layout wasted a column on TH alone.
- Graded TH-advantage pill: `↑N` green / `↓N` red / `=` muted, in a compact rounded chip.
- Improved battle-day attacks column: shield icon for no-attack (red), check icon for all-done (emerald), amber for attacks remaining.
- Added `IconCheck` to `components/ui/icons.tsx`.

**History** (`components/war/war-history.tsx`):
- Added a **win/loss/tie record summary header** with win rate (live data shows W 19, L 0, T 1, 95% win rate; the remaining 30 backfilled wars without a result field don't count).
- Tighter rows: type/size/date meta collapsed into one mono line.
- Replaced the "No detail" tag with a muted `—` (cleaner — the "Details" button is the positive signal, the dash is self-explanatory).

**Attack log** (`components/war/war-attack-log.tsx`):
- Tighter rows with sticky table header.
- **Colored star pills**: 3★ emerald, 2★ amber, 1★ red, 0★ muted — scannable at a glance without reading the number.
- Removed the duration column from the default view (it's the least useful column; hidden on narrow screens already, now tighter).

## Decisions Made
- **Name-based dedup fallback, not a schema change.** Adding a `UNIQUE(opponent_name, end_time, war_type)` constraint would have been heavier and risky (name changes would break it). The name fallback in the query is lighter and sufficient — the warlog API returns consistent names.
- **Star-progress bar only when stars exist.** During preparation both clans have 0 stars, so the bar would show an empty 0/0 — misleading. It only renders once `totalStarsEarned > 0`.
- **Colored star pills in the attack log.** The old `★★★` text was hard to scan in a long table. The colored pill (emerald/amber/red/muted) makes a 3-star attack instantly visible without reading.
- **Record summary over the displayed history, not all-time.** The clan's all-time war record (wins/ties/losses) is already on the dashboard's war-record card. The history summary is the record over the *displayed* history (50 rows), which is more useful in context.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.
- Agent Browser (desktop + 375×812 mobile): hero renders the Preparation badge + countdown + VS layout + "2 atk" chip; roster scouting shows all 5 members with sticky headers; history shows exactly 50 unique rows (was 100) with the W/L/T record summary + 95% win rate; attack log empty during prep (correct). No page/console errors.
- DB verified: 50 ended wars, 0 null opponent_tags, 0 duplicate `(opponent_name, end_time)` groups.

## Next Action
War Center UI pass complete. Next is Step 1.6 — Phase 1 integration and release gate (the final Phase 1 step).

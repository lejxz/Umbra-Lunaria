# Log 061 — War Center UI Redesign (Roster + History + Detail Sheet)

**Date:** 2026-07-22
**Time:** 11:30 PM (+08:00)

## Summary of Session
UI improvement pass over the War Center. Redesigned the roster scouting rows into a compact `# | Name | TH | TH adv/disadv | base-state ★★☆ %` layout, restyled the past-wars list into cards with result pills + a "View details" button, and built a new WarDetailSheet popup that fetches any live-tracked war by id and renders a full analysis (3★ rate, avg stars, attacks used, no-attack members, best attack, TH matchup) plus the roster and attack log.

## Work Completed

### Roster redesign (`components/war/war-rosters.tsx`)
- New compact row layout per the spec: `# | Name | TH | TH adv/disadv | ★★☆ %` (right-aligned).
- **#** — map position (purple chip).
- **Name** — player name (own-clan rows clickable into the member sheet).
- **TH** — Town Hall level (hidden on the narrowest screens).
- **TH adv/disadv** — the TH difference vs the opponent at the same map position. Advantage = green `↑N`, disadvantage = red `↓N`, even = `= THn`. Replaces the old binary "mismatch" flag with a signed, graded cue. Added `IconArrowUp`/`IconArrowDown` to `components/ui/icons.tsx`.
- **★★☆ %** (right-aligned) — the **defensive state of the base**: the worst attack against it (max stars + max destruction opponents achieved). A 3★ 100% renders in amber as "base destroyed"; untouched bases show a muted `—`. During preparation every row shows `—` (no attacks yet).
- Added a legend below the rosters explaining the cues.
- View model change: replaced `bestDefenseStars` (lowest conceded) with `worstDefenseStars` + `worstDefenseDestruction` (highest conceded = base state). Updated `buildRosterMember` in `lib/db/war-queries.ts` to compute max instead of min.

### History redesign (`components/war/war-history.tsx`)
- Each war is now a styled card row: result pill (W/L/T/—), opponent badge + name, type badge (CWL/Regular), team size, end-date, score line (★ stars), destruction %, and a **View details** button.
- **View details** button (purple, with chevron) is enabled only when `hasDetail` is true (a live-tracked war with a snapshot). Backfilled wars show a muted "No detail" tag — the public war log doesn't include roster/attack detail.
- Made the component a client component so it can call `onViewDetail(warId)`.

### War detail sheet (`components/war/war-detail-sheet.tsx`, new)
- Popup opened from the history "View details" button. Fetches `/api/war/[id]` on demand (like the member sheet pattern) and renders:
  1. **Header** — opponent, result pill (Victory/Defeat/Draw/Ongoing), score, state, timers, freshness.
  2. **Analysis panel** — 4 stat cards (3★ rate, avg stars, attacks used, no-attack members) each showing us-vs-them, plus narrative highlights (best own attack, TH matchup quality, no-attack count). Every "never fake a zero" rule applies — rates are `—` when the denominator is 0.
  3. **Roster (compact)** — both clans by map position with base-state.
  4. **Attack log** — every attack ordered, attacker → defender, stars/destruction.
- Loading, error, and 404 (no detail) states handled.

### Data layer
- New `getWarDetail(warId)` in `lib/db/war-queries.ts` — fetches a war by id, parses the snapshot, and builds the analysis.
- New `buildAnalysis()` pure function — derives attack efficiency, 3★ rate, avg stars, no-attack count, best attack, and average TH per side from the parsed view model. Rates are null when the denominator is 0.
- New `app/api/war/[id]/route.ts` — public GET endpoint returning the `WarDetailView`; 404 when the war doesn't exist or has no snapshot.
- New view models in `lib/view-models/war.ts`: `WarDetailView`, `WarAnalysis`.

### Wiring
- `components/war/war-shell.tsx` now holds `detailWarId` state and renders `<WarDetailSheet>`, passing `onViewDetail={setDetailWarId}` to `WarHistory`.

## Decisions Made
- **Right-aligned column = defense (base state), not offense.** The user clarified that "the state of the base either destroyed" is more logical than the best-attack score. So the compact roster row shows the worst attack against the base (max stars/destruction conceded) — answering "is this base destroyed?". Offense (best attack) is still available in the detail sheet's roster + attack log.
- **TH advantage is graded, not binary.** The old "mismatch" flag only fired at ≥2 levels. The new cue shows the signed difference for every position (↑N advantage, ↓N disadvantage, = even), giving a clearer scouting picture.
- **Detail sheet fetches on demand.** Like the member sheet, it loads `/api/war/[id]` only when opened — the history list stays light (no snapshot JSONB fetched until a user clicks).
- **Backfilled wars are honestly "No detail".** The public war-log endpoint returns result/stars/destruction but no roster/attacks. Rather than fake a detail view, those rows show a disabled "No detail" tag. Live-tracked wars (current + future) get the full detail sheet.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors.
- Agent Browser (desktop + 375×812 mobile): `/war` renders the redesigned roster (Yeon TH17 +2 advantage, Juskepz TH14 -1, etc., `—` base state during prep), the legend, and the history cards (50 backfilled wars showing "vs [opponent]", REGULAR, "NO DETAIL"). Mobile layout collapses the TH column gracefully.
- `/api/war/1` returns full detail + analysis (prep war, 0 attacks). `/api/war/2` correctly 404s (backfill row, no snapshot).
- No page/console errors. The detail sheet will become clickable from history once a live-tracked war ends (the current prep war keeps its snapshot when it transitions to warEnded).

## Next Action
The detail sheet is ready and verified via API. Once the current preparation war ends and moves to history with its snapshot, the "View details" button will be live-clickable. Otherwise, continue to Step 1.5 — Capital.

# Log 062 — War Center Concept Alignment Fixes

**Date:** 2026-07-22
**Time:** 11:50 PM (+08:00)

## Summary of Session
Audit of the War Center against concept/07 found three missing clauses, one misleading label, and a tradeoff in the roster redesign (defense-only compact row dropped the offense/urgency cues). Fixed all four gaps and added a prep/battle toggle so the roster's right column shows base-state during preparation and attacks (offense + no-attack urgency) during battle — restoring every concept/07 roster clause without losing the defense view.

## Work Completed

### Gap fixes
1. **Own clan level** (`components/war/war-hero.tsx`): the hero hardcoded `clanLevel={null}` for our clan while showing the opponent's level. Now passes `currentWar.clan.clanLevel` (the snapshot has it — Lv 11 for Umbra Lunaria). Concept/07 §"Summary" #3: "Own and opponent clan identity, badges, levels".
2. **Attacks per member** (`components/war/war-hero.tsx`): the team-size chip now reads `5v5 · 2 atk` instead of just `5v5`. Concept/07 §"Summary" #1: "War type, state, team size, and attacks per member".
3. **Plan lineup link** (`components/war/war-hero.tsx`): added a "Plan lineup →" link to `/planning`, shown only during preparation. Concept/07 §"Preparation-day scouting" #5: "Link to the Planning page for manual lineup construction".
4. **Attack-log column label** (`components/war/war-attack-log.tsx`): renamed the "Time" column to "Dur." — the CoC currentwar API returns per-attack `duration` (seconds), not a wall-clock timestamp, so the old label was misleading.

### Roster toggle (`components/war/war-rosters.tsx`)
- Added a prep/battle toggle (tablist) for the right column. Preparation defaults to "Base" (no attacks exist yet); battle/ended defaults to "Attacks" (urgency matters mid-war). The user can flip between them.
- **"Attacks" mode** (new): shows the member's best attack (★★☆ + %) and an urgency badge — red `0/N` (no attacks used, with shield icon), amber `N/N` (attacks remaining), or emerald `✓ N/N` (done). Restores concept/07 §"Roster and attack status" #3 (attacks used vs allowed), #4 (best stars/destruction), and #5 (prominent no-attack/attacks-left state).
- **"Base" mode** (existing): shows the defensive state of the base (worst attack against it, 3★ 100% = destroyed in amber). Kept as the prep default and as a toggle option in battle.
- The legend below the rosters updates to match the active mode.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors.
- Agent Browser: `/war` renders the prep war. "Plan lineup" link present (`href="/planning"`). Team-size chip shows `5v5 · 2 atk`. Toggle is hidden during prep (correct — only meaningful once attacks exist). `/api/war/1` confirms clanLevel=11 (ours) and =1 (opponent) are populated.
- The "Dur." column header only renders when the attack log has rows (during battle); in prep the attack log shows its empty state, which is correct.

## Next Action
All concept/07 gaps closed. The War Center now satisfies every clause of the spec. Continue to Step 1.5 — Capital (concept/08).

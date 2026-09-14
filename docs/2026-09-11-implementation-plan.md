# Implementation Plan — Activity Signals Overhaul & Feature Roadmap

**Date:** 2026-09-11
**Inputs:** owner-selected feature list from [`2026-09-10-application-assessment.md`](./2026-09-10-application-assessment.md) §7 (items 1, 3, 5, 6, 8–12), the owner's priority question about activity tracking, and a read-only inspection of the production database (2026-09-11).
**Status:** Phase 6 (CI/CD), Phase 1 (activity signals), Phase 2 (quick wins), and Phase 3 (analytics features) are **implemented** — execution logs: [`2026-09-11-phase1-activity-signals.md`](./2026-09-11-phase1-activity-signals.md), [`2026-09-13-phase2-quick-wins.md`](./2026-09-13-phase2-quick-wins.md), [`2026-09-13-phase3-analytics-features.md`](./2026-09-13-phase3-analytics-features.md). Phase 4 (clan history timeline) is **implemented 2026-09-14** — execution log: [`2026-09-14-phase4-clan-history-timeline.md`](./2026-09-14-phase4-clan-history-timeline.md). Phase 5 remains.

---

## 0. Environment correction (applied this session)

The production database is **Supabase** (transaction pooler, port 6543, `aws-0-us-east-1`). Earlier sessions were given a stale **Neon** `DATABASE_URL` that no longer authenticates; that produced incorrect "deployment is Neon" statements in the docs. Corrected this session in `README.md` (×2), `app/page.tsx`, `components/page-scaffold.tsx` (a user-visible "Neon snapshots" label), `lib/env.ts` comments, `tests/README.md`, and the notes in [`2026-09-10-application-assessment.md`](./2026-09-10-application-assessment.md) §9 / [`2026-09-11-priority-fixes.md`](./2026-09-11-priority-fixes.md). Historical logs from July 2026 (the genuine Neon era, pre-migration log 074) are untouched — they are accurate history.

Follow-up for the owner: the old Neon credential was shared in plaintext and is dead, but rotate it wherever it still exists (password manager, old Vercel previews) as routine hygiene.

---

## 1. Investigation — how member activity is tracked today (owner priority)

### 1.1 The activity model, end to end

Every 5-minute light poll (`app/api/ingest/route.ts` → `runLightPoll`) writes one `member_snapshots` row per live member carrying two derived flags, computed by the pure function `computeActivityFlags` (`lib/ingest/membership.ts:141-162`):

```
activityFlag  = donations given ↑ OR donations received ↑ OR trophies changed OR BB trophies changed
loginDayFlag  = donations given ↑ OR donations received ↑
```

Both flags compare the current clan-roster counters against the member's **previous snapshot only** (`DISTINCT ON (player_tag) … ORDER BY captured_at DESC`, `app/api/ingest/route.ts:233-254`). The first-ever snapshot for a member is a baseline (both flags false). Trophies are included in `activityFlag` but not `loginDayFlag` (trophy changes are attack evidence, not unambiguous login evidence; donation movement is treated as certain login evidence).

Everything the app calls "activity" flows from these two boolean columns:

| Consumer | Location | Uses |
|---|---|---|
| Roster "Active" badge + last-active | `lib/db/member-queries.ts:187-224` (`getLatestActivity`) | latest `activity_flag = true` snapshot; active = within 7 days |
| Needs-attention → Inactive queue | `lib/db/queries.ts:765-784` | same query; > 7 days → listed inactive |
| Member detail 30-day heatmap + login days | `lib/db/member-queries.ts:272-328` | any flagged snapshot inside a day bucket |
| Activity Score, "Observed activity" component (25 pts) | `lib/db/queries.ts:667-670` | `activityFlag` intervals ÷ total intervals |
| HoF "dedicated" login streak + `cumulativeLoginDays` checkpoint | `lib/db/records-updater.ts:135-161`, `lib/ingest/checkpoints.ts` | `loginDayFlag` days (clan-timezone dedup) |

The Activity Score (`lib/scoring/activity-score.ts`) additionally has a **war component (25 pts)** and a **capital component (15 pts)** — so wars are *partially* represented in one leaderboard, but not anywhere the clan actually looks for "is this member active."

### 1.2 Confirmed gaps (root causes, file:line)

| # | Gap | Evidence |
|---|---|---|
| **G1** | **War attacks never set the activity flags.** `computeActivityFlags` has no war input at all. | `lib/ingest/membership.ts:141-162` |
| **G2** | **Ordering:** in `runLightPoll`, snapshots are inserted at step (b) (`route.ts:259-290`) and war sync runs *after* them (`route.ts:358-379`) — so even reading `war_attacks` at snapshot time would miss the current poll's attacks. | `app/api/ingest/route.ts` |
| **G3** | **CWL is excluded from the score's war component:** `computeMemberActivityScore` filters `warType = 'regular'` (`queries.ts:592`). Meanwhile the roster's war summary (`member-queries.ts:240-250`) and member-detail war section count *all* wars — three different definitions of "wars tracked." | `lib/db/queries.ts:586-596` |
| **G4` | **`expLevel` is not stored or diffed.** The clan roster returns `expLevel` every poll; it is refreshed on `members` but not snapshotted, so the strongest all-gameplay signal (XP rises from war attacks, multiplayer, donations, obstacle removal) is invisible. | `memberRefreshFields` `route.ts:607-622`; `member_snapshots` has no `exp_level` column |
| **G5` | **Capital raid activity is weekly-grain only** (score component from completed seasons). The daily batch does log `capitalContribution` events on contribution deltas (`route.ts:497-508`) but never marks activity days. | `lib/ingest/capital-sync.ts`, `route.ts` |
| **G6** | **Career-total deltas are day-grain but unused for activity** — `attackWins`/`warStars`/achievement values are captured daily into `members.career_stats` and simply overwritten. | `route.ts:491` |

### 1.3 Live-database evidence (production, read-only, 2026-09-11)

- **7 retained members**, 15,755 `member_snapshots` over 54 days (~2,000/day), 58 wars (all `regular` — no CWL season observed yet), 41 recorded war attacks, 27 capital raid seasons, 61 membership events, 8/8 members with full `career_stats` (54 achievements each).
- **5 of 7 members have 0 donations given AND 0 received this season.** For 71% of this roster, the donation-based signals are structurally blind; trophies + war are the only live evidence they can produce.
- **The exact owner-reported case exists in production:** `KnieieGurow` (`#L8YYY8CGY`) attacked in a war on 2026-09-09, yet has `last activity-flagged snapshot = NULL` — never flagged active, and therefore appears in needs-attention as *"No tracked activity yet"* while actively warring.
- Flag sparsity: ~6–10 flagged snapshots per day out of ~2,000 — the interval-rate component of the score is dominated by noise for non-donating members.
- Only 7 of 58 wars carry full `war_snapshot` rosters (the rest are warlog backfills) — relevant scoping fact for Feature 9.

### 1.4 What signals exist, and what else can be done (owner question)

**Available at 5-minute poll grain (interval-exact):** donations given/received ✅ used · trophies ✅ used · BB trophies ✅ used · **war/CWL attacks ❌ unused** (`war_attacks.attacked_at` is stored to the poll minute!) · **expLevel ❌ unused**.

**Available at daily-batch grain (day-exact):** capital contribution deltas (event already written) · career-total deltas (`attackWins`, `warStars`, 54 achievement counters) · raid-season participation.

**Not obtainable:** player last-online (CoC API does not expose it), per-member Clan Games points.

**Conclusion:** the single highest-value fix is wiring war attack evidence into the activity flags — it is exact, already stored with timestamps, and directly answers "players who don't donate or request but do participate in war." expLevel is the second wiring (broad coverage); day-grain career/capital deltas are the third (retroactive-safe, daily heatmap only).

### 1.5 Design — activity signals overhaul (executed as Phase 1)

1. **Reorder `runLightPoll`:** war sync (regular + CWL) moves *before* snapshot insertion. War sync writes only `wars`/`war_participants`/`war_attacks` — no dependency on snapshots — and failed-poll safety is unchanged (war sync stays best-effort).
2. **One evidence query per poll:** `SELECT attacker_tag, count(*), max(attacked_at) FROM war_attacks WHERE attacked_at > (min prior snapshot time) AND attacked_at <= now GROUP BY 1` — one round-trip, then per-member membership check `attacked_at > prior[tag].capturedAt`.
3. **Extend the pure function:** `computeActivityFlags(current, lastSnapshot, warAttacksInInterval)` → `activityFlag |= warAttack > 0`; `loginDayFlag |= warAttack > 0` (performing a war attack is unambiguous login evidence). Backwards-compatible default `0` keeps every existing test green.
4. **Historical backfill (one script, run once):** for each war attack, set both flags on the member's first snapshot at/after `attacked_at` on the same clan-timezone day (SQL in §Phase 1) — heals the heatmap, streaks, and `cumulativeLoginDays` retroactively for all 41 recorded attacks and every future one.
5. **Score honesty (G3):** the score's war window includes **all** wars involving the own clan (regular + CWL); align the three "wars tracked" definitions on `involves_own_clan` + any war type.
6. **expLevel signal (G4):** add `member_snapshots.exp_level` (migration), store it, diff it in the pure function (interval grain).
7. **Day-grain evidence (G5/G6):** daily batch marks the day's snapshot active when capital contributions rose or career totals moved (career deltas land with Feature 8's snapshot table — same machinery, one query).

---

## 2. Phased roadmap

Ordering principle: the owner's priority (activity truth) first; then quick wins that are pure UI/settings; then the four analytics features (which share one new table and one new window kind); then the timeline; then PWA; CI/CD last as the owner specified. Each phase lists acceptance criteria — a phase is done when its criteria hold, not when its code is written.

### Phase 1 — Activity signals overhaul (P0 · owner priority · effort M) — **EXECUTED 2026-09-11**

Execution record + verification against the acceptance criteria: [`2026-09-11-phase1-activity-signals.md`](./2026-09-11-phase1-activity-signals.md). One amendment discovered during execution: the daily purge now also retains every snapshot carrying `activity_flag`/`login_day_flag` (retention rule 5) — without it, war-evidence days would fade from the 30-day heatmap once they age past the 7-day pruning horizon (acceptance (c) would decay over time). The backfill therefore flags BOTH the first snapshot at/after the attack AND that day's last-of-day marker (the pruning-proof row).

| Step | Change | Files |
|---|---|---|
| 1.1 | War sync before snapshots; war-evidence map passed to flag computation | `app/api/ingest/route.ts` |
| 1.2 | `computeActivityFlags(current, prior, warAttacksInInterval = 0)` — war attack sets both flags; new tests incl. CWL boundary + multi-attack intervals | `lib/ingest/membership.ts`, `tests/ingest/membership.test.ts` |
| 1.3 | Index `war_attacks(attacked_at)` — per-poll evidence query stays O(new attacks) | `drizzle/0011_*`, `lib/db/schema.ts` |
| 1.4 | Backfill script: flag snapshots from historical `war_attacks`, then re-run `computeCheckpoints()` + `checkHallOfFameRecords()`; record before/after counts in the log | `scripts/backfill-war-activity.ts` (one-shot) |
| 1.5 | Score war component: drop `warType = 'regular'` filter; unify "wars tracked" across score/roster/detail on `involves_own_clan` | `lib/db/queries.ts:586-596`, `lib/db/member-queries.ts` |
| 1.6 | `member_snapshots.exp_level` column + signal + prior-query/insert wiring | `drizzle/0011_*`, `lib/db/schema.ts`, `app/api/ingest/route.ts`, `lib/ingest/membership.ts` |
| 1.7 | Needs-attention detail strings become evidence-aware ("Last seen: war attack 2d ago · donation 9d ago"), replacing the single "N days inactive" | `lib/db/queries.ts` (needs-attention) |
| 1.8 | Docs: `docs/concept/04` gains "War, XP and day-grain evidence" section; concept 06 member-page wording | `docs/concept/04-activity-tracking-and-polling.md` |

**Acceptance:** (a) a member whose only action is a war attack shows Active on the roster within one poll; (b) the KnieieGurow-style case disappears from needs-attention after backfill; (c) heatmap shows war days; (d) activity-score component breakdowns for war-included members change ≤ the war component's weight; (e) `vitest run` green with new cases; (f) backfill verified idempotent (run twice → 0 changes second time).

### Phase 2 — Quick wins (each independent · effort S) — **EXECUTED 2026-09-13**

Execution record + verification against the acceptance criteria: [`2026-09-13-phase2-quick-wins.md`](./2026-09-13-phase2-quick-wins.md). One amendment discovered during execution: 2.1 reads `?tag=` from `window.location.search` in a mount effect instead of `useSearchParams` — the latter would force the static `/members` route dynamic, breaking the route-modes CI contract.

**2.1 Deep-linkable member profiles (assessment F3).** `/members?tag=%23XXXX` opens the detail sheet on load; selecting a member updates the URL via `history.replaceState` (no navigation, no ISR invalidation); Back closes the sheet; needs-attention and clan-log rows link into it. The detail data path already exists (`GET /api/members/[tag]`). Files: `components/members/members-shell.tsx` (read `useSearchParams` on mount, `replaceState` on select), `components/dashboard/needs-attention.tsx`, `components/dashboard/clan-log.tsx` (link out). Acceptance: shareable URL opens the correct sheet; direct navigation works; no hydration warnings.

**2.2 Donation ratio flags (F5).** New needs-attention category "Below donation ratio" using reset-aware 30-day given/received (`calculateDonationWindow`), threshold from `runtime_settings` key `needsAttention.donationRatio = { enabled, minRatio, windowDays }` (table exists, 0 rows — seed defaults in the reader with SQL-documented overrides; no admin UI, consistent with the no-auth design). Members with `received30d ≥ floor` (default 200, avoids flagging request-light members) and `given/received < minRatio` (default 0.5, i.e. below clan-median proxy) are listed. Acceptance: category renders with configurable behavior; absent when disabled; unit tests for the pure threshold function.

**2.3 War log v2 enrichment (F6).** `wars.exp_earned` + `wars.exp_per_attack` columns (migration); `backfillWarLog` writes `expEarned` from the warlog payload (`CocWarLogEntry.clan.expEarned` — field already typed, `lib/coc-client/client.ts:277`); war-history rows gain XP chips. One-time enrichment = the daily backfill itself (idempotent upsert). Acceptance: history rows show XP where the API provides it; null-safe rendering; `next build` + route-modes gate green.

### Phase 3 — Analytics features (effort M each, share infrastructure) — **EXECUTED 2026-09-13**

Execution record + verification against the plan: [`2026-09-13-phase3-analytics-features.md`](./2026-09-13-phase3-analytics-features.md). Amendments discovered during execution: (a) the member Progress section computes all three windows server-side (tab switches cost zero fetches) rather than refetching per window; (b) the CWL promotion/relegation rule was verified against Supercell's official support page — "in most leagues, two Clans are promoted and two are demoted" — so the standings mark rank 1 ↑ / bottom two ↓ as trajectory with a variance caveat, not a final verdict; (c) `member_career_snapshots` also stores the career scalars (war stars, attack wins, …) alongside the achievements JSONB so diffs need no JSONB traversal for the headline numbers.

**3.1 Achievement/career deltas over time (F8).** New table `member_career_snapshots (player_tag, captured_at, career_stats jsonb)` written by the daily batch *before* overwriting `members.career_stats`. Diffs between two captures yield "war stars +12 this month," "attack wins +34," per-achievement deltas. Member detail gains a "Progress (window)" section with a selectable window (7d/30d/all) diffing current vs snapshot-at-window-start; the same diff marks day-grain activity (Phase 1 §1.5 item 7). Retention: keep all (7 members × ~8 KB/day ≈ 20 MB/year — cheap); purge policy note added to concept 03. Query cost: one indexed per-member lookup.

**3.2 Custom date-range analytics (F11).** `WindowKind` gains `"custom"` (`{ kind, from, to }` with ISO-day validation: not future, span ≤ 366 days, aligned to clan-TZ midnights); `computeWindow` handles it; donation/war-trend query helpers accept any window. Surface: dashboard donation-analytics gains a date-range control that calls a new `GET /api/analytics?from=&to=` (dynamic route, `withCache` keyed by resolved day pair, TTL 5 min). Use cases like "how did we do last CWL" resolve to a preset range. Acceptance: window validation tests (reuse `tests/lib/windows.test.ts` patterns); no change to the four preset windows' behavior.

**3.3 Attack targeting intelligence (F9).** New query joining `war_attacks` → `wars.war_snapshot` (defender identity: `warSnapshot.opponent.members[].townHallLevel`, `mapPosition`, matched by `defenderTag`). Per own-member: attack log with TH delta, stars, destruction; aggregate "best/worst matchups by TH delta" (avg stars/destruction grouped by THΔ ∈ {−2, −1, 0, +1, +2+}) for war prep. Honest coverage note: only live-tracked wars have snapshots (7 today, growing); warlog-backfilled wars are excluded — the UI states this. Placement: strategy page section. Pure computation (`lib/scoring/targeting.ts`) extracted + tested like the other scoring modules.

**3.4 Real CWL standings (F1).** `getCwlSeason` already stores the full league group (8 clans, 7 rounds) and all wars are synced per poll; `wars.involves_own_clan`/`own_clan_tag` (A-4) disambiguate sides. New `getCwlStandings(season)`: iterate the group's clan list; for each clan aggregate across the season's 28 CWL wars (match either `own_clan_tag` or `opponent_tag`): stars for/against, destruction for/against, attacks, wins/losses/ties, round-by-round grid. Standings table (rank, clan, played, stars±, destruction avg, record) with promotion/relegation indication (rank 1 ↑ candidate; bottom two ↓ risk — final group state per CWL rules). Replaces the current day-tabs-only CWL view with standings + round tabs. Data note: `cwl_seasons` is empty today (no CWL month observed since tracking began) — the feature ships ready for the next season and is verifiable against RoyaleAPI's published format.

### Phase 4 — Clan history timeline (F10 · effort S-M) — **EXECUTED 2026-09-14**

Execution record + verification against the plan: [`2026-09-14-phase4-clan-history-timeline.md`](./2026-09-14-phase4-clan-history-timeline.md). Amendment discovered during execution: the custom date-range control was extracted into a shared `components/dashboard/range-control.tsx` (used by both the donation panel and the new timeline panel), and `GET /api/analytics` now also returns `membershipTimeline` for the requested range — additive, inside the existing `withCache`.

`getMembershipTimeline(from, to)` — `membership_events` grouped by clan-TZ day × `event_type` (join/rejoin/leave/thUpgrade/rename), plus capitalContribution density. Render as a stacked bar/area chart (recharts, matching `chart-theme.ts`) under the dashboard clan log with event-type legend and a window select (30d/90d/all — reuses 3.2's custom window). Pure query + one component; no migration; immutable source is already the design guarantee.

### Phase 5 — PWA/offline shell (F12 · effort M)

Prerequisite confirmed: ISR is live and gated by the CI route-modes job (A-1 fixed). Scope: `public/manifest.webmanifest` (name, `app/icon.png` + maskable variant, theme color), a hand-rolled `public/sw.js` (~60 lines — **no next-pwa dependency**, Next 15 compat risk not worth it for this app): precache an offline shell, stale-while-revalidate for `/_next/static`, network-first-with-cache-fallback for HTML, **never cache `/api/*`** in v1; registration via a small client component in the layout (guarded, versioned, with an unregister path for updates). iOS meta tags (`apple-touch-icon`, `apple-mobile-web-app-capable`) added to the layout head. Offline page states "offline — showing your last visit." Kill switch: `clanConfig.features.pwa` (config-file pattern, non-secret) so the SW can be disabled without a redeploy of behavior. Acceptance: Lighthouse PWA installable; airplane-mode load shows the shell; no stale-data trap beyond the documented "last visit" disclaimer; SW update flow verified (bump version → clients update within a day).

### Phase 6 — CI/CD overhaul (final stage · **implemented this session**)

Owner requirement: "a proper complete job status or log of the CI/CD when the action is opened." Delivered in `.github/workflows/ci.yml`:

1. **Per-step summaries** — typecheck, lint, and test steps each append status lines to `$GITHUB_STEP_SUMMARY`; the test step parses vitest's JSON reporter output into a results table (files, tests, pass/fail, duration).
2. **Route-mode summary** — the build job's route table (the same text `scripts/assert-route-modes.sh` asserts on) is echoed into the summary, so the ISR contract is visible in every run.
3. **Final `report` job** (`if: always()`, `needs: [quality, route-modes]`) — renders the complete job matrix (each job's conclusion), the commit, and a headline verdict; the run page opens to a single readable status card.
4. **Log artifacts** — on any failure, the raw logs (`tee`'d per step) are uploaded with 7-day retention for post-mortem without re-running.

Documented as future CI work (not this session): a disposable-Postgres integration job (still pending an environment decision per `tests/README.md`), a nightly poll smoke test against the deployment URL, and branch-protection requiring the `report` job.

---

## 3. Sequencing, dependencies, effort

| # | Item | Depends on | Effort | Priority |
|---|---|---|---|---|
| 1 | Activity signals overhaul (Phase 1) | — | M | **P0** (owner) |
| 2 | Deep-linkable profiles (2.1) | — | XS–S | P1 |
| 3 | Donation ratio flags (2.2) | — | S | P1 |
| 4 | War log v2 enrichment (2.3) | — | S | P2 |
| 5 | Career deltas (3.1) | migration 0011 pattern | S–M | P1 |
| 6 | Custom date-range (3.2) | 3.1 optional synergy | S–M | P2 |
| 7 | Attack targeting (3.3) | war snapshots accumulate | M | P2 |
| 8 | CWL standings (3.4) | A-4 (done) | M | P1 (time-boxed to next CWL month) |
| 9 | Clan history timeline (4) | 3.2 window reuse | S–M | P2 |
| 10 | PWA/offline shell (5) | ISR verified (done) | M | P3 |
| 11 | CI/CD overhaul (6) | last by owner instruction | S | **done this session** |

Recommended execution order: **1 → 2.1 → 2.2 → 3.1 → 3.4 → 2.3 → 3.2 → 3.3 → 4 → 5**. Phase 1 first because every analytics surface (heatmap, score, needs-attention, HoF) silently lies today for war-active members; 3.4 before the next CWL month starts; PWA last among features to avoid re-testing the SW after each UI change.

## 4. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Backfill mis-flags days (poll-gap attribution) | Same-day clan-TZ guard + first-snapshot-at/after rule; idempotency check; before/after counts in the log |
| Flag semantics drift (interval vs day grain) | Keep `activity_flag` interval-exact; day-grain signals mark one snapshot per day only via the daily batch |
| Activity-score rank shake-up after CWL inclusion + war evidence | Component breakdown already shown; log the before/after top-10 in the change log; weights unchanged |
| PWA serves stale data offline | Network-first HTML + "last visit" disclaimer + config kill switch; `/api/*` never cached |
| Custom-range endpoint abuse (scan every day-pair) | `withCache` day-pair keys, 366-day span cap, dynamic route (no ISR cost) |
| Career-snapshot table growth | ~20 MB/year at current roster; documented retention escape hatch in concept 03 |

## 5. What changed in this session (non-plan work)

1. Environment correction §0 (Neon → Supabase) across docs, comments, and one user-visible label.
2. This implementation plan.
3. CI/CD overhaul (Phase 6) — job summaries, complete job-status report job, failure-log artifacts.
4. Read-only DB inspection script (`scripts/investigate-db.mjs` outside the repo — not committed) — findings in §1.3.

(Phase 1's execution — same day, separate session — is recorded in [`2026-09-11-phase1-activity-signals.md`](./2026-09-11-phase1-activity-signals.md).)

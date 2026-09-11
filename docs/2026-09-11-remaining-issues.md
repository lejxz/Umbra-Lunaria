# Remaining Issues — 2026-09-11 (second pass)

**Scope:** implementation pass over the items left open by
[`2026-09-11-priority-fixes.md`](./2026-09-11-priority-fixes.md) (its
"Deferred" list) plus the remaining P2/P3 findings from
[`2026-09-10-application-assessment.md`](./2026-09-10-application-assessment.md).
Every change records why it was made, how it behaves, and how it was verified.

**Verification results (this pass):**
- `tsc --noEmit`: **clean**
- `eslint .`: **clean**
- `vitest run`: **176/176 tests pass** (15 files — was 150/13; +26 new tests)
- `next build`: compiles clean — all six content routes render `○ (Static)`
  with their intended revalidate periods, API routes stay dynamic
- New CI job (`route-modes`) runs the same build + a route-table assertion on
  every push/PR so an A-1-class regression can never land silently again

---

## 1. B-2 — Reset-day donation retention in the purge (P1)

**Problem:** the purge kept only the LAST snapshot per member per day. When a
weekly donation-counter reset landed mid-day (200 → reset → 5), the surviving
pair (prev-day 200 → end-of-day 5) permanently destroyed the pre-reset
donations in every future 30d window and per-day bucket.

**Change:** the intra-day pruning (`app/api/cron/purge/route.ts`) now keeps a
minimal delta-chain-preserving set, implemented in SQL as window functions over
the pruned range:

1. the **first snapshot of each member's chain** (so lifetime totals computed
   from the retained chain — the checkpoint columns — are exact),
2. the **last snapshot of each clan-timezone day** (the day marker, aligned
   with the Manila-midnight display buckets from fix B-6),
3. every **local peak** (last snapshot before a counter drop) and every
   **first post-drop snapshot** — per counter, for `donations` and
   `donations_received` — with drop detection partitioned **by member, not by
   day**, because resets can land between one day's last poll and the next
   day's first poll.

On members/days with no drops the kept set is exactly {end-of-day} — identical
to the old retention. Cost: ~2 extra rows per member per weekly reset.

**Proof it is exact:** the rule is extracted as the pure function
`selectRetainedSnapshotIds` (`lib/ingest/purge-retention.ts`) and fuzz-tested
in `tests/ingest/purge-retention.test.ts`: 300 randomized trials (6 days,
3–10 polls/day, 20% reset chance per counter per poll, resets allowed to cross
midnight and land back-to-back) assert that the retained chain reproduces the
un-pruned chain's donation totals for **every window shape the app issues**:
whole-chain (lifetime/checkpoint), per-clan-day buckets (donation timeline),
and rolling windows anchored at clan midnights. The fuzz caught two real
design errors during development (a global-peak rule that fails for multiple
resets/day, and per-day drop detection that misses midnight-crossing resets)
before they shipped. Documented limitation: a window ending mid-day inside the
pruned region sees only that day's marker — no query the app issues does that.

**Ops note:** the daily DB size growth barely changes (2 rows/member/week);
the purge's `prunedSnapshots` count will simply be slightly lower on reset
days.

## 2. B-6 / B-7 — Window boundaries and login-day dedup (P2)

**B-6 — `lib/time/windows.ts` `computeWindow`:**
- `"24h"` is now **exactly 24 complete hourly buckets** ending at the top of
  the current hour (`to` = ceil to the next hour boundary, so the current
  partial hour appears as the in-progress bucket). Previously `from` snapped
  down to the hour while `to` kept its minutes — windows ran up to 24h59m59s
  and the last hourly bucket stretched to ~2h.
- `"7d"`/`"30d"` now anchor at **clan-timezone midnight** (6/29 full days +
  today so far), per the docs/concept/04 spec. Previously buckets were
  anchored at "now minus N days", so donations between Manila midnight and
  the anchor hour landed in the previous day's bucket and labels drifted from
  bucket contents. `startOfDayInClanTz` (previously dead outside tests) is now
  the anchor primitive.

**B-7 — `lib/ingest/checkpoints.ts`:** login days are deduped with the new
`clanTzDayKey` helper (clan-timezone calendar day) — the same definition the
HoF streak uses — instead of the UTC date slice, which over/under-counted
boundary logins (±8h around Manila midnight) relative to every other
day-count in the app.

Both changes are pinned in the rewritten `tests/lib/windows.test.ts` (28 tests,
including the two B-1/B-7 boundary regressions and bucket-alignment checks).

## 3. §4.5 / §4.7 — Ingest batching + atomic checkpoints (DB opts 5 & 7)

**Light poll (`app/api/ingest/route.ts`):** the per-member write loop (~150
sequential round-trips per 5-minute poll against the serverless pooler: ~50
prior-snapshot SELECTs + ~50 snapshot INSERTs + up to ~50 member UPDATEs) is
now 4 statements:

- one `DISTINCT ON (player_tag)` query for every member's latest prior
  snapshot (the per-member `insertMemberSnapshot` helper is gone),
- one multi-row INSERT for all activity snapshots (flags computed in bulk from
  the prior map by the same pure `computeActivityFlags`),
- one `UPDATE … FROM (VALUES …)` for member refresh fields,
- one multi-row INSERT for the (rare) TH-upgrade/rename events, and one for
  join/leave/rejoin events.

**Checkpoints (`lib/ingest/checkpoints.ts`):** the N sequential UPDATEs became
a single `UPDATE … FROM (VALUES …)` inside a transaction — a mid-loop failure
used to leave half the roster stale while the purge that depends on the
checkpoints proceeded.

**Correctness notes:** "refresh" membership ops still emit no event row; joins
and rejoins are refreshed by their own ops before the bulk refresh runs (the
bulk refresh targets only known retained members, as before).

## 4. §4.3 / §4.10 — Query-layer dedup and small wins (DB opts 3 & 10)

- `fetchBoundedSnapshots` (`lib/db/queries.ts`) is request-deduped via
  `React.cache` keyed by primitives (sorted tag key + epoch millis). The
  dashboard's 3 donation functions × 3 windows all pass the same
  `lastPolledAt`, so the 9 calls collapse to 3 — one per window.
- `getWarParticipationSummary` (`lib/db/member-queries.ts`) aggregates with a
  SQL `GROUP BY` instead of loading every `war_participants` row into JS.
- `getMemberDetail`'s `recentWars` loop fetches its 10 wars with one
  `inArray` instead of 10 sequential per-war SELECTs.

## 5. §8 — Testing additions (the CI gate + extracted algorithms)

- **CI route-mode assertion** (`.github/workflows/ci.yml` new `route-modes`
  job + `scripts/assert-route-modes.sh`): builds the app with a dummy
  DATABASE_URL (pages render their existing error/empty states) and asserts
  the route table — six content routes `○ (Static)` with their intended
  revalidate periods (15m/1h/5m), five API routes `ƒ (Dynamic)`. This single
  check would have caught the original A-1 cookie regression the day it
  landed. The script was verified against a real build log and its failure
  path tested.
- **Streak algorithm extracted + tested** (`lib/scoring/login-streak.ts`,
  `tests/lib/login-streak.test.ts`): `longestClanTzDayStreak` /
  `dedupeClanTzDays` now live in the pure-logic layer with the B-1
  Manila-boundary regression cases pinned (Mon 23:55 → Wed 00:05 breaks the
  streak; logins either side of Manila midnight are consecutive days).
  `diffCalendarDaysInClanTz` moved to `lib/time/windows.ts` as shared
  infrastructure.
- **Purge retention model** (see §1 above) — the "most destructive code path
  in the app" now has an executable specification and a fuzz test.
- `unit-icon-map.test.ts` now checks every mapped asset **exists on disk**
  under `public/` (was string-only — a renamed asset would 404 in the browser
  while tests stayed green).
- `tests/README.md` updated to cover all 15 files / 176 tests.
- The dead `fixtureCurrentWar` fixture was deleted.

A disposable-Postgres integration suite remains out of scope — no Docker or
local Postgres is available in the authoring environment, and wiring an
unverified CI job was riskier than the pure-model approach above. The
documented upgrade path stands (tests/README.md "What's NOT tested").

## 6. B-12 — Footer auto-reload removed (P3)

`components/layout/footer.tsx` no longer forces `window.location.reload()`
when a poll looks overdue — under ISR a reload just re-serves the same cached
HTML, so it was wasted work that could even loop on a slow poll. The overdue
countdown state remains visible; the ISR timers refresh the data.

## 7. §6.4 — Dead code + duplication cleanup

| Removed / consolidated | Detail |
|---|---|
| `components/ui/data-table.tsx` | 404 lines, fully built, used by nothing — deleted (plus its barrel exports) |
| `components/ui/card-mount.tsx` | unused — deleted |
| `Sheet` export (`components/ui/modal.tsx`) | unused, and the only framer-motion dependency in the file — the Modal animates with CSS+rAF, so framer-motion no longer ships through the modal path on every page (it remains in `page-transition.tsx`, its only genuine consumer) |
| 8 unused icon wrappers | `IconCheck`, `IconTrendingUp`, `IconGrip`, `IconPlus`, `IconTrash`, `IconSave`, `IconFilter`, `IconSearch` — zero usages outside `icons.tsx` |
| `scripts/seed-hof.ts` | byte-for-byte duplicate of `trigger-hof.ts` — deleted |
| `formatRole` ×2 | single shared definition in `lib/view-models/members.ts` |
| local `StatCard` naming collision | war-detail-sheet's own-vs-opponent card renamed `ComparisonStatCard` (semantically distinct from `ui/StatCard`) |

## 8. §6.6 — Accessibility

- **Members roster** (`components/members/members-roster.tsx`): desktop rows
  are keyboard-operable (`tabIndex`, `role="button"`, Enter/Space opens the
  detail sheet, accessible row name) — previously click-only, which locked
  keyboard users out of member details entirely. The mobile cards already
  were buttons and gained the accessible name.
- **War rosters** (`components/war/war-rosters.tsx`): own-clan rows get the
  same keyboard treatment.
- **`Select`** (`components/ui/select.tsx`): full combobox semantics —
  `aria-haspopup`/`aria-expanded` on the trigger, `listbox`/`option` with
  `aria-selected` in the popup, arrow-key/Home/End navigation, Escape to
  close and restore focus, Enter/Space to select. The three members-page
  selects pass `ariaLabel`.
- **Search input**: `aria-label` added (was placeholder-only labeling).
- **Decorative glyphs**: the `★` glyphs (war hero, war rosters, `Stars`) are
  `aria-hidden` with `aria-label`s carrying the meaning ("N of 3 stars",
  "N stars"); the donation ↑/↓ pairs carry `sr-only` text.

## 9. §5 — Client-side performance

- **Memoized roster rows** (§5): the ~50 members × 2 markups re-rendered on
  every search keystroke; `MemberRowDesktop` / `MemberRowMobile` are now
  `React.memo` components.
- **iOS background fix**: `background-attachment: fixed` is ignored or janky
  on iOS Safari — a `@supports (-webkit-touch-callout: none)` override
  scroll-attaches the body background there.

## 10. §6.1 / §6.5 / §6.8 — Config, lint scope, npm scripts

- `lib/env.ts`: the `.env`-reading sandbox workaround is now gated to
  non-production callers (drizzle.config.ts explicitly opts in — it's a dev
  tool that also runs during local `next build`). Dev-tool logic no longer
  lives unconditionally in the production path.
- `lib/db/index.ts`: the `rejectUnauthorized: false` pool now carries an
  explicit ACCEPTED-RISK comment + TODO for the provider CA bundle.
- `eslint.config.mjs`: the global `react-hooks/set-state-in-effect: "off"` is
  removed — the repo lints clean with the rule active; the comment documents
  how to scope an inline disable if it ever fires on the Modal's mount-guard.
- `package.json`: `db:push` now runs `drizzle-kit push` (it aliased the
  migrate script and never performed a schema push).

---

## Still open (tracked)

1. **§7 Feature additions** (webhooks, deep-linkable profiles, CSV export,
   career deltas, …) — feature work, not defects; each is scoped in the
   assessment.
2. **Disposable-Postgres integration suite** (§4.9/§8.3) — blocked on an
   environment with Docker/Postgres; the purge rule is meanwhile pinned by
   the pure-model fuzz test.
3. **War refresh button** (B-9 residual): the stale-notice points at the
   scheduled sync (correct); resurrecting the button is a product decision.
4. **Suspense/loading boundaries** — once routes are static the pages
   revalidate in the background; revisit only if revalidation latency ever
   becomes visible.

# Phase 2 Execution Log — Quick Wins

**Date:** 2026-09-13
**Scope:** [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §2 (2.1 deep-linkable member profiles, 2.2 donation-ratio flags, 2.3 war-log XP enrichment).
**Status:** Implemented and verified (vitest 210/210, `tsc --noEmit` clean, `eslint .` clean, `next build` green, `scripts/assert-route-modes.sh` all green).

---

## 2.1 Deep-linkable member profiles

**What shipped.** `/members?tag=%23XXXXXXXX` opens that member's detail sheet on load; the URL is now the source of truth for "which member is open" on the members page.

**Files.**

- `components/members/members-shell.tsx` — rewritten as the URL-synced selection owner: reads `?tag=` in a mount effect (validated against the roster — a stale/typo'd link lands on the plain roster, not an error sheet), `pushState` when opening a member (so browser Back closes the sheet), `replaceState` when switching members while a sheet is open (no history-entry stacking), and a `popstate` listener that keeps the sheet in sync with Back/Forward.
- `lib/member-links.ts` — new `memberProfileHref(playerTag)` helper; the single canonical `/members?tag=…` builder.
- `components/dashboard/needs-attention.tsx`, `components/dashboard/clan-log.tsx` — rows converted from `onMemberClick` popups to `<Link href={memberProfileHref(tag)}>` deep links. Purged clan-log rows (no profile to open) render as a disabled non-link.
- `components/dashboard/dashboard-shell.tsx` — `onMemberClick` props removed from the `AttentionPanel` / `ClanLogPanel` call sites (the dashboard's local sheet stays for the donation/activity leaderboards, which keep their in-page popup).

**Deliberate deviation from the plan.** The plan sketched `useSearchParams` on the members page. That API would suspend the route on a client boundary and force `/members` out of static prerendering — breaking the ISR/route-modes CI contract (`scripts/assert-route-modes.sh` asserts ○ with revalidate 3600). Reading `window.location.search` inside a mount effect is hydration-safe (first client render matches SSR: sheet closed) and keeps the route static. This is the same class of decision as Phase 1's `memberProfileHref` extraction: the contract wins over the sketch.

**Acceptance.** Shareable URL opens the correct sheet ✔ (mount effect + roster validation); direct navigation works ✔ (no hydration warnings — sheet state is exclusively post-mount); Back closes the sheet ✔ (pushState on open, popstate listener syncs); needs-attention and clan-log rows link into it ✔.

## 2.2 Donation-ratio needs-attention flags

**What shipped.** A fourth "Low donation ratio" group in the attention queue: members who received at least `receivedFloor` troops over the configured window while giving back less than `minRatio` of what they took, sorted worst-first.

**Files.**

- `lib/scoring/donation-ratio.ts` — new pure module: `parseDonationRatioSettings` (untrusted-JSONB → clamped settings), `isBelowDonationRatio` (the threshold decision), `donationRatioDetail` (queue row detail string). Defaults: `{ enabled: true, minRatio: 0.5, windowDays: 30, receivedFloor: 200 }`.
- `lib/db/runtime-settings.ts` — new `getRuntimeSetting(key)` reader: `withCache`'d for 60 s per key, null-on-error (a missing/broken setting degrades to code defaults — config must never take a page down).
- `lib/time/windows.ts` — new `computeDayWindow(days)`: the general form of the "7d"/"30d" cases for the runtime-configurable window (equivalence with the presets is pinned in `tests/lib/windows.test.ts`).
- `lib/db/queries.ts` (`getNeedsAttention`) — reads the `needsAttention.donationRatio` key, computes reset-aware per-member window totals via the existing `fetchBoundedSnapshots` + `calculateDonationWindow` machinery (bounded fetch: baseline + in-window only), applies the pure threshold, sorts worst-first.
- `lib/view-models/dashboard.ts` — `NeedsAttention` gains `belowDonationRatio[]` + `donationRatio: { minRatio, windowDays } | null`.
- `components/dashboard/needs-attention.tsx` — new `gift` icon type.
- `components/dashboard/dashboard-shell.tsx` — the group renders only when `donationRatio !== null` (disabled category = no group, not an empty one), labeled with the live threshold.
- `tests/lib/donation-ratio.test.ts` — 15 unit tests: settings parsing (defaults, overrides, per-field fallback, clamping, rounding), threshold semantics (disabled, flagged, boundary-at-exactly-min, request-light exemption, zero-received guard, overrides), detail formatting.

**Semantics worth restating.** The `receivedFloor` (default 200) is the noise filter: a member who received 20 troops this month and gave 0 is not a needs-attention signal — request-light members are exempt by design. The ratio is computed from reset-aware donation accounting (`calculateDonationWindow`), so weekly Supercell resets don't corrupt the totals. Exactly-at-threshold is not flagged (strictly below only).

**Override path (no admin UI, by design).**

```sql
INSERT INTO runtime_settings (key, value)
VALUES ('needsAttention.donationRatio',
        '{"enabled":true,"minRatio":0.5,"windowDays":30,"receivedFloor":200}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

The 60 s reader cache means an override lands within a minute, without a deploy.

## 2.3 War-log XP enrichment

**What shipped.** War history rows show the clan XP earned per war (amber chip with the derived per-attack value) wherever the API provides it.

**Files.**

- `drizzle/0012_war_log_xp.sql` — `wars.exp_earned integer` + `wars.exp_per_attack real` (journal entry 0012). Auto-applies on the next Vercel deploy (build = `drizzle-kit migrate && next build`).
- `lib/db/schema.ts` — the two columns, with null-semantics documented inline.
- `lib/ingest/war-sync.ts` (`backfillWarLog`) — writes `expEarned` from the warlog payload (`CocWarLogEntry.clan.expEarned`, already typed) and derives `expPerAttack = expEarned / attacks`. The backfill is the sole writer: `/currentwar` has no XP field, so live-tracked wars pick their XP up on the first daily backfill after ending. `syncCurrentWar`'s update set intentionally omits both fields, so a poll refresh never clobbers backfilled XP.
- `lib/view-models/war.ts`, `lib/war/war-snapshot.ts`, `lib/db/war-queries.ts` — `WarHistoryEntry` / `HistoryProjection` / `toHistoryEntry` / the history projection all carry the two fields.
- `components/war/war-history.tsx` — amber XP chip in the Type/Meta cell, null-safe (CWL rows and pre-enrichment rows render nothing; no fabricated zeros), per-attack value in the chip with a full tooltip.
- `tests/war/war-snapshot.test.ts` — projection fixtures extended; XP mapping and null-propagation asserted.

**Enrichment is the backfill itself.** No one-shot script: the daily backfill is an idempotent upsert, so the first run after deploy fills every existing warlog-backed row, and repeat runs write the same values.

---

## Verification

| Check | Result |
|---|---|
| `bun run test` (vitest) | 210/210 green (195 pre-existing + 15 new donation-ratio + 3 computeDayWindow, war-snapshot XP assertions folded into existing cases) |
| `bun run typecheck` (`tsc --noEmit`) | clean |
| `bun run lint` (`eslint .`) | clean |
| `bunx next build` | green |
| `scripts/assert-route-modes.sh` | all green — six content routes still ○ (Static) with intended revalidate, API routes ƒ (Dynamic) |

**Deployment notes.** Migration 0012 auto-applies on deploy. The donation-ratio category goes live with code defaults immediately after deploy (no runtime_settings row required). XP chips self-fill on the next daily warlog backfill.

# 12 — Roadmap & Modularity

## Phase 0 — Foundation ✅ COMPLETE

Everything here is done, deployed, and verified running:

- [x] CoC API key created, whitelisting RoyaleAPI proxy IP (`02-api-and-proxy-strategy.md`).
- [x] `lib/coc-client/client.ts` — typed proxy client routing through `cocproxy.royaleapi.dev`, tag URL-encoding, server-only.
- [x] Neon database provisioned via Vercel Marketplace integration.
- [x] `lib/db/schema.ts` — full Drizzle schema: `clans`, `members`, `member_snapshots`, `unit_levels`, `wars`, `war_participants`, `war_attacks`, `capital_district_snapshots`.
- [x] `drizzle/0000_slim_shatterstar.sql` — initial migration generated and committed. Runs automatically on every Vercel deploy (`"build": "drizzle-kit migrate && next build"`).
- [x] `/api/ingest` — light-poll + daily-batch logic: member diffing, activity/login-day flags with weekly-reset handling, currentwar sync (preparation + inWar + warEnded), daily clan-cache refresh, capital district snapshots, career stats + war preference + unit levels.
- [x] `/api/cron/purge` — 14-day retention purge, hardened to fail explicitly if `CRON_SECRET` is unset.
- [x] `.github/workflows/poll.yml` — two schedules: light poll every ~10 min, daily batch at 04:17 UTC. Manual trigger via `workflow_dispatch`.
- [x] `vercel.json` — daily Vercel Cron for purge at 18:00 UTC.
- [x] `config/clan.config.ts` — clan tag, timezone, retention days, feature toggles, poll interval, confidence threshold.
- [x] `lib/reference-data/*.json` — stub files (troop-caps, hero-caps, spell-caps, pet-caps, equipment-caps). Data not yet populated — blocks rushed % in Phase 2, not Phase 1.
- [x] Vercel environment variables set: `COC_API_TOKEN`, `COC_API_BASE_URL`, `DATABASE_URL`, `INGEST_SECRET`, `CRON_SECRET`.
- [x] GitHub repo secrets set: `INGEST_SECRET`, `VERCEL_APP_URL`.
- [x] End-to-end verified: workflow runs, data lands in database, 5 members polled successfully.

---

## Phase 1 — 

## Last Phase — 

### Step 1: Auto-select scoring

1. **`lib/scoring/war-select.ts`** — implement the composite scoring formula from `09-war-planning-and-auto-select.md`. Five factors: activity, participation rate, avg stars, 3-star rate, rushed %. Configurable weights.
2. **Confidence flagging** — "limited data" flag for members below `minWarsForConfidentRanking` wars.
3. **Integrate into roster builder** — composite score as default sort in available-roster panel, per-factor breakdown visible per member.
4. **Runtime settings page** — editable scoring weights, inactivity threshold. Database-backed (`11-config-specification.md`).

### Step 2: Capital raid weekends (full)

1. **Add `capitalraidseasons` to ingest** — poll completed raid weekend results from the API.
2. **Per-raid-weekend summary** — total gold looted, attacks used vs available, medals earned.
3. **Per-member contribution leaderboard** — current and trended over past weekends.
4. **Participation rate** — members at 0/6 attacks.

### Step 3: Mobile polish

1. PWA manifest + service worker (installable, offline shell) — incremental, not a rebuild.
2. Full real-device testing pass on iOS Safari and Android Chrome.

---

## Staying modular against game updates

- Isolate the CoC response shape behind `lib/coc-client` (`01-tech-stack.md` repo layout) — a Supercell response change stays contained to the client/typing layer and the reference JSON files.
- `lib/reference-data/*.json` (TH-level caps per unit, `06-members.md`) and the unit-icon mapping are the two things most likely to go stale after a balance patch or new Town Hall level. Update them after major game updates, not on a fixed schedule — a new unit or TH level means a new entry in these files, not a code change.
- Feature toggles in `clanConfig.features` let a broken or unwanted feature be switched off without a code revert.
- Derive max-Town-Hall-level logic from the reference data, not a hardcoded number.

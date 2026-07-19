# 12 — Roadmap & Modularity

## Build order

**Phase 0 — Foundation**
- CoC API key + RoyaleAPI proxy wired up (`02-api-and-proxy-strategy.md`).
- Neon database provisioned, core schema migrated (`03-data-model-and-database.md`).
- `/api/ingest` + GitHub Actions poller running end-to-end, both the light poll and daily batch schedules (`04-activity-tracking-and-polling.md`).
- Config file + env vars + repo secrets in place (`11-config-specification.md`).

**Phase 1 — Read-only core**
- Main Dashboard: donations, activity graph, all-time war record, clan info panel, needs-attention panel.
- Members List + detail popup: activity, login activity graph, war participation, career stats, war-preference badge, troop/hero cards. Rushed % ships once the TH-cap reference JSON (`06-members.md`) is ready.
- Clan War: history list, live current-war view with manual refresh, preparation-day scouting view.
- Clan Capital: raid-weekend dashboard, district-level upgrade tracking.

**Phase 2 — Depth and planning**
- Rushed % analysis, once the TH-cap reference JSON is verified.
- War Planning: drag-and-drop roster builder (manual mode, war-preference-aware), saved drafts.

**Phase 3 — Auto-select and polish**
- War-planning auto-select ranking, once enough war history has accumulated (`09-war-planning-and-auto-select.md`) — a data gate, not a code-readiness gate.
- Mobile polish pass against real devices (`10-mobile-support.md`).

## Staying modular against game updates

- Isolate the CoC response shape behind `lib/coc-client` (`01-tech-stack.md` repo layout) — a Supercell response change stays contained to the client/typing layer and the reference JSON files.
- `lib/reference-data/*.json` (TH-level caps per unit, `06-members.md`) and the unit-icon mapping are the two things most likely to go stale after a balance patch or new Town Hall level. Update them after major game updates, not on a fixed schedule — a new unit or TH level means a new entry in these files, not a code change.
- Feature toggles in `clanConfig.features` let a broken or unwanted feature be switched off without a code revert.
- Derive max-Town-Hall-level logic from the reference data, not a hardcoded number.

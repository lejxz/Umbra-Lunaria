# 12 — Roadmap & Modularity

## Build order

**Phase 0 — Foundation**
- CoC API key + RoyaleAPI proxy wired up (`02-api-and-proxy-strategy.md`).
- Neon database provisioned, core schema migrated (`03-data-model-and-database.md`).
- GitHub Actions poller running end-to-end (`04-activity-tracking-and-polling.md`).
- Config file + env vars in place (`11-config-specification.md`).

**Phase 1 — Read-only core**
- Main Dashboard: donations, activity graph, clan-level stat cards.
- Members List + detail popup: activity, login activity graph, troop/hero cards. Rushed % ships once the TH-level-cap reference table is ready.
- Clan War: history list + live current-war view with manual refresh.
- Clan Capital: raid-weekend dashboard.

**Phase 2 — Depth and planning**
- Rushed % analysis.
- War Planning: drag-and-drop roster builder (manual mode), saved drafts.
- Leadership auth (Discord OAuth) gating write actions.

**Phase 3 — Auto-select and polish**
- War-planning auto-select ranking, once enough war history has accumulated (`09-war-planning-and-auto-select.md`) — a data gate, not a code-readiness gate.
- Mobile polish pass against real devices (`10-mobile-support.md`).

## Staying modular against game updates

- Isolate the CoC response shape behind `lib/coc-client` (`01-tech-stack.md` repo layout) — a Supercell response change stays contained to the client/typing layer and the static reference tables.
- The TH-level-cap reference table (`06-members.md`) and the unit-icon mapping are the two pieces most likely to go stale after a balance patch or new Town Hall level. Update them after major game updates, not on a fixed schedule.
- Feature toggles in `clanConfig.features` let a broken or unwanted feature be switched off without a code revert.
- Derive max-Town-Hall-level logic from the reference table, not a hardcoded number.

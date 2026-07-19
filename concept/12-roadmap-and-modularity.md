# 12 — Roadmap & Modularity

## Why this order

The feature list in the brief is roughly in priority order already, but two things in this plan change the practical build order:

1. **Nothing works without the proxy, database, and poller first.** Every feature past the raw dashboard depends on stored history existing. Building UI before ingestion exists means building against fake data and redoing it later.
2. **War planning's auto-select is the one feature that is *structurally* not useful on day one** (`09-war-planning-and-auto-select.md`) — it needs weeks of accumulated war data to say anything meaningful. It should be built, but expectations should be set that it starts weak and improves.

## Proposed phases

**Phase 0 — Foundation (no user-visible UI yet)**
- CoC API key + RoyaleAPI proxy wired up and verified (`02-api-and-proxy-strategy.md`).
- Neon database provisioned, core schema migrated (`03-data-model-and-database.md`).
- GitHub Actions poller running end-to-end, writing real snapshots (`04-activity-tracking-and-polling.md`).
- Config file + env vars in place (`11-config-specification.md`).

**Phase 1 — Read-only core**
- Main Dashboard (donations, activity graph, clan-level stat cards).
- Members List + detail popup, *without* rushed % yet if the reference table (below) isn't ready — ship troop/hero cards and activity first, add rushed % once the static data exists.
- Clan War: history list + live current-war view with manual refresh.
- Clan Capital: raid-weekend dashboard — this is now the entire Clan Capital feature; see `08-clan-capital.md` for why district-upgrade tracking was dropped rather than deferred.

**Phase 2 — Depth and planning**
- Rushed % analysis, once the TH-level-cap reference table is built and verified.
- War Planning: drag-and-drop roster builder (manual mode — no auto-select yet), saved drafts.
- Leadership auth (Discord OAuth) gating write actions.

**Phase 3 — Auto-select and polish**
- War-planning auto-select ranking, once enough war history has accumulated to make it meaningful (this is a *data* gate, not a code-readiness gate — it can be code-complete in Phase 2 and still wait to launch here).
- Mobile polish pass against real devices (`10-mobile-support.md`).
- Whatever additional dashboard/member widgets came up along the way.

## Staying modular against future Supercell changes

The brief specifically asks for resilience to game updates. Concretely, that means:

- **Isolate the CoC response shape behind `lib/coc-client`** (see `01-tech-stack.md`'s repo layout). If Supercell adds a new troop, a new hero, or restructures a response field, the fix should be contained to the client/typing layer and the static reference tables — not scattered across every page component that happens to render a troop card.
- **The TH-level-cap reference table (`06-members.md`) and the unit-icon mapping are the two pieces of static data most likely to go stale after a balance patch or new update (new Town Hall level, new troop, new hero equipment).** Treat updating them as a recurring maintenance task, not a one-time build step — realistically, check them after every major in-game update, not on a fixed schedule, since Supercell's release cadence isn't fixed either.
- **Feature toggles in `clanConfig.features`** mean a feature that breaks after a game update (or one the clan just doesn't want) can be switched off without a code revert.
- **Don't hardcode the current max Town Hall level anywhere** that would need a code change every time Supercell adds a new one — derive display/validation from the reference table, not a magic number.

None of this makes the app immune to breakage after a big Supercell update — nothing fully is, for a third-party tool built on an undocumented-in-places public API. The goal is that a breakage is a contained, findable fix (update one reference table, adjust one typed interface) rather than a scavenger hunt through the whole codebase.

# 00 — Finalized Product Concept

## Purpose

Umbra Lunaria is a single-clan Clash of Clans observatory. It turns the current state returned by the official API into a calm, high-signal web experience, and records snapshots so clan leaders can understand activity, donations, war participation, Capital contribution, and member progression over time.

The app has five primary surfaces:

1. **Dashboard** — a summary of clan identity, health, donations, activity, member contribution, current war, and Capital status.
2. **Members** — a filterable roster and detailed member records.
3. **War Center** — regular war, CWL, current-war, preparation, and attack information.
4. **Capital** — district progress, raid-weekend results, and contribution history.
5. **Planning** — a manual roster builder with transparent automatic suggestions.

This is a single-clan product. The configured clan tag is `#2JPCYP98L`; multi-clan support is deliberately out of scope.

## Product contract

Every value shown by the product must belong to one of these categories:

| Category | Meaning | Examples |
|---|---|---|
| **API fact** | Returned directly by Supercell for the current state. | Clan level, badge, war wins, player tag, troop level. |
| **Tracked history** | Observed and stored by Umbra Lunaria after polling begins. | Donation trend, joins/leaves, activity history, war participation. |
| **Derived metric** | Calculated by the application from facts and tracked history. | Win rate, rushed percentage, Member Activity Score. |
| **Unavailable** | Not returned, not yet tracked, or not sufficiently reliable. | True last-login time, pre-tracker donation history, live Capital upgrade cost. |

The UI must label estimated or derived data, show a useful cold-start state, and render unavailable data as unavailable—not as zero or a fabricated value.

## Access model

Read-only clan information is public to anyone with the URL. Administrative mutations are protected:

1. Ingestion and purge routes use machine secrets.
2. Saving/finalizing roster plans and editing runtime settings require an administrator session.
3. No player account system is required; a lightweight clan-admin gate is sufficient.

## Final information architecture

### Dashboard

1. Clan identity and profile card.
2. All-time war record card.
3. Clan Capital summary card.
4. Large donation analytics panel with 24-hour, 7-day, and 30-day views.
5. Member Activity Score leaderboard.
6. Activity timeline.
7. Needs-attention groups.
8. Clickable clan join/leave log.
9. Current-war and Capital navigation summaries.

### Members

1. Sortable and filterable roster.
2. Reusable member detail sheet.
3. Activity, donation, war, career, progression, and Builder Base sections.
4. Rushed-account analysis and maxed-for-Town-Hall indicators.

### War

1. Regular-war and CWL history.
2. Current-war progress and attack log.
3. Preparation-day opponent scouting.
4. Manual, rate-limit-aware refresh.

### Capital

1. Current Capital and district overview.
2. District upgrade timeline.
3. Raid-weekend history and participation once the endpoint is ingested.

### Planning

1. Manual drag-and-drop/tap-to-add roster builder.
2. Draft and finalized rosters.
3. Explainable auto-select ranking, never an autonomous final decision.

## Design direction

The interface is a dark, moonlit clan observatory: restrained purple/lilac accents, strong hierarchy, quiet empty states, and dense information without visual noise. The dashboard is a summary and navigation hub; long tables and complete historical detail belong on dedicated pages.

The design must be mobile-first. A member detail view becomes a full-screen sheet on small screens, tables collapse into readable cards, and planning supports touch as well as drag-and-drop.

Reuse the repository’s assets first. New Clash of Clans unit icons must come from the approved Supercell Fankit source and be copied into a local, documented asset mapping rather than hotlinked at render time.

## Source of truth and document roles

1. [`final-feature-list.md`](final-feature-list.md) is the definitive feature inventory.
2. Documents `01` through `11` explain the finalized product, data, and UX decisions behind that inventory.
3. [`12-Implemantation-plan-and-modularity.md`](12-Implemantation-plan-and-modularity.md) is the current implementation sequence and is intentionally maintained separately.
4. [`13-live-api-reference.md`](13-live-api-reference.md) is evidence of the live API response, not a substitute for the product specification.
5. [`design_proposal.html`](design_proposal.html) is the visual direction for the dashboard shell.

## Non-negotiable constraints

1. The CoC API provides current state, not a universal history.
2. Player tags—not display names—are the permanent member identity.
3. The API has no true last-login field; activity is inferred from observed changes.
4. Donation counters reset weekly and must be calculated with reset-aware deltas.
5. A private war log limits pre-tracker historical war backfill.
6. The API provides completed Capital district levels, not live upgrade cost or progress.
7. Rushed analysis requires maintained Town Hall cap reference data because the API does not provide caps by Town Hall.

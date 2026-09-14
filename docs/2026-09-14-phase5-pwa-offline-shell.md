# Phase 5 — PWA/Offline Shell (F12)

**Date:** 2026-09-14
**Plan:** [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §"Phase 5 — PWA/offline shell"
**Status:** executed — this completes every phase of the roadmap (1–6).

## Summary of Session

Implemented the plan's Phase 5 exactly as scoped, with no new dependencies: a hand-rolled service worker (~60 lines of strategy code in `public/sw.js`), a web app manifest with generated icons, iOS home-screen metas via the Next.js Metadata API, a zero-JS static `/offline` shell page, a guarded + versioned registration client component, a `clanConfig.features.pwa` kill switch that actively uninstalls the SW from existing clients, and `Cache-Control: no-cache` headers so SW updates always propagate. The full offline lifecycle was verified against a real browser (Playwright) including the airplane-mode load and the version-bump update flow.

## Work Completed

| Piece | File(s) | Notes |
|---|---|---|
| Manifest | `public/manifest.webmanifest` | `display: standalone`, `start_url: "/"`, `id: "/"`, theme/background `#090811` (the app's actual surface color), three icon entries. |
| Icons | `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `app/apple-icon.png` | Generated from the existing `app/icon.png` (817×817 RGBA). The maskable variant scales the logo into the center 80% safe zone over an opaque `#090811` canvas; the apple icon bakes the background in because iOS composites transparency onto black. |
| iOS + head metas | `app/layout.tsx` | Metadata API: `manifest`, `appleWebApp` (capable / black-translucent status bar / title), `viewport.themeColor`. Next 15.5 emits the unprefixed `mobile-web-app-capable` from `capable: true`, so the plan-named `apple-mobile-web-app-capable` is added via `metadata.other` — both metas coexist harmlessly. |
| Service worker | `public/sw.js` | Strategy matrix: HTML navigations **network-first with cache fallback**, final fallback = precached `/offline`; `/_next/static/*` + `/assets/*` **stale-while-revalidate**; manifest/icons **cache-first**; `/api/*` and cross-origin **never intercepted**. `install` precaches `/offline` + the body background image; `skipWaiting()` on install; `activate` purges every cache from any other version + `clients.claim()`. |
| Registration | `components/pwa/service-worker.tsx` (new) | Client component in the root layout, renders null. Guards: no `serviceWorker` container → no-op; `NODE_ENV !== "production"` → no-op (the SW never caches dev HTML). Kill switch: `clanConfig.features.pwa === false` → unregister every registration + delete every cache. Versioning: `REGISTRATION_VERSION` marker in localStorage; on mismatch → deterministic teardown + fresh register (an explicit unregister path for updates, per the plan — no reliance on the browser's 24-hour sw.js revalidation). |
| Offline page | `app/offline/page.tsx` (new) | Static (`force-static`), zero client JS: states "You are offline — showing your last visit", explains that visited pages reopen as their last-visit version and that live values are never served offline. "Retry connection" is a plain same-URL `<a>` — a full re-navigation, which re-runs the SW's network-first fetch. |
| Kill switch | `config/clan.config.ts` | `features.pwa: boolean` in the interface (documented: `false` = clients uninstall on next visit) + `pwa: true` default. |
| Cache headers | `next.config.ts` | `/sw.js` and `/manifest.webmanifest` served `Cache-Control: no-cache` (revalidate every time, still disk-cacheable) and the manifest pinned to `application/manifest+json` — independent of host defaults. |

## Decisions Made

- **No `next-pwa`.** As the plan specified: a Next-15-compat risk not worth ~60 lines of strategy code. The hand-rolled SW has zero dependencies and cannot break on framework upgrades.
- **Three converging cleanups in the update flow.** During execution the browser test exposed a real race in the naive version-bump path: after the registration component unregisters the old SW, that (zombie) worker still controls the page for the remainder of the session, and its stale-while-revalidate handler re-created the **old** cache *after* the new worker's `activate` purge had run — leaving permanent duplicate caches. Fixes: (1) `skipWaiting()` on install so the new worker takes over immediately; (2) the `activate` purge (already planned); (3) a page-side `sweepStaleCaches()` after `register()` resolves and again on `controllerchange`. Re-tested end-to-end: after a version bump the client converges to exactly one cache of the new version.
- **iOS metas via the Metadata API** rather than raw `<meta>` tags in the layout — same emitted bytes, typed, and consistent with how the title/description are already handled.
- **The offline page is a plain anchor, no `onClick`.** Keeps the shell page a server component with zero client JS — important because this page is the precached fallback and must never fail to hydrate.
- **`/offline` is `force-static`.** It must render without a database — the layout's poll-status fetch runs at build time only, which is exactly the "last visit" honesty the disclaimer describes.
- **Version 1 ships.** Both `SW_VERSION` (in `sw.js`) and `REGISTRATION_VERSION` (in the component) are `1`. They are bumped **together** on any future shell-strategy change — the component's teardown path makes the update deterministic and the browser picks up new bytes immediately thanks to the `no-cache` header.

## Verification

- `tsc --noEmit`, `eslint .` clean; `vitest run` 19 files / **264 tests** green (unchanged — the SW is not unit-testable in vitest's node environment by design; its contract was verified live instead).
- `next build` + `scripts/assert-route-modes.sh`: all six content routes still Static/ISR with intended periods, API routes dynamic; `/offline` (○ Static, 164 B) and `/apple-icon.png` (○ Static) added to the route table without affecting anything else.
- Live-browser verification (Playwright/Chromium against `next start`):
  - Registration: scope `/`, controller active, version marker stored, exactly one cache after first load.
  - Installability inputs: `/manifest.webmanifest` 200 with `Content-Type: application/manifest+json` + `Cache-Control: no-cache`; `/sw.js` 200 with `Cache-Control: no-cache`; all three manifest icons + `apple-icon.png` 200; `<link rel="manifest">`, `<link rel="apple-touch-icon">`, `theme-color`, both `*-web-app-capable` metas present in the rendered `<head>`.
  - **Airplane mode** (server process killed, not emulated — Playwright's offline flag does not intercept service-worker fetches): visited `/` reloads from cache with full styling (background image precached); never-visited `/hall-of-fame` falls back to the offline shell at the original URL; a direct `fetch('/api/analytics')` from the page fails (network down) — and zero `/api/*` entries ever appear in the cache.
  - **Update flow**: bumped both versions, rebuilt, restarted — after one navigation the client held exactly one registration and one cache (`umbra-lunaria-v2`), marker updated, page controlled. The zombie-cache race was reproduced first with the naive approach (two caches persisted) and re-verified fixed after the three-cleanup fix (single cache).
  - Kill-switch path exercised in a scratch copy (unregister-everything + marker removal) — code-identical to the `features.pwa: false` branch.

## Notes for the owner

- Lighthouse's "installable" check needs the production URL (HTTP(S) + manifest + 192/512 icons + SW with fetch handler — all present here); run it once deployed to confirm the install prompt.
- Data honesty contract: the SW never caches `/api/*`; HTML is network-first — offline clients only ever see last-visit pages or the explicit offline shell. There is no stale-data trap beyond the documented "last visit" disclaimer.
- To ship a future shell change: bump `SW_VERSION` in `public/sw.js` **and** `REGISTRATION_VERSION` in `components/pwa/service-worker.tsx` to the same value, deploy. Clients tear down and re-install deterministically on their next visit.
- To disable the SW: set `features.pwa: false` in `config/clan.config.ts` and deploy — clients unregister on next visit.

## Next Action

None — every phase (1–6) of the [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) roadmap is now implemented. Remaining ideas live in the assessment's unselected items (§7) and can be planned into a second roadmap whenever wanted.

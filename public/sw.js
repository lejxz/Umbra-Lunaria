/*
 * Umbra Lunaria service worker — hand-rolled PWA shell
 * (docs/2026-09-11-implementation-plan.md, Phase 5).
 *
 * Strategy matrix (v1, deliberately minimal):
 *   - HTML navigations ......... network-first, cache fallback, then the
 *                               precached /offline shell ("last visit" data).
 *   - /_next/static/* + /assets/* stale-while-revalidate (immutable or
 *                               slow-moving assets: JS/CSS chunks, fonts,
 *                               images).
 *   - /api/* .................... NEVER intercepted — always network, so
 *                               there is no stale-data trap for live data.
 *   - manifest/icons ............ cache-first (tiny, near-static).
 *
 * Update flow: SW_VERSION is the shell-strategy version. Bump it together
 * with REGISTRATION_VERSION in components/pwa/service-worker.tsx. The
 * registration component tears the old registration down deterministically
 * and registers this file fresh; install() then calls skipWaiting() so the
 * new worker takes over immediately (no waiting state, and the outgoing
 * worker stops receiving fetches as soon as clients.claim() lands —
 * shrinking the window where a zombie worker could still write its old
 * cache). activate() purges every cache from any other version, and the
 * registration component sweeps leftovers once more after registration —
 * three converging cleanups so a half-updated client can never serve mixed
 * shell assets.
 *
 * sw.js itself is served with Cache-Control: no-cache (next.config.ts), so
 * the browser's update check always sees the current bytes.
 */
const SW_VERSION = 1;
const CACHE = `umbra-lunaria-v${SW_VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  // Take over from any currently-controlling worker as soon as this worker
  // finishes installing — see the update-flow note above.
  self.skipWaiting();
  // The shell is the only thing we hold on install: the /offline page (plus
  // the background image it inherits from the global body style).
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/assets/Clan-Card-Background.png"])),
  );
});

self.addEventListener("activate", (event) => {
  // Purge caches from any other version, then take over existing clients.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(event) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(event.request);
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(event.request);
    return cached || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || refresh || Response.error();
}

async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const cache = await caches.open(CACHE);
  const response = await fetch(event.request);
  if (response.ok) cache.put(event.request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // other hosts: never touch
  if (url.pathname.startsWith("/api/")) return; // live data: never cache

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(event));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(staleWhileRevalidate(event));
  } else if (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(event));
  }
});

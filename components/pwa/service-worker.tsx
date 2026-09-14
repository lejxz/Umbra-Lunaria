"use client";

/**
 * ServiceWorkerRegistration — mounts the PWA shell (Phase 5 of the
 * implementation plan, docs/2026-09-11-implementation-plan.md).
 *
 * Renders nothing. On mount it registers /public/sw.js under scope "/".
 *
 * Guarded:
 *   - no ServiceWorkerContainer (all iOS < 11.3, desktop Safari < 11.1,
 *     old browsers) → no-op.
 *   - dev server (`next dev`) → no-op, so the SW never caches in-flight
 *     dev HTML and wrecks the hot-reload loop. Production builds only.
 *
 * Kill switch:
 *   - `clanConfig.features.pwa === false` → actively unregisters every
 *     registration and deletes every cache, then stays dormant. Flipping
 *     the config therefore removes the SW from already-installed clients
 *     on their next visit, not just from new ones.
 *
 * Versioned:
 *   - REGISTRATION_VERSION is stored in localStorage. When it changes
 *     (i.e. we shipped a new shell strategy), we tear the old registration
 *     and caches down deterministically and register fresh — no reliance on
 *     the browser's own 24-hour sw.js revalidation to notice the change.
 */

import { useEffect } from "react";
import { clanConfig } from "@/config/clan.config";

const REGISTRATION_VERSION = "1";
const VERSION_KEY = "umbra-lunaria:sw-registration-version";
const CACHE_PREFIX = "umbra-lunaria-v";

async function unregisterEverything(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((key) => caches.delete(key)));
}

/** Delete every cache that does not belong to the CURRENT shell version.
 *
 * Why this exists: while a new SW is installing, the outgoing (possibly
 * already-unregistered) worker can still be the page's controller for a
 * few moments — long enough for its stale-while-revalidate handler to
 * re-create the old cache AFTER the new worker's activate purge ran. This
 * sweep runs after registration and again on controllerchange, converging
 * the cache set to exactly one version on every load.
 */
async function sweepStaleCaches(): Promise<void> {
  const keep = `${CACHE_PREFIX}${REGISTRATION_VERSION}`;
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== keep).map((k) => caches.delete(k)));
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let storedVersion: string | null = null;
    try {
      storedVersion = window.localStorage.getItem(VERSION_KEY);
    } catch {
      // Private mode / storage disabled — fall through to plain registration.
    }

    const enable = clanConfig.features.pwa;

    if (!enable) {
      // Kill switch: remove the SW from this client entirely.
      void unregisterEverything().catch(() => undefined);
      try {
        window.localStorage.removeItem(VERSION_KEY);
      } catch {
        // Ignore — nothing else to do without storage.
      }
      return;
    }

    const staleInstallation =
      storedVersion !== null && storedVersion !== REGISTRATION_VERSION;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => {
          try {
            window.localStorage.setItem(VERSION_KEY, REGISTRATION_VERSION);
          } catch {
            // Registration still works without the version marker; only
            // the deterministic-update path degrades.
          }
          // Convergence sweep (see sweepStaleCaches docblock).
          void sweepStaleCaches().catch(() => undefined);
        })
        .catch(() => undefined);
    };

    // controllerchange fires when a freshly-installed worker takes over
    // (skipWaiting + clients.claim in sw.js) — one more chance to remove
    // anything the outgoing worker wrote during the handover.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      void sweepStaleCaches().catch(() => undefined);
    });

    if (staleInstallation) {
      // Version bump: clean slate, then install the current SW.
      void unregisterEverything()
        .catch(() => undefined)
        .then(register);
    } else {
      register();
    }
  }, []);

  return null;
}

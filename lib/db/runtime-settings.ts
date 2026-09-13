/**
 * runtime_settings reader (Phase 2.2 — docs/2026-09-11-implementation-plan.md §2.2).
 *
 * The runtime_settings table is the no-admin-UI configuration surface: values
 * are edited directly with SQL (documented at each call site) and read here.
 * The table exists with 0 rows in production — readers must treat "no row"
 * and "unreachable table" identically: code defaults. A missing/broken
 * setting must never take a page down with it.
 *
 * Server-only: imports @/lib/db. Never call from a client component.
 */

import { eq } from "drizzle-orm";
import { withCache } from "@/lib/cache";
import { db } from "@/lib/db";
import { runtimeSettings } from "@/lib/db/schema";

/**
 * Read a runtime_settings value by key. Returns the raw JSONB value (usually
 * an object), or null when the key doesn't exist or the read fails.
 *
 * Cached for 60s per key (process-local, same pattern as getPollStatuses):
 * getNeedsAttention runs on every dashboard render and the ingest loop never
 * writes these keys, so a stale window is at most a minute long — while the
 * cache collapses concurrent renders into one query.
 */
export async function getRuntimeSetting(key: string): Promise<unknown> {
  return withCache(`runtimeSetting:${key}`, async () => {
    try {
      const [row] = await db
        .select({ value: runtimeSettings.value })
        .from(runtimeSettings)
        .where(eq(runtimeSettings.key, key))
        .limit(1);
      return row?.value ?? null;
    } catch {
      // Table missing, DB briefly unreachable, permissions — whatever it is,
      // the caller's code defaults apply. Config must degrade, not crash.
      return null;
    }
  }, 60_000);
}

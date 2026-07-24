/**
 * Runtime settings reader.
 *
 * Reads the runtime-settings document from the `runtime_settings` table.
 * Falls back to `DEFAULT_SETTINGS` when no row exists (cold start) or when
 * the stored document fails validation (defensive — a corrupt write should
 * never break the read path; the admin can re-save a valid value).
 *
 * A short module-level cache (CACHE_TTL_MS) avoids hitting the database on
 * every read during a single render pass. The cache is invalidated when a
 * write happens (see `invalidateRuntimeSettingsCache`).
 *
 * See concept/11-config-specification.md §"Runtime settings" and
 * concept/12 Step 2.0.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { runtimeSettings } from "@/lib/db/schema";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SETTINGS_VALIDATION_VERSION,
  validateSettings,
  type RuntimeSettings,
} from "@/lib/settings/defaults";

const CACHE_TTL_MS = 30_000; // 30s — short enough to pick up admin edits quickly.

let cache: { value: RuntimeSettings; fetchedAt: number } | null = null;

/**
 * Get the effective runtime settings. Always returns a valid
 * `RuntimeSettings` object — either the stored value (when valid) or the
 * defaults. Never throws for a corrupt row.
 */
export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }

  let settings: RuntimeSettings = DEFAULT_SETTINGS;
  try {
    const [row] = await db
      .select()
      .from(runtimeSettings)
      .where(eq(runtimeSettings.key, SETTINGS_KEY))
      .limit(1);

    if (row) {
      const result = validateSettings(row.value);
      if (result.ok) {
        settings = row.value as RuntimeSettings;
      }
      // If invalid, fall through to defaults — a corrupt stored value must
      // not break reads. The admin can POST a valid replacement.
    }
  } catch {
    // DB error — return defaults so read-only pages still render.
  }

  cache = { value: settings, fetchedAt: now };
  return settings;
}

/**
 * Persist a new settings document. Validates first; returns the validation
 * errors without writing when invalid. Stamps the audit columns and bumps
 * the cache.
 *
 * Returns `{ ok: true }` on success or `{ ok: false, errors }` on validation
 * failure. Throws only on unexpected DB errors (the caller maps those to 500).
 */
export async function saveRuntimeSettings(
  next: RuntimeSettings,
  updatedBy: string | null,
): Promise<{ ok: true } | { ok: false; errors: { path: string; message: string }[] }> {
  const result = validateSettings(next);
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  await db
    .insert(runtimeSettings)
    .values({
      key: SETTINGS_KEY,
      value: next,
      validationVersion: SETTINGS_VALIDATION_VERSION,
      updatedAt: new Date(),
      updatedBy,
    })
    .onConflictDoUpdate({
      target: runtimeSettings.key,
      set: {
        value: next,
        validationVersion: SETTINGS_VALIDATION_VERSION,
        updatedAt: new Date(),
        updatedBy,
      },
    });

  invalidateRuntimeSettingsCache();
  return { ok: true };
}

/** Invalidate the in-memory cache. Called after a successful write. */
export function invalidateRuntimeSettingsCache(): void {
  cache = null;
}

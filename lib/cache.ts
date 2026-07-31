/**
 * Server-side TTL cache for expensive query results.
 *
 * Next.js ISR caches the rendered HTML, but the layout (which renders the
 * global footer) re-renders whenever ANY page revalidates. With 6 pages each
 * on different ISR schedules, the layout can re-render several times per hour,
 * each calling `getPollStatuses()`. This cache deduplicates those calls so
 * the DB is only hit once per TTL window, not once per layout render.
 *
 * Process-local — sufficient for a single-instance Vercel deployment.
 * For multi-instance, upgrade to a Redis-backed cache.
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Periodically purge expired entries to prevent unbounded growth.
// Runs on every access (cheap — just a filter).
function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/**
 * Cache an async function's result by key. If the key exists and hasn't
 * expired, returns the cached value without calling `fn`. Otherwise calls
 * `fn`, caches the result, and returns it.
 *
 * @param key   Cache key (must be unique per distinct result)
 * @param fn    Async function to cache
 * @param ttlMs Optional TTL override (default 5 min)
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  purgeExpired();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value as T;
  }
  const result = await fn();
  cache.set(key, {
    value: result,
    expiresAt: Date.now() + (ttlMs ?? 5 * 60 * 1000),
  });
  return result;
}

/** Manually bust a cache entry (e.g. after an ingest). */
export function bustCache(key: string): void {
  cache.delete(key);
}

/** Bust all cache entries (e.g. after a daily batch). */
export function bustAllCache(): void {
  cache.clear();
}

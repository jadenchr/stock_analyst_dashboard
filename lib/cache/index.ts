import { LRUCache } from "lru-cache";

/**
 * Typed LRU cache with explicit TTL per call. Backed by a single shared LRU
 * instance; phase 6 can swap this for Vercel KV without changing call sites.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new LRUCache<string, CacheEntry<unknown>>({
  max: 5_000,
  ttl: 24 * 60 * 60_000, // hard ceiling 24h regardless of caller TTL
});

export interface CacheTtl {
  /** Time-to-live in milliseconds. */
  ttlMs: number;
}

export const TTL = {
  quote: 60_000, //              60s - fast-moving
  fundamentals: 60 * 60_000, //   1h
  financials: 24 * 60 * 60_000, // 24h
  historical: 5 * 60_000, //      5m
  news: 5 * 60_000, //            5m
  insider: 60 * 60_000, //        1h
  search: 10 * 60_000, //         10m
  marketOverview: 60_000, //      60s
  aiAnalysis: 15 * 60_000, //     15m
} as const;

/**
 * Read-through cache: if `key` is present and fresh, return it; otherwise
 * invoke `loader`, store the result, and return it.
 *
 * Loader errors are NOT cached - failed lookups always retry next call.
 */
export async function cached<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await loader();
  store.set(key, { value, expiresAt: now + ttl });
  return value;
}

/**
 * Bypass-cache variant for hot keys (used by `force=true` refresh handlers).
 */
export function invalidate(key: string): void {
  store.delete(key);
}

/**
 * Build a cache key. Always include the route name as the first segment so
 * we never collide across endpoints.
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.map(String).join(":");
}

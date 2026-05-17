import { LRUCache } from "lru-cache";

/**
 * In-process sliding-window rate limiter. Best-effort under serverless
 * (state does not persist across cold starts) but adequate for MVP and
 * effective within a single warm Node instance.
 *
 * Phase 6 upgrade path: swap the LRU for @upstash/ratelimit + Vercel KV
 * by re-implementing this module's signature.
 */

interface BucketState {
  tokens: number;
  resetAt: number;
}

// Per-route LRU so disparate limits don't clobber each other.
const BUCKETS = new Map<string, LRUCache<string, BucketState>>();

interface RateLimitOptions {
  /** Stable identifier for this route's bucket — e.g. "quote" or "analyze". */
  bucket: string;
  /** Key per actor — typically the client IP. */
  key: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** ms timestamp when the window resets. */
  resetAt: number;
}

function getBucket(name: string): LRUCache<string, BucketState> {
  let bucket = BUCKETS.get(name);
  if (!bucket) {
    bucket = new LRUCache<string, BucketState>({
      max: 10_000,
      ttl: 10 * 60_000, // entries naturally evict after 10 minutes
    });
    BUCKETS.set(name, bucket);
  }
  return bucket;
}

export function rateLimit({ bucket, key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const store = getBucket(bucket);
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: BucketState = { tokens: limit - 1, resetAt: now + windowMs };
    store.set(key, fresh);
    return { allowed: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
  }

  if (existing.tokens <= 0) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.tokens -= 1;
  store.set(key, existing);
  return { allowed: true, remaining: existing.tokens, resetAt: existing.resetAt };
}

/**
 * Extract a stable per-actor key from request headers. Falls back to a
 * single shared key for development (no IP available behind localhost).
 */
export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "anon";
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}

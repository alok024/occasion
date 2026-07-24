// Fixed-window per-key rate limiter backed by an in-memory Map. Per-lambda
// best-effort: the Map lives inside a single serverless instance, so limits are
// not shared across concurrent lambdas, regions, or deploys - it blunts casual
// abuse of the free generation path, nothing more.

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
// Bound memory on a long-lived warm lambda; sweep expired buckets once the map
// grows past this rather than paying sweep cost on every call.
const MAX_TRACKED_KEYS = 5000;

const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

// Returns true if the call for this key is allowed under the current window,
// false if it should be rejected (caller maps false to HTTP 429).
export function rateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  if (buckets.size > MAX_TRACKED_KEYS) sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;

  bucket.count += 1;
  return true;
}

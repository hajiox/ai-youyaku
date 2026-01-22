type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult => {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, retryAfterSec: Math.ceil((resetAt - now) / 1000) };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  buckets.set(key, entry);
  return { ok: true, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
};

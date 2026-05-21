import "server-only";

/**
 * Minimal in-memory token bucket. Good for slowing down a careless brute-force
 * sweep; useless for a coordinated attack across IPs. For real distributed
 * limits, swap in Upstash/Redis later — this module's public API doesn't change.
 *
 * Buckets are keyed by an opaque string (typically `email:foo@bar.com` or
 * `ip:1.2.3.4`). Each bucket starts full and refills linearly toward its cap.
 */

interface Bucket {
  /** Tokens remaining at `lastRefillMs`. */
  tokens: number;
  /** Wall-clock ms of last refill. */
  lastRefillMs: number;
}

interface LimitConfig {
  /** Bucket capacity. */
  capacity: number;
  /** ms between token refills. */
  refillIntervalMs: number;
}

const STATE = new Map<string, Bucket>();

/**
 * Attempts to consume one token from the bucket. Returns true on success, or
 * false if the bucket is empty (rate limit exceeded).
 */
export function consumeToken(key: string, config: LimitConfig): boolean {
  const now = Date.now();
  const existing = STATE.get(key);
  if (!existing) {
    STATE.set(key, { tokens: config.capacity - 1, lastRefillMs: now });
    return true;
  }
  // Refill based on elapsed time.
  const elapsed = now - existing.lastRefillMs;
  if (elapsed > 0) {
    const refill = Math.floor(elapsed / config.refillIntervalMs);
    if (refill > 0) {
      existing.tokens = Math.min(config.capacity, existing.tokens + refill);
      existing.lastRefillMs += refill * config.refillIntervalMs;
    }
  }
  if (existing.tokens <= 0) return false;
  existing.tokens -= 1;
  return true;
}

/** 5 attempts; 1 refilled per minute. */
export const OTP_LIMIT: LimitConfig = {
  capacity: 5,
  refillIntervalMs: 60_000,
};

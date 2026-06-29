/**
 * Moataz AI — Rate Limiting Module
 * Implements sliding window rate limiting with tiered plans.
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  windowMs: number;
}

const PLAN_LIMITS: Record<string, RateLimitConfig> = {
  free: { maxTokens: 60, refillRate: 1, windowMs: 60_000 },
  pro: { maxTokens: 300, refillRate: 5, windowMs: 60_000 },
  enterprise: { maxTokens: 1000, refillRate: 16, windowMs: 60_000 },
};

const API_ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  'auth:login': { maxTokens: 5, refillRate: 0.08, windowMs: 60_000 },
  'auth:register': { maxTokens: 3, refillRate: 0.05, windowMs: 60_000 },
  'auth:forgot-password': { maxTokens: 3, refillRate: 0.05, windowMs: 60_000 },
  'ai:chat': { maxTokens: 30, refillRate: 0.5, windowMs: 60_000 },
  'ai:stream': { maxTokens: 30, refillRate: 0.5, windowMs: 60_000 },
  'ai:embeddings': { maxTokens: 100, refillRate: 1.6, windowMs: 60_000 },
};

const buckets = new Map<string, RateLimitEntry>();

function getOrCreateBucket(key: string, config: RateLimitConfig): RateLimitEntry {
  const existing = buckets.get(key);
  if (existing) return existing;
  const entry: RateLimitEntry = { tokens: config.maxTokens, lastRefill: Date.now() };
  buckets.set(key, entry);
  return entry;
}

function refillTokens(entry: RateLimitEntry, config: RateLimitConfig): void {
  const now = Date.now();
  const elapsed = (now - entry.lastRefill) / 1000;
  const refill = elapsed * config.refillRate;
  entry.tokens = Math.min(config.maxTokens, entry.tokens + refill);
  entry.lastRefill = now;
}

export function rateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60_000
): RateLimitResult {
  const config: RateLimitConfig = { maxTokens: limit, refillRate: limit / (windowMs / 1000), windowMs };
  const bucket = getOrCreateBucket(key, config);
  refillTokens(bucket, config);

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + retryAfter * 1000,
      retryAfter,
    };
  }

  bucket.tokens -= 1;
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    resetTime: Date.now() + windowMs,
  };
}

export function rateLimitByPlan(
  userId: string,
  plan: string = 'free'
): RateLimitResult {
  const config = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `plan:${userId}`;
  const bucket = getOrCreateBucket(key, config);
  refillTokens(bucket, config);

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + retryAfter * 1000,
      retryAfter,
    };
  }

  bucket.tokens -= 1;
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    resetTime: Date.now() + config.windowMs,
  };
}

export function rateLimitByEndpoint(
  identifier: string,
  endpoint: string
): RateLimitResult {
  const config = API_ENDPOINT_LIMITS[endpoint];
  if (!config) return rateLimit(`endpoint:${identifier}:${endpoint}`);

  const key = `endpoint:${identifier}:${endpoint}`;
  const bucket = getOrCreateBucket(key, config);
  refillTokens(bucket, config);

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + retryAfter * 1000,
      retryAfter,
    };
  }

  bucket.tokens -= 1;
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    resetTime: Date.now() + config.windowMs,
  };
}

// Periodic cleanup of stale buckets
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now - entry.lastRefill > 300_000) {
        buckets.delete(key);
      }
    }
  }, 120_000);
}

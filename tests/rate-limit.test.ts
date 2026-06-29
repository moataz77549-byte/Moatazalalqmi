import { describe, test, expect } from 'bun:test';
import { rateLimit, rateLimitByPlan, rateLimitByEndpoint } from '../src/lib/rate-limit';

describe('Rate Limiting', () => {
  test('allows requests within limit', () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, 10, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  test('blocks requests when limit exceeded', () => {
    const key = `test-block-${Date.now()}`;
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 5, 60_000);
    }
    const result = rateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });

  test('plan-based limiting works for free tier', () => {
    const userId = `user-free-${Date.now()}`;
    const result = rateLimitByPlan(userId, 'free');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // free tier: 60 tokens
  });

  test('plan-based limiting: enterprise has higher limits', () => {
    const userId = `user-ent-${Date.now()}`;
    const result = rateLimitByPlan(userId, 'enterprise');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999); // enterprise: 1000 tokens
  });

  test('endpoint-based limiting: auth:login has tight limits', () => {
    const identifier = `ip-login-${Date.now()}`;
    const result = rateLimitByEndpoint(identifier, 'auth:login');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 max for login
  });

  test('endpoint-based limiting: blocks after exhaustion', () => {
    const identifier = `ip-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      rateLimitByEndpoint(identifier, 'auth:login');
    }
    const result = rateLimitByEndpoint(identifier, 'auth:login');
    expect(result.allowed).toBe(false);
  });

  test('different keys are independent', () => {
    const key1 = `independent-a-${Date.now()}`;
    const key2 = `independent-b-${Date.now()}`;
    
    // Exhaust key1
    for (let i = 0; i < 3; i++) {
      rateLimit(key1, 3, 60_000);
    }
    
    // key2 should still work
    const result = rateLimit(key2, 3, 60_000);
    expect(result.allowed).toBe(true);
  });
});

import { describe, test, expect, beforeEach } from 'bun:test';

// Test the failover state management in isolation
// by re-implementing the same logic from smart-router.ts
// since the full import chain pulls in prisma

type ProviderType = string;

interface CascadeFailoverState {
  failedProviders: Set<ProviderType>;
  failureTimestamps: Map<ProviderType, number>;
  activeProvider: ProviderType | null;
}

const PROVIDER_COOLDOWN_MS = 60_000;

const failoverState: CascadeFailoverState = {
  failedProviders: new Set(),
  failureTimestamps: new Map(),
  activeProvider: null,
};

function markProviderFailed(provider: ProviderType): void {
  failoverState.failedProviders.add(provider);
  failoverState.failureTimestamps.set(provider, Date.now());
}

function markProviderRecovered(provider: ProviderType): void {
  failoverState.failedProviders.delete(provider);
  failoverState.failureTimestamps.delete(provider);
}

function isProviderInCooldown(provider: ProviderType): boolean {
  const failureTime = failoverState.failureTimestamps.get(provider);
  if (!failureTime) return false;
  if (Date.now() - failureTime > PROVIDER_COOLDOWN_MS) {
    failoverState.failedProviders.delete(provider);
    failoverState.failureTimestamps.delete(provider);
    return false;
  }
  return true;
}

function isTimeoutOrRateLimit(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('rate limit') || msg.includes('429');
  }
  return false;
}

describe('Cascading Failover State Management', () => {
  beforeEach(() => {
    for (const provider of failoverState.failedProviders) {
      markProviderRecovered(provider);
    }
  });

  test('marks provider as failed and enters cooldown', () => {
    markProviderFailed('OPENAI');
    expect(isProviderInCooldown('OPENAI')).toBe(true);
    expect(failoverState.failedProviders.has('OPENAI')).toBe(true);
  });

  test('marks provider as recovered and exits cooldown', () => {
    markProviderFailed('ANTHROPIC');
    expect(isProviderInCooldown('ANTHROPIC')).toBe(true);

    markProviderRecovered('ANTHROPIC');
    expect(isProviderInCooldown('ANTHROPIC')).toBe(false);
    expect(failoverState.failedProviders.has('ANTHROPIC')).toBe(false);
  });

  test('multiple providers can be in cooldown simultaneously', () => {
    markProviderFailed('OPENAI');
    markProviderFailed('GEMINI');
    markProviderFailed('GROQ');

    expect(isProviderInCooldown('OPENAI')).toBe(true);
    expect(isProviderInCooldown('GEMINI')).toBe(true);
    expect(isProviderInCooldown('GROQ')).toBe(true);
    expect(isProviderInCooldown('ANTHROPIC')).toBe(false);

    expect(failoverState.failedProviders.size).toBe(3);
  });

  test('provider not in cooldown returns false', () => {
    expect(isProviderInCooldown('DEEPSEEK')).toBe(false);
    expect(isProviderInCooldown('MISTRAL')).toBe(false);
  });

  test('recovering a non-failed provider is safe', () => {
    markProviderRecovered('COHERE');
    expect(isProviderInCooldown('COHERE')).toBe(false);
  });

  test('re-marking a failed provider updates timestamp', () => {
    markProviderFailed('OPENAI');
    const firstTimestamp = failoverState.failureTimestamps.get('OPENAI');

    markProviderFailed('OPENAI');
    const secondTimestamp = failoverState.failureTimestamps.get('OPENAI');

    expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp!);
  });

  test('isTimeoutOrRateLimit detects timeout errors', () => {
    expect(isTimeoutOrRateLimit(new Error('Request timeout after 30s'))).toBe(true);
    expect(isTimeoutOrRateLimit(new Error('429 Too Many Requests'))).toBe(true);
    expect(isTimeoutOrRateLimit(new Error('Rate limit exceeded'))).toBe(true);
    expect(isTimeoutOrRateLimit(new Error('Model not found'))).toBe(false);
    expect(isTimeoutOrRateLimit(new Error('Invalid API key'))).toBe(false);
  });

  test('cascading failover logic: skip failed providers', () => {
    const providers = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'GROQ'];

    markProviderFailed('OPENAI');
    markProviderFailed('ANTHROPIC');

    const availableProviders = providers.filter(p => !isProviderInCooldown(p));
    expect(availableProviders).toEqual(['GEMINI', 'GROQ']);
    expect(availableProviders).not.toContain('OPENAI');
    expect(availableProviders).not.toContain('ANTHROPIC');
  });
});

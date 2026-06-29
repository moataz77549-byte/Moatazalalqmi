import { ProviderType, ModelInfo, ChatRequest, ProviderError } from './types';
import { isProviderAvailable, getProviderHealth } from './health-monitor';
import { modelRegistry } from './registry';

export interface FallbackChain {
  primary: ModelInfo;
  fallbacks: ModelInfo[];
  reason: string;
}

export function buildFallbackChain(
  primary: ModelInfo,
  request: ChatRequest,
  maxFallbacks: number = 3
): FallbackChain {
  const fallbacks: ModelInfo[] = [];
  const usedProviders = new Set<ProviderType>([primary.providerType]);

  // Find models with similar capabilities from different providers
  const allModels = modelRegistry
    .getAllModels()
    .filter(
      (m) =>
        m.status === 'active' &&
        m.providerType !== primary.providerType &&
        isProviderAvailable(m.providerType) &&
        m.contextWindow >= primary.contextWindow * 0.5 // Allow smaller context as fallback
    );

  // Score fallbacks by similarity to primary
  const scored = allModels.map((m) => ({
    model: m,
    score: scoreSimilarity(m, primary),
  }));

  scored.sort((a, b) => b.score - a.score);

  for (const { model } of scored) {
    if (fallbacks.length >= maxFallbacks) break;
    if (usedProviders.has(model.providerType)) continue;

    // Check if model meets request requirements
    if (request.tools?.length && !model.supportsToolCalling) continue;
    if (request.responseFormat === 'json_object' && !model.supportsJsonMode) continue;

    fallbacks.push(model);
    usedProviders.add(model.providerType);
  }

  return {
    primary,
    fallbacks,
    reason: `Built fallback chain with ${fallbacks.length} alternatives`,
  };
}

function scoreSimilarity(candidate: ModelInfo, primary: ModelInfo): number {
  let score = 0;

  // Capability similarity
  if (candidate.supportsVision === primary.supportsVision) score += 20;
  if (candidate.supportsToolCalling === primary.supportsToolCalling) score += 20;
  if (candidate.supportsJsonMode === primary.supportsJsonMode) score += 15;
  if (candidate.supportsStreaming === primary.supportsStreaming) score += 15;

  // Context window similarity
  const contextDiff = Math.abs(candidate.contextWindow - primary.contextWindow);
  score += Math.max(0, 30 - contextDiff / 10000);

  // Cost similarity (prefer similar cost tier)
  const costDiff = Math.abs(
    candidate.pricing.inputPer1k +
      candidate.pricing.outputPer1k -
      (primary.pricing.inputPer1k + primary.pricing.outputPer1k)
  );
  score += Math.max(0, 20 - costDiff * 100);

  // Prefer healthy providers
  const health = getProviderHealth(candidate.providerType);
  if (health?.status === 'healthy') score += 10;

  return score;
}

export async function executeWithFallback<T>(
  primary: () => Promise<T>,
  fallbacks: Array<() => Promise<T>>,
  shouldFallback: (error: unknown) => boolean
): Promise<{ result: T; attempts: number; fallbackUsed: number }> {
  let lastError: unknown;
  let attempts = 0;

  // Try primary
  attempts++;
  try {
    const result = await primary();
    return { result, attempts, fallbackUsed: 0 };
  } catch (error) {
    lastError = error;
    if (!shouldFallback(error)) throw error;
  }

  // Try fallbacks
  for (let i = 0; i < fallbacks.length; i++) {
    attempts++;
    try {
      const result = await fallbacks[i]();
      return { result, attempts, fallbackUsed: i + 1 };
    } catch (error) {
      lastError = error;
      if (!shouldFallback(error)) throw error;
    }
  }

  throw lastError || new Error('All fallbacks exhausted');
}

export function isFallbackEligible(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return (
      error.retryable ||
      error.statusCode === 429 ||
      (error.statusCode !== undefined && error.statusCode >= 500)
    );
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('connection') ||
      msg.includes('network')
    );
  }
  return false;
}

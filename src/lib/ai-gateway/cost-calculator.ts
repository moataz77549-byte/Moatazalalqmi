import { ModelInfo, ChatRequest, TaskType } from './types';

export function calculateChatCost(
  model: ModelInfo,
  promptTokens: number,
  completionTokens: number
): { prompt: number; completion: number; total: number; currency: string } {
  const promptCost = (promptTokens / 1000) * model.pricing.inputPer1k;
  const completionCost = (completionTokens / 1000) * model.pricing.outputPer1k;
  return {
    prompt: promptCost,
    completion: completionCost,
    total: promptCost + completionCost,
    currency: model.pricing.currency,
  };
}

export function calculateEmbeddingCost(
  model: ModelInfo,
  tokens: number
): { total: number; currency: string } {
  const total = (tokens / 1000) * (model.pricing.embeddingPer1k || 0);
  return { total, currency: model.pricing.currency };
}

export function calculateImageCost(model: ModelInfo, count: number = 1): { total: number; currency: string } {
  const total = (model.pricing.imagePer1k || 0) * count;
  return { total, currency: model.pricing.currency };
}

export function formatCost(cost: number, currency: string = 'USD'): string {
  if (cost < 0.01) return `$${cost.toFixed(6)} ${currency}`;
  if (cost < 1) return `$${cost.toFixed(4)} ${currency}`;
  return `$${cost.toFixed(2)} ${currency}`;
}

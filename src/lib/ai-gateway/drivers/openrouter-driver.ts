import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType } from '../types';

const OPENROUTER_MODELS: ModelInfo[] = [
  {
    providerId: 'openrouter', providerType: 'OPENROUTER', externalId: 'openai/gpt-4o',
    displayName: 'GPT-4o (via OpenRouter)', contextWindow: 128000, maxOutputTokens: 16384,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.005, outputPer1k: 0.015, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'openrouter', providerType: 'OPENROUTER', externalId: 'anthropic/claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet (via OpenRouter)', contextWindow: 200000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0.003, outputPer1k: 0.015, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'streaming'],
  },
  {
    providerId: 'openrouter', providerType: 'OPENROUTER', externalId: 'google/gemini-flash-1.5',
    displayName: 'Gemini Flash 1.5 (via OpenRouter)', contextWindow: 1000000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.000075, outputPer1k: 0.0003, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
];

export class OpenRouterDriver extends OpenAICompatibleDriver {
  constructor() {
    super('OPENROUTER' as ProviderType, 'https://openrouter.ai/api/v1', OPENROUTER_MODELS);
  }
}

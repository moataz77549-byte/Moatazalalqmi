import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType } from '../types';

const GROQ_MODELS: ModelInfo[] = [
  {
    providerId: 'groq', providerType: 'GROQ', externalId: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B', contextWindow: 128000, maxOutputTokens: 32768,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00059, outputPer1k: 0.00079, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'groq', providerType: 'GROQ', externalId: 'llama-3.1-8b-instant',
    displayName: 'Llama 3.1 8B Instant', contextWindow: 128000, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00005, outputPer1k: 0.00008, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'groq', providerType: 'GROQ', externalId: 'mixtral-8x7b-32768',
    displayName: 'Mixtral 8x7B', contextWindow: 32768, maxOutputTokens: 32768,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00024, outputPer1k: 0.00024, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
];

export class GroqDriver extends OpenAICompatibleDriver {
  constructor() {
    super('GROQ' as ProviderType, 'https://api.groq.com/openai/v1', GROQ_MODELS);
  }
}

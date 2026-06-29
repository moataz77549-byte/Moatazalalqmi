import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType } from '../types';

const MISTRAL_MODELS: ModelInfo[] = [
  {
    providerId: 'mistral', providerType: 'MISTRAL', externalId: 'mistral-large-latest',
    displayName: 'Mistral Large', contextWindow: 128000, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.002, outputPer1k: 0.006, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'mistral', providerType: 'MISTRAL', externalId: 'mistral-small-latest',
    displayName: 'Mistral Small', contextWindow: 32000, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.0002, outputPer1k: 0.0006, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'mistral', providerType: 'MISTRAL', externalId: 'mistral-embed',
    displayName: 'Mistral Embed', contextWindow: 8000,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, embeddingPer1k: 0.0001, currency: 'USD' },
    status: 'active', capabilities: ['embedding'],
  },
];

export class MistralDriver extends OpenAICompatibleDriver {
  constructor() {
    super('MISTRAL' as ProviderType, 'https://api.mistral.ai/v1', MISTRAL_MODELS);
  }
}

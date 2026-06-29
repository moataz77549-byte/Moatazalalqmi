import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType } from '../types';

const NVIDIA_MODELS: ModelInfo[] = [
  {
    providerId: 'nvidia', providerType: 'NVIDIA_NIM', externalId: 'nvidia/llama-3.1-nemotron-70b-instruct',
    displayName: 'Llama 3.1 Nemotron 70B', contextWindow: 131072, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'nvidia', providerType: 'NVIDIA_NIM', externalId: 'meta/llama-3.1-405b-instruct',
    displayName: 'Llama 3.1 405B', contextWindow: 128000, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
];

export class NvidiaNimDriver extends OpenAICompatibleDriver {
  constructor() {
    super('NVIDIA_NIM' as ProviderType, 'https://integrate.api.nvidia.com/v1', NVIDIA_MODELS);
  }
}

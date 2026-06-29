import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType } from '../types';

const DEEPSEEK_MODELS: ModelInfo[] = [
  {
    providerId: 'deepseek', providerType: 'DEEPSEEK', externalId: 'deepseek-chat',
    displayName: 'DeepSeek Chat', contextWindow: 64000, maxOutputTokens: 4096,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00014, outputPer1k: 0.00028, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'deepseek', providerType: 'DEEPSEEK', externalId: 'deepseek-reasoner',
    displayName: 'DeepSeek Reasoner', contextWindow: 64000, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: true,
    pricing: { inputPer1k: 0.00055, outputPer1k: 0.00219, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'reasoning', 'streaming'],
  },
];

export class DeepSeekDriver extends OpenAICompatibleDriver {
  constructor() {
    super('DEEPSEEK' as ProviderType, 'https://api.deepseek.com/v1', DEEPSEEK_MODELS);
  }
}

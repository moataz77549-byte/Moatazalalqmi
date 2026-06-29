import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType, ProviderConfig } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Custom Driver — generic OpenAI-compatible driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Useful for self-hosted LLM servers (vLLM, LM Studio, LocalAI, etc.)
// that expose an OpenAI-compatible /v1/chat/completions endpoint.

const CUSTOM_DEFAULT_MODEL: ModelInfo = {
  providerId: 'custom',
  providerType: 'CUSTOM',
  externalId: 'default',
  displayName: 'Custom Model',
  contextWindow: 8192,
  maxOutputTokens: 4096,
  supportsVision: false,
  supportsAudio: false,
  supportsStreaming: true,
  supportsToolCalling: true,
  supportsJsonMode: true,
  supportsThinking: false,
  pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
  status: 'active',
  capabilities: ['chat', 'streaming'],
};

export class CustomDriver extends OpenAICompatibleDriver {
  constructor() {
    super('CUSTOM' as ProviderType, '', [CUSTOM_DEFAULT_MODEL]);
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    if (config.baseUrl) {
      this._baseUrl = config.baseUrl;
    }
    // Allow custom model list via config
    if (config.config?.models && Array.isArray(config.config.models)) {
      this._models = config.config.models as ModelInfo[];
    }
  }
}

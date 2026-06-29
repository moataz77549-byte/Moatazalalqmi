import { OpenAICompatibleDriver } from './openai-compatible-driver';
import { ModelInfo, ProviderType, ProviderConfig } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ollama Default Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OLLAMA_DEFAULT_MODELS: ModelInfo[] = [
  {
    providerId: 'ollama', providerType: 'OLLAMA', externalId: 'llama3.3',
    displayName: 'Llama 3.3', contextWindow: 128000, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'ollama', providerType: 'OLLAMA', externalId: 'qwen2.5',
    displayName: 'Qwen 2.5', contextWindow: 32768, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'ollama', providerType: 'OLLAMA', externalId: 'llava',
    displayName: 'LLaVA', contextWindow: 4096, maxOutputTokens: 4096,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'streaming'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ollama Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class OllamaDriver extends OpenAICompatibleDriver {
  private dynamicModels: ModelInfo[] | null = null;

  constructor() {
    super('OLLAMA' as ProviderType, 'http://localhost:11434/v1', OLLAMA_DEFAULT_MODELS);
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    // Override base URL if provided in config
    if (config.baseUrl) {
      this._baseUrl = config.baseUrl;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    // Return cached dynamic models if already fetched
    if (this.dynamicModels) return this.dynamicModels;

    // Try to fetch live model list from Ollama
    try {
      const baseUrl = this._baseUrl;
      const tagsUrl = `${baseUrl.replace(/\/v1\/?$/, '')}/api/tags`;
      const response = await fetch(tagsUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.models?.length) {
          const models: ModelInfo[] = data.models.map((m: any) => {
            const defaultModel = OLLAMA_DEFAULT_MODELS.find(
              (dm) => dm.externalId === m.name
            );
            return (
              defaultModel || {
                providerId: 'ollama',
                providerType: 'OLLAMA' as ProviderType,
                externalId: m.name,
                displayName: m.name,
                contextWindow: 8192,
                maxOutputTokens: 4096,
                supportsVision: false,
                supportsAudio: false,
                supportsStreaming: true,
                supportsToolCalling: true,
                supportsJsonMode: true,
                supportsThinking: false,
                pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
                status: 'active' as const,
                capabilities: ['chat', 'streaming'],
              }
            );
          });
          this.dynamicModels = models;
          // Also update the base model list so inherited chat/embeddings/estimateCost
          // cost lookups resolve against the live model set.
          this._models = models;
          return models;
        }
      }
    } catch {
      // Fall through to defaults
    }

    return OLLAMA_DEFAULT_MODELS;
  }
}

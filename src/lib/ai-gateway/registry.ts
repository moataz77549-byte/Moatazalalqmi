import { ProviderDriver, ProviderType, ProviderConfig, ModelInfo } from './types';
import { OpenAIDriver } from './drivers/openai-driver';
import { AnthropicDriver } from './drivers/anthropic-driver';
import { GeminiDriver } from './drivers/gemini-driver';
import { DeepSeekDriver } from './drivers/deepseek-driver';
import { GroqDriver } from './drivers/groq-driver';
import { MistralDriver } from './drivers/mistral-driver';
import { OpenRouterDriver } from './drivers/openrouter-driver';
import { NvidiaNimDriver } from './drivers/nvidia-nim-driver';
import { HuggingFaceDriver } from './drivers/huggingface-driver';
import { CohereDriver } from './drivers/cohere-driver';
import { AzureOpenAIDriver } from './drivers/azure-openai-driver';
import { OllamaDriver } from './drivers/ollama-driver';
import { CustomDriver } from './drivers/custom-driver';
import { db } from '@/lib/db';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Provider Registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ProviderRegistry {
  private drivers: Map<ProviderType, ProviderDriver> = new Map();
  private configs: Map<ProviderType, ProviderConfig> = new Map();
  private initialized = false;

  registerBuiltins(): void {
    if (this.initialized) return;

    this.drivers.set('OPENAI', new OpenAIDriver());
    this.drivers.set('ANTHROPIC', new AnthropicDriver());
    this.drivers.set('GEMINI', new GeminiDriver());
    this.drivers.set('DEEPSEEK', new DeepSeekDriver());
    this.drivers.set('GROQ', new GroqDriver());
    this.drivers.set('MISTRAL', new MistralDriver());
    this.drivers.set('OPENROUTER', new OpenRouterDriver());
    this.drivers.set('NVIDIA_NIM', new NvidiaNimDriver());
    this.drivers.set('HUGGING_FACE', new HuggingFaceDriver());
    this.drivers.set('COHERE', new CohereDriver());
    this.drivers.set('AZURE_OPENAI', new AzureOpenAIDriver());
    this.drivers.set('OLLAMA', new OllamaDriver());
    this.drivers.set('CUSTOM', new CustomDriver());

    this.initialized = true;
  }

  /**
   * Register a custom driver instance for a provider type, replacing any
   * existing builtin driver. Useful for tests and plugin providers.
   */
  registerDriver(type: ProviderType, driver: ProviderDriver): void {
    this.registerBuiltins();
    this.drivers.set(type, driver);
  }

  getDriver(type: ProviderType): ProviderDriver | undefined {
    this.registerBuiltins();
    return this.drivers.get(type);
  }

  async initializeProvider(config: ProviderConfig): Promise<void> {
    this.registerBuiltins();
    const driver = this.drivers.get(config.type);
    if (!driver) {
      throw new Error(`Unknown provider type: ${config.type}`);
    }
    await driver.initialize(config);
    this.configs.set(config.type, config);
  }

  /**
   * Load all active providers for an organization from the database and
   * initialize their drivers. Failures for individual providers are
   * logged but do not abort the whole load.
   */
  async loadFromDatabase(organizationId: string): Promise<void> {
    this.registerBuiltins();

    try {
      const providers = await db.provider.findMany({
        where: { organizationId, isActive: true },
        include: { models: true },
      });

      for (const provider of providers) {
        try {
          const config: ProviderConfig = {
            type: provider.type as ProviderType,
            name: provider.name,
            apiKey: provider.apiKey || undefined, // In production, decrypt this
            baseUrl: provider.baseUrl || undefined,
            organizationId: provider.organizationId,
            isActive: provider.isActive,
            priority: 0,
            config: provider.config ? JSON.parse(provider.config) : undefined,
          };

          await this.initializeProvider(config);
        } catch (error) {
          console.warn(
            `Failed to initialize provider ${provider.name} (${provider.type}):`,
            error
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load providers from database:', error);
    }
  }

  getAllProviders(): ProviderType[] {
    this.registerBuiltins();
    return Array.from(this.drivers.keys());
  }

  getConfig(type: ProviderType): ProviderConfig | undefined {
    return this.configs.get(type);
  }

  isInitialized(type: ProviderType): boolean {
    return this.configs.has(type);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Model Registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ModelRegistry {
  private models: Map<string, ModelInfo> = new Map(); // key: `${provider}:${modelId}`
  private providerModels: Map<ProviderType, ModelInfo[]> = new Map();

  registerModel(model: ModelInfo): void {
    const key = `${model.providerType}:${model.externalId}`;
    this.models.set(key, model);

    const list = this.providerModels.get(model.providerType) || [];
    const existingIdx = list.findIndex((m) => m.externalId === model.externalId);
    if (existingIdx >= 0) list[existingIdx] = model;
    else list.push(model);
    this.providerModels.set(model.providerType, list);
  }

  getModel(provider: ProviderType, modelId: string): ModelInfo | undefined {
    return this.models.get(`${provider}:${modelId}`);
  }

  findModel(modelId: string): ModelInfo | undefined {
    for (const [, model] of this.models) {
      if (model.externalId === modelId) return model;
    }
    return undefined;
  }

  getModelsByProvider(provider: ProviderType): ModelInfo[] {
    return this.providerModels.get(provider) || [];
  }

  getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  async loadFromDrivers(registry: ProviderRegistry): Promise<void> {
    for (const providerType of registry.getAllProviders()) {
      const driver = registry.getDriver(providerType);
      if (!driver) continue;
      try {
        const models = await driver.listModels();
        for (const model of models) {
          this.registerModel(model);
        }
      } catch (error) {
        console.warn(`Failed to load models for ${providerType}:`, error);
      }
    }
  }

  filterModels(criteria: {
    supportsVision?: boolean;
    supportsStreaming?: boolean;
    supportsToolCalling?: boolean;
    supportsJsonMode?: boolean;
    supportsThinking?: boolean;
    minContextWindow?: number;
    provider?: ProviderType;
    status?: ModelInfo['status'];
  }): ModelInfo[] {
    return this.getAllModels().filter((m) => {
      if (criteria.supportsVision !== undefined && m.supportsVision !== criteria.supportsVision) return false;
      if (criteria.supportsStreaming !== undefined && m.supportsStreaming !== criteria.supportsStreaming) return false;
      if (criteria.supportsToolCalling !== undefined && m.supportsToolCalling !== criteria.supportsToolCalling) return false;
      if (criteria.supportsJsonMode !== undefined && m.supportsJsonMode !== criteria.supportsJsonMode) return false;
      if (criteria.supportsThinking !== undefined && m.supportsThinking !== criteria.supportsThinking) return false;
      if (criteria.minContextWindow !== undefined && m.contextWindow < criteria.minContextWindow) return false;
      if (criteria.provider !== undefined && m.providerType !== criteria.provider) return false;
      if (criteria.status !== undefined && m.status !== criteria.status) return false;
      return true;
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Singletons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const providerRegistry = new ProviderRegistry();
export const modelRegistry = new ModelRegistry();

// Initialize built-in driver catalog on module load; lazily populate the
// model registry from each driver's static catalog. Failures are non-fatal
// (e.g. Ollama won't be running in most environments).
providerRegistry.registerBuiltins();
modelRegistry.loadFromDrivers(providerRegistry).catch((err) => {
  console.warn('Model registry initial load failed:', err);
});

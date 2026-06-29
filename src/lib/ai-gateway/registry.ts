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
      console.warn(`[Registry] Unknown provider type: ${config.type}`);
      return;
    }
    try {
      await driver.initialize(config);
      this.configs.set(config.type, config);
    } catch (error) {
      console.error(`[Registry] Failed to initialize ${config.type}:`, error);
    }
  }

  /**
   * Enterprise Load Logic:
   * 1. Scan Database (Priority 1)
   * 2. Fallback to Environment Variables (Priority 2)
   * 3. Gracefully skip unavailable providers
   */
  async loadActiveProviders(organizationId: string): Promise<void> {
    this.registerBuiltins();
    console.log(`[Registry] Loading providers for organization: ${organizationId}`);

    const envMap: Record<ProviderType, string | undefined> = {
      OPENAI: process.env.OPENAI_API_KEY,
      GEMINI: process.env.GEMINI_API_KEY,
      ANTHROPIC: process.env.ANTHROPIC_API_KEY,
      OPENROUTER: process.env.OPENROUTER_API_KEY,
      GROQ: process.env.GROQ_API_KEY,
      DEEPSEEK: process.env.DEEPSEEK_API_KEY,
      NVIDIA_NIM: process.env.NVIDIA_API_KEY,
      HUGGING_FACE: process.env.HUGGINGFACE_API_KEY,
      COHERE: process.env.COHERE_API_KEY,
      MISTRAL: process.env.MISTRAL_API_KEY,
      AZURE_OPENAI: process.env.AZURE_OPENAI_API_KEY,
      OLLAMA: process.env.OLLAMA_BASE_URL,
      CUSTOM: process.env.OPENAI_COMPATIBLE_API_KEY,
    };

    try {
      // Get all providers from DB
      const dbProviders = await db.provider.findMany({
        where: { organizationId },
        orderBy: { priority: 'asc' }
      });

      const processedTypes = new Set<ProviderType>();

      // 1. Process Database Providers
      for (const p of dbProviders) {
        processedTypes.add(p.type as ProviderType);
        if (!p.isActive) continue;

        const apiKey = p.apiKey || envMap[p.type as ProviderType];
        if (!apiKey && p.type !== 'OLLAMA') continue;

        await this.initializeProvider({
          type: p.type as ProviderType,
          name: p.name,
          apiKey: apiKey || undefined,
          baseUrl: p.baseUrl || undefined,
          organizationId: p.organizationId,
          isActive: p.isActive,
          priority: p.priority,
          config: p.config as any,
        });
      }

      // 2. Process Environment Fallbacks (only if not in DB)
      for (const [type, key] of Object.entries(envMap)) {
        const pType = type as ProviderType;
        if (processedTypes.has(pType)) continue;

        if (key && key.length > 0) {
          await this.initializeProvider({
            type: pType,
            name: pType.charAt(0) + pType.slice(1).toLowerCase(),
            apiKey: key,
            organizationId,
            isActive: true,
            priority: 10, // Lower priority for env fallbacks
          });
        }
      }
    } catch (error) {
      console.error('[Registry] Critical failure loading providers:', error);
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
  private models: Map<string, ModelInfo> = new Map();
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
        // Non-fatal: just means this specific provider's models won't be in the registry
      }
    }
  }
}

export const providerRegistry = new ProviderRegistry();
export const modelRegistry = new ModelRegistry();

providerRegistry.registerBuiltins();
modelRegistry.loadFromDrivers(providerRegistry).catch(() => {});

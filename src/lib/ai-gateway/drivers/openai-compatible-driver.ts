import { OpenAIDriver } from './openai-driver';
import { ProviderType, ModelInfo } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OpenAI-Compatible Driver Base
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Used by providers that speak the OpenAI Chat Completions API
// (DeepSeek, Groq, Mistral, OpenRouter, NVIDIA NIM, Ollama, Custom, etc.)

export class OpenAICompatibleDriver extends OpenAIDriver {
  // Declared `protected` so concrete subclasses (Ollama, Custom) can
  // override the base URL / model list at initialize() time.
  protected _baseUrl: string;
  protected _models: ModelInfo[];

  constructor(providerType: ProviderType, baseUrl: string, models: ModelInfo[]) {
    super();
    this.type = providerType;
    this._baseUrl = baseUrl;
    this._models = models;
  }

  protected getDefaultBaseUrl(): string {
    return this._baseUrl;
  }

  protected getModels(): ModelInfo[] {
    return this._models;
  }

  async listModels(): Promise<ModelInfo[]> {
    return this._models;
  }
}

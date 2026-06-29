import { OpenAIDriver } from './openai-driver';
import {
  ModelInfo, ProviderType, ProviderConfig, ProviderError, ChatRequest
} from '../types';
import { calculateChatCost } from '../cost-calculator';
import { countMessageTokens, countTokens } from '../token-counter';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Azure OpenAI Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AZURE_MODELS: ModelInfo[] = [
  {
    providerId: 'azure', providerType: 'AZURE_OPENAI', externalId: 'gpt-4o',
    displayName: 'GPT-4o (Azure)', contextWindow: 128000, maxOutputTokens: 16384,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.0025, outputPer1k: 0.01, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'azure', providerType: 'AZURE_OPENAI', externalId: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini (Azure)', contextWindow: 128000, maxOutputTokens: 16384,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00015, outputPer1k: 0.0006, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Azure OpenAI Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AzureOpenAIDriver extends OpenAIDriver {
  type: ProviderType = 'AZURE_OPENAI';
  private deploymentId: string = 'gpt-4o';
  private apiVersion: string = '2024-10-21';

  protected getDefaultBaseUrl(): string {
    return ''; // Must be configured per-deployment
  }

  protected getModels(): ModelInfo[] {
    return AZURE_MODELS;
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    if (!config.baseUrl) {
      throw new ProviderError(
        'Azure OpenAI requires baseUrl (endpoint)',
        'no_endpoint',
        'AZURE_OPENAI'
      );
    }
    // Extract deployment ID from config
    this.deploymentId = (config.config?.deploymentId as string) || 'gpt-4o';
    this.apiVersion = (config.config?.apiVersion as string) || '2024-10-21';
  }

  async listModels(): Promise<ModelInfo[]> {
    return AZURE_MODELS;
  }

  // Override chat to use Azure URL format
  async chat(request: ChatRequest): Promise<any> {
    // Azure uses /openai/deployments/{deployment-id}/chat/completions?api-version=...
    const url = `${this.getBaseUrl()}/openai/deployments/${this.deploymentId}/chat/completions?api-version=${this.apiVersion}`;
    const start = Date.now();

    const body: any = {
      messages: this.formatMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stream: false,
    };

    if (request.tools?.length) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice || 'auto';
    }

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.getApiKey(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.error?.message || 'Azure error',
        'azure_error',
        'AZURE_OPENAI',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const models = this.getModels();
    const model = models.find((m) => m.externalId === request.model) || models[0];
    const promptTokens =
      data.usage?.prompt_tokens || (await countMessageTokens(request.messages));
    const completionTokens =
      data.usage?.completion_tokens ||
      (await countTokens(data.choices[0]?.message?.content || ''));
    const cost = calculateChatCost(model, promptTokens, completionTokens);

    return {
      id: data.id,
      model: data.model,
      provider: 'AZURE_OPENAI',
      content: data.choices[0]?.message?.content || '',
      toolCalls: data.choices[0]?.message?.tool_calls,
      finishReason: data.choices[0]?.finish_reason,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: data.usage?.total_tokens || (promptTokens + completionTokens),
      },
      cost,
      latency: Date.now() - start,
    };
  }

  async health(): Promise<any> {
    const start = Date.now();
    try {
      const url = `${this.getBaseUrl()}/openai/models?api-version=${this.apiVersion}`;
      const response = await this.makeRequest(
        url,
        {
          method: 'GET',
          headers: { 'api-key': this.getApiKey() },
        },
        10000
      );

      return {
        provider: 'AZURE_OPENAI',
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 1,
        consecutiveErrors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        provider: 'AZURE_OPENAI',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        consecutiveErrors: 1,
      };
    }
  }
}

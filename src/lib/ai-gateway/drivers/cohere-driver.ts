import {
  ProviderDriver, ChatRequest, ChatResponse, StreamChunk,
  EmbeddingRequest, EmbeddingResponse, ModelInfo, HealthStatus,
  ProviderType, ProviderError
} from '../types';
import { BaseDriver } from './base-driver';
import { countMessageTokens, countTokens } from '../token-counter';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cohere Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const COHERE_MODELS: ModelInfo[] = [
  {
    providerId: 'cohere', providerType: 'COHERE', externalId: 'command-r-plus',
    displayName: 'Command R+', contextWindow: 128000, maxOutputTokens: 4096,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.0025, outputPer1k: 0.01, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'cohere', providerType: 'COHERE', externalId: 'command-r',
    displayName: 'Command R', contextWindow: 128000, maxOutputTokens: 4096,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00015, outputPer1k: 0.0006, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'cohere', providerType: 'COHERE', externalId: 'embed-english-v3.0',
    displayName: 'Embed English v3', contextWindow: 512,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, embeddingPer1k: 0.0001, currency: 'USD' },
    status: 'active', capabilities: ['embedding'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cohere Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class CohereDriver extends BaseDriver implements ProviderDriver {
  type: ProviderType = 'COHERE';

  protected getDefaultBaseUrl(): string {
    return 'https://api.cohere.com/v1';
  }

  async listModels(): Promise<ModelInfo[]> {
    return COHERE_MODELS;
  }

  private buildChatBody(request: ChatRequest): any {
    const messages = request.messages;
    const message = messages[messages.length - 1];
    const preamble = messages
      .filter((m) => m.role === 'system')
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n');
    const chatHistory = messages
      .slice(0, -1)
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: typeof m.content === 'string' ? m.content : '',
      }));

    const body: any = {
      model: request.model,
      message: typeof message.content === 'string' ? message.content : '',
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: false,
    };
    if (preamble) body.preamble = preamble;
    if (chatHistory.length) body.chat_history = chatHistory;
    return body;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const body = { ...this.buildChatBody(request), stream: false };

    const response = await this.makeRequest(`${this.getBaseUrl()}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.message || 'Cohere error',
        'cohere_error',
        'COHERE',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const promptTokens =
      data.meta?.billed_units?.input_tokens ||
      (await countMessageTokens(request.messages));
    const completionTokens =
      data.meta?.billed_units?.output_tokens ||
      (await countTokens(data.text || ''));

    // Use Command R+ pricing as the default; refine per-model when available
    const model = COHERE_MODELS.find((m) => m.externalId === request.model);
    const inputRate = model?.pricing.inputPer1k ?? 0.0025;
    const outputRate = model?.pricing.outputPer1k ?? 0.01;
    const promptCost = (promptTokens / 1000) * inputRate;
    const completionCost = (completionTokens / 1000) * outputRate;

    return {
      id: `cohere_${Date.now()}`,
      model: request.model,
      provider: 'COHERE',
      content: data.text || '',
      finishReason: 'stop',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      cost: {
        prompt: promptCost,
        completion: completionCost,
        total: promptCost + completionCost,
        currency: 'USD',
      },
      latency: Date.now() - start,
    };
  }

  async *stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const body = { ...this.buildChatBody(request), stream: true };

    const response = await this.makeRequest(`${this.getBaseUrl()}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ProviderError(
        'Cohere stream failed',
        'stream_failed',
        'COHERE',
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ProviderError('No body', 'no_body', 'COHERE');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const id = `cohere_${Date.now()}`;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line.trim());
            if (data.text) yield { id, delta: data.text, done: false };
            if (data.finish_reason === 'COMPLETE') {
              yield { id, delta: '', done: true };
              return;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    const texts = Array.isArray(request.input) ? request.input : [request.input];

    const body = {
      model: request.model,
      texts,
      input_type: 'search_document',
    };

    const response = await this.makeRequest(`${this.getBaseUrl()}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ProviderError(
        'Cohere embedding failed',
        'embedding_failed',
        'COHERE',
        response.status
      );
    }

    const data = await response.json();
    const tokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    return {
      embeddings: data.embeddings || [],
      model: request.model,
      provider: 'COHERE',
      usage: { promptTokens: tokens, totalTokens: tokens },
      cost: { total: (tokens / 1000) * 0.0001, currency: 'USD' },
      latency: Date.now() - start,
    };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await this.makeRequest(
        `${this.getBaseUrl()}/models`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.getApiKey()}` },
        },
        10000
      );

      return {
        provider: 'COHERE',
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 1,
        consecutiveErrors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        provider: 'COHERE',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        consecutiveErrors: 1,
      };
    }
  }
}

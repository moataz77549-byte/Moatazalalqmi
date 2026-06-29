import {
  ProviderDriver, ChatRequest, ChatResponse, StreamChunk,
  EmbeddingRequest, EmbeddingResponse, ModelInfo, HealthStatus,
  ProviderType, ProviderError
} from '../types';
import { BaseDriver } from './base-driver';
import { countMessageTokens, countTokens } from '../token-counter';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HuggingFace Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HF_MODELS: ModelInfo[] = [
  {
    providerId: 'huggingface', providerType: 'HUGGING_FACE', externalId: 'meta-llama/Llama-3.3-70B-Instruct',
    displayName: 'Llama 3.3 70B Instruct', contextWindow: 131072, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0.00059, outputPer1k: 0.00079, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'streaming'],
  },
  {
    providerId: 'huggingface', providerType: 'HUGGING_FACE', externalId: 'Qwen/Qwen2.5-72B-Instruct',
    displayName: 'Qwen 2.5 72B', contextWindow: 32768, maxOutputTokens: 8192,
    supportsVision: false, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00059, outputPer1k: 0.00079, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'tools', 'json', 'streaming'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HuggingFace Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class HuggingFaceDriver extends BaseDriver implements ProviderDriver {
  type: ProviderType = 'HUGGING_FACE';

  protected getDefaultBaseUrl(): string {
    return 'https://api-inference.huggingface.co/models';
  }

  async listModels(): Promise<ModelInfo[]> {
    return HF_MODELS;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: false,
    };

    const response = await this.makeRequest(
      `${this.getBaseUrl()}/${request.model}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.error || 'HuggingFace error',
        'hf_error',
        'HUGGING_FACE',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const promptTokens =
      data.usage?.prompt_tokens || (await countMessageTokens(request.messages));
    const completionTokens =
      data.usage?.completion_tokens ||
      (await countTokens(data.choices?.[0]?.message?.content || ''));

    return {
      id: `hf_${Date.now()}`,
      model: request.model,
      provider: 'HUGGING_FACE',
      content: data.choices?.[0]?.message?.content || '',
      finishReason: data.choices?.[0]?.finish_reason,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      cost: { prompt: 0, completion: 0, total: 0, currency: 'USD' },
      latency: Date.now() - start,
    };
  }

  async *stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: true,
    };

    const response = await this.makeRequest(
      `${this.getBaseUrl()}/${request.model}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new ProviderError(
        'HF stream failed',
        'stream_failed',
        'HUGGING_FACE',
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ProviderError('No body', 'no_body', 'HUGGING_FACE');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const id = `hf_${Date.now()}`;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim().startsWith('data:')) continue;
          const data = line.trim().slice(5).trim();
          if (data === '[DONE]') {
            yield { id, delta: '', done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            yield {
              id,
              delta: parsed.choices?.[0]?.delta?.content || '',
              done: false,
            };
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
    const inputs = Array.isArray(request.input) ? request.input : [request.input];

    const response = await this.makeRequest(`${this.getBaseUrl()}/${request.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify({ inputs }),
    });

    if (!response.ok) {
      throw new ProviderError(
        'HF embedding failed',
        'embedding_failed',
        'HUGGING_FACE',
        response.status
      );
    }

    const data = await response.json();
    const embeddings = Array.isArray(data[0]) ? data : [data];
    const tokens = inputs.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    return {
      embeddings,
      model: request.model,
      provider: 'HUGGING_FACE',
      usage: { promptTokens: tokens, totalTokens: tokens },
      cost: { total: 0, currency: 'USD' },
      latency: Date.now() - start,
    };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await this.makeRequest(
        `https://huggingface.co/api/whoami-v2`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.getApiKey()}` },
        },
        10000
      );

      return {
        provider: 'HUGGING_FACE',
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 1,
        consecutiveErrors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        provider: 'HUGGING_FACE',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        consecutiveErrors: 1,
      };
    }
  }
}

import {
  ProviderDriver, ChatRequest, ChatResponse, StreamChunk,
  EmbeddingRequest, EmbeddingResponse, ModelInfo, HealthStatus,
  ProviderType, ProviderError, ChatMessage
} from '../types';
import { BaseDriver } from './base-driver';
import { countMessageTokens, countTokens } from '../token-counter';
import { calculateChatCost } from '../cost-calculator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Anthropic Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    providerId: 'anthropic', providerType: 'ANTHROPIC', externalId: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0.003, outputPer1k: 0.015, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'streaming'],
  },
  {
    providerId: 'anthropic', providerType: 'ANTHROPIC', externalId: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku', contextWindow: 200000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0.0008, outputPer1k: 0.004, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'streaming'],
  },
  {
    providerId: 'anthropic', providerType: 'ANTHROPIC', externalId: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus', contextWindow: 200000, maxOutputTokens: 4096,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0.015, outputPer1k: 0.075, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'streaming'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Anthropic Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AnthropicDriver extends BaseDriver implements ProviderDriver {
  type: ProviderType = 'ANTHROPIC';

  protected getDefaultBaseUrl(): string {
    return 'https://api.anthropic.com/v1';
  }

  async listModels(): Promise<ModelInfo[]> {
    return ANTHROPIC_MODELS;
  }

  private extractSystemPrompt(
    messages: ChatMessage[]
  ): { system: string; messages: ChatMessage[] } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');
    const system = systemMessages
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n\n');
    return { system, messages: otherMessages };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const { system, messages } = this.extractSystemPrompt(request.messages);

    const body: any = {
      model: request.model,
      max_tokens: request.maxTokens || 4096,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      system: system || undefined,
      temperature: request.temperature ?? 0.7,
      stream: false,
    };

    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    const response = await this.makeRequest(`${this.getBaseUrl()}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.error?.message || 'Anthropic error',
        errorBody?.error?.type || `http_${response.status}`,
        'ANTHROPIC',
        response.status,
        response.status === 429 || response.status >= 500
      );
    }

    const data = await response.json();
    const model =
      ANTHROPIC_MODELS.find((m) => m.externalId === request.model) || ANTHROPIC_MODELS[0];
    const promptTokens =
      data.usage?.input_tokens || (await countMessageTokens(request.messages));
    const completionTokens =
      data.usage?.output_tokens ||
      (await countTokens(data.content?.[0]?.text || ''));
    const cost = calculateChatCost(model, promptTokens, completionTokens);

    return {
      id: data.id,
      model: data.model,
      provider: 'ANTHROPIC',
      content: data.content?.map((c: any) => c.text).join('') || '',
      toolCalls: data.content
        ?.filter((c: any) => c.type === 'tool_use')
        .map((t: any) => ({
          id: t.id,
          type: 'function' as const,
          function: { name: t.name, arguments: JSON.stringify(t.input) },
        })),
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      cost,
      latency: Date.now() - start,
    };
  }

  async *stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const { system, messages } = this.extractSystemPrompt(request.messages);
    const body: any = {
      model: request.model,
      max_tokens: request.maxTokens || 4096,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      system: system || undefined,
      temperature: request.temperature ?? 0.7,
      stream: true,
    };

    const response = await this.makeRequest(`${this.getBaseUrl()}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.getApiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.error?.message || 'Anthropic error',
        'anthropic_error',
        'ANTHROPIC',
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ProviderError('No response body', 'no_body', 'ANTHROPIC');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const id = `anthropic_${Date.now()}`;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield { id, delta: data.delta.text, done: false };
            } else if (data.type === 'message_stop') {
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

  async embeddings(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // Anthropic doesn't offer embeddings — redirect to fallback
    throw new ProviderError(
      'Anthropic does not support embeddings',
      'unsupported',
      'ANTHROPIC'
    );
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // Anthropic doesn't have a /models endpoint — use a minimal request
      const response = await this.makeRequest(
        `${this.getBaseUrl()}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.getApiKey(),
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        },
        10000
      );

      return {
        provider: 'ANTHROPIC',
        status: response.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 0.5,
        consecutiveErrors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        provider: 'ANTHROPIC',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        consecutiveErrors: 1,
      };
    }
  }
}

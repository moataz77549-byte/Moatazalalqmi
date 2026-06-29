import {
  ProviderDriver, ChatRequest, ChatResponse, StreamChunk,
  EmbeddingRequest, EmbeddingResponse, ModelInfo, HealthStatus,
  ProviderType, ProviderError, ChatMessage
} from '../types';
import { BaseDriver } from './base-driver';
import { countMessageTokens, countTokens } from '../token-counter';
import { calculateChatCost } from '../cost-calculator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gemini Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GEMINI_MODELS: ModelInfo[] = [
  {
    providerId: 'gemini', providerType: 'GEMINI', externalId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro', contextWindow: 2000000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: true, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00125, outputPer1k: 0.005, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'audio', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'gemini', providerType: 'GEMINI', externalId: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash', contextWindow: 1000000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: true, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.000075, outputPer1k: 0.0003, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'audio', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'gemini', providerType: 'GEMINI', externalId: 'gemini-1.5-flash-8b',
    displayName: 'Gemini 1.5 Flash 8B', contextWindow: 1000000, maxOutputTokens: 8192,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.0000375, outputPer1k: 0.00015, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'gemini', providerType: 'GEMINI', externalId: 'text-embedding-004',
    displayName: 'Text Embedding 004', contextWindow: 2048,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, embeddingPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['embedding'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gemini Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class GeminiDriver extends BaseDriver implements ProviderDriver {
  type: ProviderType = 'GEMINI';

  protected getDefaultBaseUrl(): string {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }

  async listModels(): Promise<ModelInfo[]> {
    return GEMINI_MODELS;
  }

  private convertMessagesToGemini(
    messages: ChatMessage[]
  ): { contents: any[]; systemInstruction?: string } {
    const contents: any[] = [];
    let systemInstruction = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction +=
          (typeof msg.content === 'string' ? msg.content : '') + '\n';
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts:
            typeof msg.content === 'string'
              ? [{ text: msg.content }]
              : Array.isArray(msg.content)
                ? msg.content.map((c) =>
                    c.type === 'text'
                      ? { text: c.text }
                      : {
                          inlineData: {
                            mimeType: 'image/jpeg',
                            data:
                              (c as any).image_url?.url?.split(',')[1] || '',
                          },
                        }
                  )
                : [{ text: '' }],
        });
      }
    }

    return { contents, systemInstruction: systemInstruction.trim() || undefined };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const { contents, systemInstruction } = this.convertMessagesToGemini(
      request.messages
    );

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens || 8192,
        topP: request.topP,
        stopSequences: request.stop,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    if (request.responseFormat === 'json_object') {
      body.generationConfig.responseMimeType = 'application/json';
    }
    if (request.tools?.length) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        },
      ];
    }

    const url = `${this.getBaseUrl()}/models/${request.model}:generateContent?key=${this.getApiKey()}`;
    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.error?.message || 'Gemini error',
        errorBody?.error?.code || `http_${response.status}`,
        'GEMINI',
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    const model =
      GEMINI_MODELS.find((m) => m.externalId === request.model) || GEMINI_MODELS[0];
    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .join('') || '';
    const promptTokens =
      data.usageMetadata?.promptTokenCount ||
      (await countMessageTokens(request.messages));
    const completionTokens =
      data.usageMetadata?.candidatesTokenCount ||
      (await countTokens(content));
    const cost = calculateChatCost(model, promptTokens, completionTokens);

    return {
      id: `gemini_${Date.now()}`,
      model: request.model,
      provider: 'GEMINI',
      content,
      finishReason:
        data.candidates?.[0]?.finishReason === 'STOP'
          ? 'stop'
          : data.candidates?.[0]?.finishReason,
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
    const { contents, systemInstruction } = this.convertMessagesToGemini(
      request.messages
    );
    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens || 8192,
      },
      systemInstruction: systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined,
    };

    const url = `${this.getBaseUrl()}/models/${request.model}:streamGenerateContent?key=${this.getApiKey()}&alt=sse`;
    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ProviderError(
        errorBody?.error?.message || 'Gemini error',
        'gemini_error',
        'GEMINI',
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ProviderError('No body', 'no_body', 'GEMINI');

    const decoder = new TextDecoder();
    let buffer = '';
    const id = `gemini_${Date.now()}`;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim().startsWith('data:')) continue;
          try {
            const data = JSON.parse(line.trim().slice(5).trim());
            const text =
              data.candidates?.[0]?.content?.parts
                ?.map((p: any) => p.text)
                .join('') || '';
            if (text) yield { id, delta: text, done: false };
            if (data.candidates?.[0]?.finishReason === 'STOP') {
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
    const input = Array.isArray(request.input) ? request.input : [request.input];

    const body = {
      model: `models/${request.model}`,
      content: { parts: input.map((text) => ({ text })) },
    };

    const url = `${this.getBaseUrl()}/models/${request.model}:embedContent?key=${this.getApiKey()}`;
    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ProviderError(
        'Gemini embedding failed',
        'embedding_failed',
        'GEMINI',
        response.status
      );
    }

    const data = await response.json();
    const tokens = input.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    return {
      embeddings: [data.embedding?.values || []],
      model: request.model,
      provider: 'GEMINI',
      usage: { promptTokens: tokens, totalTokens: tokens },
      cost: { total: 0, currency: 'USD' },
      latency: Date.now() - start,
    };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await this.makeRequest(
        `${this.getBaseUrl()}/models?key=${this.getApiKey()}`,
        { method: 'GET' },
        10000
      );

      return {
        provider: 'GEMINI',
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 1,
        consecutiveErrors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        provider: 'GEMINI',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        consecutiveErrors: 1,
      };
    }
  }
}

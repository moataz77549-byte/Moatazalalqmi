import {
  ProviderDriver, ProviderConfig, ChatRequest, ChatResponse, StreamChunk,
  EmbeddingRequest, EmbeddingResponse, ModelInfo, HealthStatus, ImageGenOptions,
  ProviderType, ProviderError, ChatMessage
} from '../types';
import { BaseDriver, parseSSEStream } from './base-driver';
import { countMessageTokens, countTokens } from '../token-counter';
import { calculateChatCost, calculateEmbeddingCost, calculateImageCost } from '../cost-calculator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OpenAI Model Catalog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OPENAI_MODELS: ModelInfo[] = [
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'gpt-4o',
    displayName: 'GPT-4o', contextWindow: 128000, maxOutputTokens: 16384,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.0025, outputPer1k: 0.01, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini', contextWindow: 128000, maxOutputTokens: 16384,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.00015, outputPer1k: 0.0006, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo', contextWindow: 128000, maxOutputTokens: 4096,
    supportsVision: true, supportsAudio: false, supportsStreaming: true,
    supportsToolCalling: true, supportsJsonMode: true, supportsThinking: false,
    pricing: { inputPer1k: 0.01, outputPer1k: 0.03, currency: 'USD' },
    status: 'active', capabilities: ['chat', 'vision', 'tools', 'json', 'streaming'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'o1-preview',
    displayName: 'o1 Preview', contextWindow: 128000, maxOutputTokens: 32768,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: true,
    pricing: { inputPer1k: 0.015, outputPer1k: 0.06, currency: 'USD' },
    status: 'beta', capabilities: ['chat', 'reasoning'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'text-embedding-3-small',
    displayName: 'Text Embedding 3 Small', contextWindow: 8191,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, embeddingPer1k: 0.00002, currency: 'USD' },
    status: 'active', capabilities: ['embedding'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'text-embedding-3-large',
    displayName: 'Text Embedding 3 Large', contextWindow: 8191,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, embeddingPer1k: 0.00013, currency: 'USD' },
    status: 'active', capabilities: ['embedding'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'dall-e-3',
    displayName: 'DALL-E 3', contextWindow: 4000,
    supportsVision: false, supportsAudio: false, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, imagePer1k: 0.04, currency: 'USD' },
    status: 'active', capabilities: ['image_generation'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'whisper-1',
    displayName: 'Whisper', contextWindow: 0,
    supportsVision: false, supportsAudio: true, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['transcription'],
  },
  {
    providerId: 'openai', providerType: 'OPENAI', externalId: 'tts-1',
    displayName: 'TTS-1', contextWindow: 4096,
    supportsVision: false, supportsAudio: true, supportsStreaming: false,
    supportsToolCalling: false, supportsJsonMode: false, supportsThinking: false,
    pricing: { inputPer1k: 0.015, outputPer1k: 0, currency: 'USD' },
    status: 'active', capabilities: ['speech'],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OpenAI Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class OpenAIDriver extends BaseDriver implements ProviderDriver {
  type: ProviderType = 'OPENAI';

  protected getDefaultBaseUrl(): string {
    return 'https://api.openai.com/v1';
  }

  /**
   * Synchronous model-catalog accessor used internally for cost calculation.
   * Subclasses (OpenAI-compatible providers) override this to return their
   * own model list so cost lookup is correct per provider.
   */
  protected getModels(): ModelInfo[] {
    return OPENAI_MODELS;
  }

  async listModels(): Promise<ModelInfo[]> {
    return this.getModels();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const cfg = this.requireConfig();
    const start = Date.now();

    const body: any = {
      model: request.model,
      messages: this.formatMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop,
      stream: false,
    };

    if (request.tools?.length) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice || 'auto';
    }

    if (request.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    } else if (request.responseFormat === 'json_schema' && request.jsonSchema) {
      body.response_format = { type: 'json_schema', json_schema: request.jsonSchema };
    }

    const response = await this.makeRequest(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
        ...(cfg.organizationId && { 'OpenAI-Organization': cfg.organizationId }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw this.parseOpenAIError(response.status, errorBody);
    }

    const data = await response.json();
    const models = this.getModels();
    const model = models.find(m => m.externalId === request.model) || models[0];
    const promptTokens = data.usage?.prompt_tokens || await countMessageTokens(request.messages);
    const completionTokens =
      data.usage?.completion_tokens ||
      await countTokens(data.choices[0]?.message?.content || '');
    const cost = calculateChatCost(model, promptTokens, completionTokens);

    return {
      id: data.id,
      model: data.model,
      provider: 'OPENAI',
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
      providerMetadata: { id: data.id, systemFingerprint: data.system_fingerprint },
    };
  }

  async *stream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const body: any = {
      model: request.model,
      messages: this.formatMessages(request.messages),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (request.tools?.length) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice || 'auto';
    }

    if (request.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.makeRequest(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw this.parseOpenAIError(response.status, errorBody);
    }

    yield* parseSSEStream(response, 'OPENAI', (data) => {
      const choice = data.choices?.[0];
      return {
        content: choice?.delta?.content || '',
        toolCalls: choice?.delta?.tool_calls,
        finishReason: choice?.finish_reason,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    });
  }

  async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    const body = {
      model: request.model,
      input: request.input,
      encoding_format: request.encodingFormat || 'float',
      dimensions: request.dimensions,
    };

    const response = await this.makeRequest(`${this.getBaseUrl()}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw this.parseOpenAIError(response.status, errorBody);
    }

    const data = await response.json();
    const models = this.getModels();
    const model = models.find(m => m.externalId === request.model);
    const tokens = data.usage?.total_tokens || 0;
    const cost = model
      ? calculateEmbeddingCost(model, tokens)
      : { total: 0, currency: 'USD' };

    return {
      embeddings: data.data.map((d: any) => d.embedding),
      model: data.model,
      provider: 'OPENAI',
      usage: { promptTokens: tokens, totalTokens: tokens },
      cost,
      latency: Date.now() - start,
    };
  }

  async imageGeneration(
    prompt: string,
    options?: ImageGenOptions
  ): Promise<{ url: string; cost: number }> {
    const body = {
      model: options?.model || 'dall-e-3',
      prompt,
      n: options?.n || 1,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      style: options?.style || 'natural',
      response_format: 'url',
    };

    const response = await this.makeRequest(`${this.getBaseUrl()}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw this.parseOpenAIError(response.status, errorBody);
    }

    const data = await response.json();
    const models = this.getModels();
    const model = models.find(m => m.externalId === (options?.model || 'dall-e-3'));
    const cost = model ? calculateImageCost(model, options?.n || 1).total : 0;

    return { url: data.data[0].url, cost };
  }

  async speechToText(
    audio: Buffer,
    options?: { language?: string }
  ): Promise<{ text: string; cost: number }> {
    const formData = new FormData();
    // Wrap Buffer in Uint8Array so it satisfies the DOM BlobPart type
    // (Buffer<ArrayBufferLike> doesn't directly satisfy BlobPart in strict TS).
    formData.append('file', new Blob([new Uint8Array(audio)]), 'audio.wav');
    formData.append('model', 'whisper-1');
    if (options?.language) formData.append('language', options.language);

    const response = await this.makeRequest(`${this.getBaseUrl()}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.getApiKey()}` },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw this.parseOpenAIError(response.status, errorBody);
    }

    const data = await response.json();
    return { text: data.text, cost: 0 };
  }

  async textToSpeech(
    text: string,
    options?: { voice?: string; speed?: number }
  ): Promise<{ audio: Buffer; cost: number }> {
    const body = {
      model: 'tts-1',
      input: text,
      voice: options?.voice || 'alloy',
      speed: options?.speed || 1,
      response_format: 'mp3',
    };

    const response = await this.makeRequest(`${this.getBaseUrl()}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ProviderError('TTS failed', 'tts_failed', 'OPENAI', response.status);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const tokens = await countTokens(text);
    return { audio: audioBuffer, cost: (tokens / 1000) * 0.015 };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await this.makeRequest(`${this.getBaseUrl()}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.getApiKey()}` },
      }, 10000);

      return {
        provider: 'OPENAI',
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: response.ok ? 0 : 1,
        consecutiveErrors: response.ok ? 0 : 1,
      };
    } catch {
      return {
        provider: 'OPENAI',
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        errorRate: 1,
        consecutiveErrors: 1,
      };
    }
  }

  protected formatMessages(messages: ChatMessage[]): any[] {
    return messages.map((msg) => {
      const formatted: any = { role: msg.role, content: msg.content };
      if (msg.name) formatted.name = msg.name;
      if (msg.toolCallId) formatted.tool_call_id = msg.toolCallId;
      if (msg.toolCalls) formatted.tool_calls = msg.toolCalls;
      return formatted;
    });
  }

  async estimateCost(
    request: ChatRequest
  ): Promise<{ prompt: number; completion: number; total: number }> {
    const models = this.getModels();
    const model = models.find((m) => m.externalId === request.model);
    if (!model) return { prompt: 0, completion: 0, total: 0 };

    const promptTokens = await countMessageTokens(request.messages);
    const completionTokens = request.maxTokens || 1000;
    const cost = calculateChatCost(model, promptTokens, completionTokens);

    return { prompt: cost.prompt, completion: cost.completion, total: cost.total };
  }
}

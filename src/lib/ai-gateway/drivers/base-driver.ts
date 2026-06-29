import {
  ProviderDriver, ProviderConfig, ChatRequest,
  ModelInfo, ProviderType, ProviderError
} from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Abstract Base Driver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export abstract class BaseDriver implements Partial<ProviderDriver> {
  protected config: ProviderConfig | null = null;
  abstract type: ProviderType;

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  protected requireConfig(): ProviderConfig {
    if (!this.config) {
      throw new ProviderError('Driver not initialized', 'NOT_INITIALIZED', this.type);
    }
    return this.config;
  }

  protected getApiKey(): string {
    const cfg = this.requireConfig();
    if (!cfg.apiKey) {
      throw new ProviderError('API key not configured', 'NO_API_KEY', this.type);
    }
    return cfg.apiKey;
  }

  protected getBaseUrl(): string {
    return this.requireConfig().baseUrl || this.getDefaultBaseUrl();
  }

  protected abstract getDefaultBaseUrl(): string;

  async validateApiKey(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }

  async estimateCost(
    _request: ChatRequest
  ): Promise<{ prompt: number; completion: number; total: number }> {
    // Default implementation — providers override with actual pricing
    return { prompt: 0, completion: 0, total: 0 };
  }

  protected async makeRequest(
    url: string,
    options: RequestInit,
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new ProviderError('Request timeout', 'timeout', this.type, 408, true);
      }
      throw new ProviderError(
        error?.message || 'Connection error',
        'connection_error',
        this.type,
        undefined,
        true
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  protected parseOpenAIError(status: number, body: any): ProviderError {
    const message = body?.error?.message || body?.message || 'Unknown error';
    const code = body?.error?.code || body?.error?.type || `http_${status}`;
    const retryable = status === 429 || status >= 500;
    return new ProviderError(message, code, this.type, status, retryable);
  }

  // listModels / chat / stream / embeddings / health are implemented by
  // concrete driver subclasses.
  abstract listModels(): Promise<ModelInfo[]>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper: Convert OpenAI-style SSE stream to StreamChunk generator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function* parseSSEStream(
  response: Response,
  provider: ProviderType,
  extractDelta: (data: any) => {
    content?: string;
    toolCalls?: any[];
    finishReason?: string;
    usage?: any;
  }
): AsyncGenerator<any, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new ProviderError('No response body', 'no_body', provider);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const id = `chatcmpl_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (!trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          yield { id, delta: '', done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const extracted = extractDelta(parsed);
          yield {
            id,
            delta: extracted.content || '',
            toolCalls: extracted.toolCalls,
            finishReason: extracted.finishReason as any,
            usage: extracted.usage,
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

import { providerRegistry, modelRegistry } from './registry';
import { routeRequest, extractRoutingContext, markProviderFailed, markProviderRecovered } from './smart-router';
import { buildFallbackChain, isFallbackEligible } from './fallback-engine';
import { withRetry } from './retry-engine';
import { getCachedResponse, setCachedResponse, shouldCache } from './prompt-cache';
import { recordUsage } from './usage-tracker';
import { checkProviderHealth, getAllProviderHealth } from './health-monitor';
import { buildPrompt, sanitizeContext, ContextSources } from './prompt-engine';
import {
  ChatRequest,
  ChatResponse,
  StreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  ProviderType,
  ProviderConfig,
  ProviderError,
  GatewayError,
  HealthStatus,
} from './types';

export interface GatewayOptions {
  userId: string;
  organizationId?: string;
  subscriptionPlan?: string;
  enableCache?: boolean;
  enableFallback?: boolean;
  enableRetry?: boolean;
  context?: ContextSources;
  maxRetries?: number;
  maxFallbacks?: number;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Partial<GatewayOptions> = {
  enableCache: true,
  enableFallback: true,
  enableRetry: true,
  maxRetries: 3,
  maxFallbacks: 3,
  subscriptionPlan: 'free',
  timeoutMs: 30_000,
};

function isTimeoutOrRateLimit(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.statusCode === 429 || error.code === 'rate_limit_exceeded' || error.code === 'timeout';
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('rate limit') || msg.includes('429');
  }
  return false;
}

class AIGateway {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  async chat(request: ChatRequest, options: GatewayOptions): Promise<ChatResponse> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    await this.initialize();

    // Step 1: Build prompt with context (sanitized)
    let finalMessages = request.messages;
    if (opts.context) {
      const sanitizedContext = sanitizeContext(opts.context);
      const built = await buildPrompt(request.messages, sanitizedContext);
      finalMessages = built.messages;
      request = { ...request, messages: finalMessages };
    }

    // Step 2: Check cache
    if (opts.enableCache && shouldCache(request.model, request.messages, request.temperature)) {
      const cached = await getCachedResponse(request.model, request.messages, {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      if (cached) {
        return {
          id: `cached_${Date.now()}`,
          model: request.model,
          provider: 'CUSTOM',
          content: cached,
          finishReason: 'stop',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          cost: { prompt: 0, completion: 0, total: 0, currency: 'USD' },
          latency: 0,
          providerMetadata: { cached: true },
        };
      }
    }

    // Step 3: Smart routing with cascading failover awareness
    const routingContext = extractRoutingContext(request, opts.userId, opts.subscriptionPlan);
    let routing;

    try {
      routing = await routeRequest(request, routingContext);
    } catch (error) {
      throw new GatewayError('No suitable model available', 'NO_MODEL_AVAILABLE', error as Error);
    }

    // Step 4: Build full cascading failover chain
    const cascadeChain: ModelInfo[] = [routing.model, ...routing.fallbackChain];

    if (opts.enableFallback) {
      const additionalFallbacks = buildFallbackChain(routing.model, request, opts.maxFallbacks);
      for (const fb of additionalFallbacks.fallbacks) {
        if (!cascadeChain.some((m) => m.providerType === fb.providerType)) {
          cascadeChain.push(fb);
        }
      }
    }

    // Step 5: Execute with cascading failover
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;
    let fallbackUsed = 0;
    let response: ChatResponse | null = null;

    for (let i = 0; i < cascadeChain.length; i++) {
      const model = cascadeChain[i];
      const driver = providerRegistry.getDriver(model.providerType);

      if (!driver) continue;

      attempts++;

      try {
        const executeRequest = async () => {
          const requestForModel = { ...request, model: model.externalId };
          return await driver.chat(requestForModel);
        };

        if (opts.enableRetry) {
          response = await withRetry(executeRequest, { maxRetries: i === 0 ? opts.maxRetries : 1 });
        } else {
          response = await executeRequest();
        }

        // Mark provider as recovered on success
        markProviderRecovered(model.providerType);
        fallbackUsed = i;
        break;
      } catch (error) {
        lastError = error as Error;

        // Mark provider failed if timeout or rate limit
        if (isTimeoutOrRateLimit(error)) {
          markProviderFailed(model.providerType);
        }

        if (i < cascadeChain.length - 1 && isFallbackEligible(error)) {
          continue;
        }

        throw new GatewayError(
          `All providers failed after cascading failover. Last error: ${lastError.message}`,
          'ALL_PROVIDERS_FAILED',
          lastError
        );
      }
    }

    if (!response) {
      throw new GatewayError(
        `No response from any provider. Last error: ${lastError?.message}`,
        'NO_RESPONSE',
        lastError || undefined
      );
    }

    // Step 6: Record usage
    await recordUsage({
      userId: opts.userId,
      organizationId: opts.organizationId,
      provider: response.provider,
      model: response.model,
      taskType: routingContext.taskType,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      cost: response.cost.total,
      latency: response.latency,
      success: true,
      retries: attempts - 1,
      fallbacks: fallbackUsed,
    });

    // Step 7: Cache response
    if (opts.enableCache && shouldCache(request.model, request.messages, request.temperature)) {
      await setCachedResponse(
        request.model,
        request.messages,
        {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        },
        response.content
      );
    }

    void startTime;

    return response;
  }

  async *stream(
    request: ChatRequest,
    options: GatewayOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    await this.initialize();

    // Build prompt with sanitized context
    if (opts.context) {
      const sanitizedContext = sanitizeContext(opts.context);
      const built = await buildPrompt(request.messages, sanitizedContext);
      request = { ...request, messages: built.messages };
    }

    // Smart routing with failover awareness
    const routingContext = extractRoutingContext(request, opts.userId, opts.subscriptionPlan);
    let routing;

    try {
      routing = await routeRequest(request, routingContext);
    } catch (error) {
      throw new GatewayError('No suitable model available', 'NO_MODEL_AVAILABLE', error as Error);
    }

    // Build cascading failover chain for streaming
    const cascadeChain: ModelInfo[] = [routing.model, ...routing.fallbackChain];

    if (opts.enableFallback) {
      const additionalFallbacks = buildFallbackChain(routing.model, request, opts.maxFallbacks);
      for (const fb of additionalFallbacks.fallbacks) {
        if (!cascadeChain.some((m) => m.providerType === fb.providerType)) {
          cascadeChain.push(fb);
        }
      }
    }

    let lastError: Error | null = null;

    for (let i = 0; i < cascadeChain.length; i++) {
      const model = cascadeChain[i];
      const driver = providerRegistry.getDriver(model.providerType);

      if (!driver) continue;

      try {
        const requestForModel = { ...request, model: model.externalId };
        const generator = driver.stream(requestForModel);

        let totalContent = '';
        let usage: Partial<ChatResponse['usage']> | null = null;

        for await (const chunk of generator) {
          if (chunk.delta) totalContent += chunk.delta;
          if (chunk.usage) usage = chunk.usage;
          yield chunk;
        }

        // Mark provider as recovered on success
        markProviderRecovered(model.providerType);

        await recordUsage({
          userId: opts.userId,
          organizationId: opts.organizationId,
          provider: model.providerType,
          model: model.externalId,
          taskType: routingContext.taskType,
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0,
          cost: 0,
          latency: 0,
          streamingDuration: 0,
          success: true,
          retries: 0,
          fallbacks: i,
        });

        void totalContent;
        return;
      } catch (error) {
        lastError = error as Error;

        if (isTimeoutOrRateLimit(error)) {
          markProviderFailed(model.providerType);
        }

        if (i < cascadeChain.length - 1 && isFallbackEligible(error)) {
          continue;
        }
        throw new GatewayError(
          `Stream failed across all providers. Last error: ${lastError.message}`,
          'STREAM_FAILED',
          lastError
        );
      }
    }

    throw new GatewayError('No streaming response', 'NO_STREAM', lastError || undefined);
  }

  async embeddings(
    request: EmbeddingRequest,
    options: GatewayOptions
  ): Promise<EmbeddingResponse> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    await this.initialize();

    const model = modelRegistry.findModel(request.model);
    if (!model) {
      throw new GatewayError(`Model not found: ${request.model}`, 'MODEL_NOT_FOUND');
    }

    const driver = providerRegistry.getDriver(model.providerType);
    if (!driver) {
      throw new GatewayError(
        `Provider not available: ${model.providerType}`,
        'PROVIDER_NOT_FOUND'
      );
    }

    const startTime = Date.now();

    try {
      const response = opts.enableRetry
        ? await withRetry(() => driver.embeddings(request), {
            maxRetries: opts.maxRetries,
          })
        : await driver.embeddings(request);

      markProviderRecovered(model.providerType);

      await recordUsage({
        userId: opts.userId,
        organizationId: opts.organizationId,
        provider: response.provider,
        model: response.model,
        taskType: 'embedding',
        promptTokens: response.usage.promptTokens,
        completionTokens: 0,
        totalTokens: response.usage.totalTokens,
        cost: response.cost.total,
        latency: response.latency,
        success: true,
        retries: 0,
        fallbacks: 0,
      });

      return response;
    } catch (error) {
      if (isTimeoutOrRateLimit(error)) {
        markProviderFailed(model.providerType);
      }

      await recordUsage({
        userId: opts.userId,
        organizationId: opts.organizationId,
        provider: model.providerType,
        model: request.model,
        taskType: 'embedding',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        latency: Date.now() - startTime,
        success: false,
        errorMessage: (error as Error).message,
        retries: 0,
        fallbacks: 0,
      });
      throw error;
    }
  }

  async getProviderHealth(): Promise<HealthStatus[]> {
    return getAllProviderHealth();
  }

  async checkProvider(providerType: ProviderType): Promise<HealthStatus> {
    const driver = providerRegistry.getDriver(providerType);
    if (!driver) {
      return {
        provider: providerType,
        status: 'unknown',
        latency: 0,
        lastChecked: new Date(0),
        errorRate: 1,
        consecutiveErrors: 0,
      };
    }
    return checkProviderHealth(driver);
  }

  listProviders(): ProviderType[] {
    return providerRegistry.getAllProviders();
  }

  listModels(provider?: ProviderType): ModelInfo[] {
    if (provider) {
      return modelRegistry.getModelsByProvider(provider);
    }
    return modelRegistry.getAllModels();
  }

  async configureProvider(config: ProviderConfig): Promise<void> {
    await providerRegistry.initializeProvider(config);
  }
}

export const aiGateway = new AIGateway();

export type { RoutingContext } from './smart-router';

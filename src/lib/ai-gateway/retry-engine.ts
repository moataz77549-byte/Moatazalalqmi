import { ProviderError } from './types';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'rate_limit_exceeded',
    'timeout',
    'connection_error',
    'server_error',
    'service_unavailable',
    'overloaded',
  ],
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  return Math.min(baseDelay + jitter, config.maxDelay);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === fullConfig.maxRetries) break;
      
      // Check if error is retryable
      const isRetryable =
        error instanceof ProviderError
          ? error.retryable || fullConfig.retryableErrors.includes(error.code)
          : isNetworkError(error);
      
      if (!isRetryable) break;
      
      const delayMs = getDelay(attempt, fullConfig);
      await delay(delayMs);
    }
  }
  
  throw lastError || new Error('Retry failed with unknown error');
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('timeout') ||
         message.includes('connection') ||
         message.includes('network') ||
         message.includes('econnreset') ||
         message.includes('etimedout');
}

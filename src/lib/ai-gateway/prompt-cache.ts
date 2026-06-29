import { redisGet, redisSet, redisDel } from '@/lib/redis';

const CACHE_PREFIX = 'ai-gateway:prompt:';
const DEFAULT_TTL = 3600; // 1 hour

function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function getCachedResponse(
  model: string,
  messages: any[],
  params: Record<string, unknown>
): Promise<string | null> {
  const key = CACHE_PREFIX + hashKey(JSON.stringify({ model, messages, params }));
  
  // Try Redis first
  const redisResult = await redisGet(key);
  if (redisResult) return redisResult;
  
  return null;
}

export async function setCachedResponse(
  model: string,
  messages: any[],
  params: Record<string, unknown>,
  response: string,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const key = CACHE_PREFIX + hashKey(JSON.stringify({ model, messages, params }));
  await redisSet(key, response, ttl);
}

export async function invalidateCache(pattern?: string): Promise<void> {
  // In a production system with Redis, use SCAN to find and delete matching keys
  // For now, this is a no-op placeholder
}

export function shouldCache(
  model: string,
  messages: any[],
  temperature?: number
): boolean {
  // Don't cache if temperature is high (creative/non-deterministic)
  if (temperature && temperature > 0.3) return false;
  
  // Don't cache very long conversations
  const totalLength = messages.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + content.length;
  }, 0);
  if (totalLength > 10000) return false;
  
  return true;
}

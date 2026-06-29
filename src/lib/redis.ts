// Redis client - graceful fallback when Redis is unavailable
let redisClient: any = null;
let redisConnected = false;

export async function getRedis() {
  if (redisClient && redisConnected) return redisClient;
  
  try {
    const { createClient } = await import('redis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url });
    redisClient.on('error', () => { redisConnected = false; });
    redisClient.on('connect', () => { redisConnected = true; });
    await redisClient.connect();
    return redisClient;
  } catch {
    console.warn('Redis not available, using in-memory fallback');
    return null;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const client = await getRedis();
  if (!client) return null;
  try { return await client.get(key); } catch { return null; }
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try {
    if (ttlSeconds) await client.setEx(key, ttlSeconds, value);
    else await client.set(key, value);
  } catch { /* ignore */ }
}

export async function redisDel(key: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try { await client.del(key); } catch { /* ignore */ }
}

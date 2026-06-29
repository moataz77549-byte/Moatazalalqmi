import { HealthStatus, ProviderType, ProviderDriver } from './types';

interface HealthRecord {
  provider: ProviderType;
  status: HealthStatus;
  history: Array<{ timestamp: Date; latency: number; success: boolean }>;
}

const healthRecords = new Map<ProviderType, HealthRecord>();
const MAX_HISTORY = 100;
const CHECK_INTERVAL = 60_000; // 1 minute
const DEGRADED_THRESHOLD = 0.1; // 10% error rate
const UNHEALTHY_THRESHOLD = 0.3; // 30% error rate

export async function checkProviderHealth(driver: ProviderDriver): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const status = await driver.health();
    const latency = Date.now() - start;
    
    const record = healthRecords.get(driver.type) || {
      provider: driver.type,
      status: { provider: driver.type, status: 'unknown', latency: 0, lastChecked: new Date(0), errorRate: 0, consecutiveErrors: 0 },
      history: [],
    };
    
    record.history.push({ timestamp: new Date(), latency, success: status.status === 'healthy' });
    if (record.history.length > MAX_HISTORY) record.history.shift();
    
    const recentResults = record.history.slice(-20);
    const failures = recentResults.filter(r => !r.success).length;
    const errorRate = failures / recentResults.length;
    const avgLatency = recentResults.reduce((sum, r) => sum + r.latency, 0) / recentResults.length;
    
    let statusLabel: HealthStatus['status'] = 'healthy';
    if (errorRate >= UNHEALTHY_THRESHOLD || record.status.consecutiveErrors >= 5) {
      statusLabel = 'unhealthy';
    } else if (errorRate >= DEGRADED_THRESHOLD || avgLatency > 10000) {
      statusLabel = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      provider: driver.type,
      status: statusLabel,
      latency: avgLatency,
      lastChecked: new Date(),
      errorRate,
      consecutiveErrors: status.status === 'healthy' ? 0 : record.status.consecutiveErrors + 1,
      quotaRemaining: status.quotaRemaining,
      quotaLimit: status.quotaLimit,
      rateLimitRemaining: status.rateLimitRemaining,
      rateLimitReset: status.rateLimitReset,
    };
    
    record.status = healthStatus;
    healthRecords.set(driver.type, record);
    
    return healthStatus;
  } catch (error) {
    const record = healthRecords.get(driver.type);
    const consecutiveErrors = (record?.status.consecutiveErrors || 0) + 1;
    
    const healthStatus: HealthStatus = {
      provider: driver.type,
      status: consecutiveErrors >= 5 ? 'unhealthy' : 'degraded',
      latency: Date.now() - start,
      lastChecked: new Date(),
      errorRate: 1,
      consecutiveErrors,
    };
    
    if (record) {
      record.status = healthStatus;
      record.history.push({ timestamp: new Date(), latency: healthStatus.latency, success: false });
      if (record.history.length > MAX_HISTORY) record.history.shift();
    }
    
    return healthStatus;
  }
}

export function getProviderHealth(provider: ProviderType): HealthStatus | null {
  return healthRecords.get(provider)?.status || null;
}

export function getAllProviderHealth(): HealthStatus[] {
  return Array.from(healthRecords.values()).map(r => r.status);
}

export function isProviderAvailable(provider: ProviderType): boolean {
  const health = getProviderHealth(provider);
  if (!health) return true; // Unknown = assume available
  return health.status !== 'unhealthy';
}

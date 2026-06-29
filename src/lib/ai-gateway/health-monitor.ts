import { HealthStatus, HealthStatusType, ProviderType, ProviderDriver } from './types';

interface HealthRecord {
  provider: ProviderType;
  status: HealthStatus;
  history: Array<{ timestamp: Date; latency: number; success: boolean; statusType: HealthStatusType }>;
}

const healthRecords = new Map<ProviderType, HealthRecord>();
const MAX_HISTORY = 50;

export async function checkProviderHealth(driver: ProviderDriver): Promise<HealthStatus> {
  const start = Date.now();
  let statusType: HealthStatusType = 'CONNECTED';
  
  try {
    const result = await driver.health();
    const latency = Date.now() - start;
    
    // Map driver health to enterprise status types
    if (result.status === 'unhealthy') statusType = 'UNAVAILABLE';
    else if (result.status === 'degraded') statusType = 'RATE_LIMITED';
    
    const record = healthRecords.get(driver.type) || {
      provider: driver.type,
      status: { provider: driver.type, status: 'UNKNOWN', latency: 0, lastChecked: new Date(0), errorRate: 0, consecutiveErrors: 0 },
      history: [],
    };
    
    record.history.push({ timestamp: new Date(), latency, success: result.status === 'healthy', statusType });
    if (record.history.length > MAX_HISTORY) record.history.shift();
    
    const recentResults = record.history.slice(-10);
    const failures = recentResults.filter(r => !r.success).length;
    const errorRate = failures / recentResults.length;
    
    const healthStatus: HealthStatus = {
      provider: driver.type,
      status: statusType,
      latency,
      lastChecked: new Date(),
      errorRate,
      consecutiveErrors: result.status === 'healthy' ? 0 : record.status.consecutiveErrors + 1,
      quotaRemaining: result.quotaRemaining,
      rateLimitRemaining: result.rateLimitRemaining,
    };
    
    record.status = healthStatus;
    healthRecords.set(driver.type, record);
    
    return healthStatus;
  } catch (error: any) {
    const latency = Date.now() - start;
    const msg = error.message?.toLowerCase() || '';
    
    if (msg.includes('api key') || msg.includes('401')) statusType = 'INVALID_API_KEY';
    else if (msg.includes('rate limit') || msg.includes('429')) statusType = 'RATE_LIMITED';
    else if (msg.includes('timeout')) statusType = 'TIMEOUT';
    else statusType = 'CONNECTION_ERROR';

    const healthStatus: HealthStatus = {
      provider: driver.type,
      status: statusType,
      latency,
      lastChecked: new Date(),
      errorRate: 1,
      consecutiveErrors: 1,
    };
    
    return healthStatus;
  }
}

export function getProviderHealth(provider: ProviderType): HealthStatus | null {
  return healthRecords.get(provider)?.status || null;
}

export function getAllProviderHealth(): HealthStatus[] {
  return Array.from(healthRecords.values()).map(r => r.status);
}

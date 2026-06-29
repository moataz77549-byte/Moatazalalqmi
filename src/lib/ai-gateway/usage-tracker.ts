import { db } from '@/lib/db';
import { UsageRecord } from './types';

export async function recordUsage(record: Omit<UsageRecord, 'timestamp'>): Promise<void> {
  try {
    await db.analytics.create({
      data: {
        organizationId: record.organizationId || 'unknown',
        event: 'ai_usage',
        properties: JSON.stringify({
          userId: record.userId,
          provider: record.provider,
          model: record.model,
          taskType: record.taskType,
          promptTokens: record.promptTokens,
          completionTokens: record.completionTokens,
          totalTokens: record.totalTokens,
          cost: record.cost,
          latency: record.latency,
          streamingDuration: record.streamingDuration,
          success: record.success,
          errorMessage: record.errorMessage,
          retries: record.retries,
          fallbacks: record.fallbacks,
          timestamp: new Date().toISOString(),
        }),
        userId: record.userId,
      },
    });
  } catch (error) {
    console.error('Failed to record usage:', error);
  }
}

export async function getUsageStats(filters: {
  userId?: string;
  organizationId?: string;
  provider?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const records = await db.analytics.findMany({
    where: {
      event: 'ai_usage',
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.organizationId && { organizationId: filters.organizationId }),
      ...(filters.startDate && filters.endDate && {
        createdAt: { gte: filters.startDate, lte: filters.endDate },
      }),
    },
    orderBy: { createdAt: 'desc' },
  });
  
  const stats = {
    totalRequests: records.length,
    totalTokens: 0,
    totalCost: 0,
    avgLatency: 0,
    successRate: 0,
    byProvider: {} as Record<string, { requests: number; tokens: number; cost: number; errors: number }>,
    byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
  };
  
  let totalLatency = 0;
  let successfulRequests = 0;
  
  for (const record of records) {
    try {
      const props = JSON.parse(record.properties || '{}');
      stats.totalTokens += props.totalTokens || 0;
      stats.totalCost += props.cost || 0;
      totalLatency += props.latency || 0;
      if (props.success) successfulRequests++;
      
      const provider = props.provider || 'unknown';
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = { requests: 0, tokens: 0, cost: 0, errors: 0 };
      }
      stats.byProvider[provider].requests++;
      stats.byProvider[provider].tokens += props.totalTokens || 0;
      stats.byProvider[provider].cost += props.cost || 0;
      if (!props.success) stats.byProvider[provider].errors++;
      
      const model = props.model || 'unknown';
      if (!stats.byModel[model]) {
        stats.byModel[model] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byModel[model].requests++;
      stats.byModel[model].tokens += props.totalTokens || 0;
      stats.byModel[model].cost += props.cost || 0;
    } catch {}
  }
  
  stats.avgLatency = records.length > 0 ? totalLatency / records.length : 0;
  stats.successRate = records.length > 0 ? (successfulRequests / records.length) * 100 : 0;
  
  return stats;
}

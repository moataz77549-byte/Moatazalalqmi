import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiGateway } from '@/lib/ai-gateway/gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status: Record<string, any> = {
    application: 'ok',
    timestamp: new Date().toISOString(),
    dependencies: {}
  };

  let isDegraded = false;

  // 1. Database Check
  try {
    await db.$queryRaw`SELECT 1`;
    status.dependencies.database = 'connected';
  } catch (error) {
    status.dependencies.database = 'disconnected';
    isDegraded = true;
  }

  // 2. AI Gateway Check
  try {
    const health = await aiGateway.getOverallHealth();
    status.dependencies.aiGateway = health;
  } catch (error) {
    status.dependencies.aiGateway = 'error';
    isDegraded = true;
  }

  // 3. Redis Check (Optional/Soft)
  try {
    // Basic check if env exists
    status.dependencies.redis = process.env.REDIS_URL ? 'configured' : 'not_configured';
  } catch (error) {
    status.dependencies.redis = 'error';
  }

  return NextResponse.json({
    status: isDegraded ? 'degraded' : 'ok',
    ...status
  }, { status: 200 }); // Always return 200 to keep the container alive
}

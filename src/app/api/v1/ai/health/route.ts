import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { getAuthUser } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });

    const health = await aiGateway.getProviderHealth();

    return NextResponse.json(successResponse({
      providers: health,
      summary: {
        total: health.length,
        healthy: health.filter(h => h.status === 'healthy').length,
        degraded: health.filter(h => h.status === 'degraded').length,
        unhealthy: health.filter(h => h.status === 'unhealthy').length,
      },
    }));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}

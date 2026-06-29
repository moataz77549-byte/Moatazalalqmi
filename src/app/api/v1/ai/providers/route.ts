import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { getAuthUser } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const providers = aiGateway.listProviders();
    const models = aiGateway.listModels();

    return NextResponse.json(successResponse({
      providers: providers.map(p => ({
        type: p,
        name: p.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        isAvailable: true,
      })),
      models: models.map(m => ({
        provider: m.providerType,
        externalId: m.externalId,
        displayName: m.displayName,
        description: m.description,
        contextWindow: m.contextWindow,
        supportsVision: m.supportsVision,
        supportsStreaming: m.supportsStreaming,
        supportsToolCalling: m.supportsToolCalling,
        supportsJsonMode: m.supportsJsonMode,
        supportsThinking: m.supportsThinking,
        pricing: m.pricing,
        status: m.status,
        capabilities: m.capabilities,
      })),
    }));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { getAuthUser } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as any;

    const models = aiGateway.listModels(provider);

    return NextResponse.json(successResponse({
      models: models.map(m => ({
        id: m.externalId,
        provider: m.providerType,
        displayName: m.displayName,
        description: m.description,
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        supportsVision: m.supportsVision,
        supportsAudio: m.supportsAudio,
        supportsStreaming: m.supportsStreaming,
        supportsToolCalling: m.supportsToolCalling,
        supportsJsonMode: m.supportsJsonMode,
        supportsThinking: m.supportsThinking,
        pricing: m.pricing,
        capabilities: m.capabilities,
        status: m.status,
      })),
      total: models.length,
    }));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}

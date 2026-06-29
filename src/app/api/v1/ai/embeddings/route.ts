import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { getAuthUser } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const rateLimitResult = rateLimit(`embed:${user.id}`, 50, 60_000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(errorResponse('Rate limit exceeded'), { status: 429 });
    }

    const body = await request.json();
    const { input, model, dimensions, organizationId } = body;

    if (!input) {
      return NextResponse.json(errorResponse('Input is required'), { status: 400 });
    }

    const response = await aiGateway.embeddings(
      { model: model || 'text-embedding-3-small', input, dimensions },
      { userId: user.id, organizationId, subscriptionPlan: 'free' }
    );

    return NextResponse.json(successResponse(response, 'Embeddings generated'));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}

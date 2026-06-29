import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { successResponse, errorResponse } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    // Rate limit: 20 chat requests per minute per user
    const rateLimitResult = rateLimit(`chat:${user.id}`, 20, 60_000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        errorResponse('Rate limit exceeded. Please slow down.'),
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(rateLimitResult.resetTime) } }
      );
    }

    const body = await request.json();
    const { messages, model, temperature, maxTokens, stream, tools, toolChoice, responseFormat, preferredProvider, priority, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(errorResponse('Messages array is required'), { status: 400 });
    }

    const chatRequest = {
      model: model || 'auto',
      messages,
      temperature,
      maxTokens,
      stream: false,
      tools,
      toolChoice,
      responseFormat,
      preferredProvider,
      priority,
    };

    const response = await aiGateway.chat(chatRequest, {
      userId: user.id,
      organizationId: body.organizationId,
      subscriptionPlan: 'free',
      enableCache: true,
      enableFallback: true,
      enableRetry: true,
      context,
    });

    await createAuditLog({
      userId: user.id,
      organizationId: body.organizationId,
      action: 'CREATE',
      resource: 'ai_chat',
      details: {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        cost: response.cost.total,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(response, 'Chat completion successful'));
  } catch (error: any) {
    console.error('AI Chat error:', error);

    if (error.name === 'GatewayError') {
      return NextResponse.json(errorResponse(error.message), { status: 502 });
    }

    return NextResponse.json(
      errorResponse(error.message || 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}

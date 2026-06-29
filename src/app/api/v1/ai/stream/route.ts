import { NextRequest } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { getAuthUser } from '@/lib/middleware';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit streaming: 10 per minute
    const rateLimitResult = rateLimit(`stream:${user.id}`, 10, 60_000);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { messages, model, temperature, maxTokens, tools, toolChoice, responseFormat, preferredProvider, priority, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatRequest = {
            model: model || 'auto',
            messages,
            temperature,
            maxTokens,
            stream: true,
            tools,
            toolChoice,
            responseFormat,
            preferredProvider,
            priority,
          };

          const generator = aiGateway.stream(chatRequest, {
            userId: user.id,
            organizationId: body.organizationId,
            subscriptionPlan: 'free',
            enableCache: false, // Don't cache streams
            enableFallback: true,
            enableRetry: true,
            context,
          });

          for await (const chunk of generator) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));

            if (chunk.done) {
              controller.close();
              return;
            }
          }

          controller.close();
        } catch (error: any) {
          const errorData = `data: ${JSON.stringify({ error: error.message, done: true })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

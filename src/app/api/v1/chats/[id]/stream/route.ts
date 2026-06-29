import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { errorResponse } from '@/lib/api';
import { MessageStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Helper: verify chat ownership
async function getOwnedChat(chatId: string, userId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) return null;
  return chat;
}

// POST /api/v1/chats/[id]/stream — Stream AI response for a chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: Awaited<ReturnType<typeof getAuthUser>> = null;
  try {
    user = await getAuthUser(request);
  } catch {
    user = null;
  }

  if (!user) {
    return new Response(JSON.stringify(errorResponse('Unauthorized')), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;
  const chat = await getOwnedChat(id, user.id);
  if (!chat) {
    return new Response(JSON.stringify(errorResponse('Chat not found')), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { content?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { content } = body;

  if (!content || typeof content !== 'string') {
    return new Response(JSON.stringify(errorResponse('content is required')), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create the user message
  const userMessage = await db.message.create({
    data: {
      chatId: id,
      userId: user.id,
      role: 'user',
      content,
      status: MessageStatus.COMPLETED,
    },
  });

  await db.chat.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  // Build context from chat history (last 20 messages including the new one)
  const history = await db.message.findMany({
    where: { chatId: id, status: MessageStatus.COMPLETED },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const gatewayMessages = history.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  // Parse model params
  let modelParams: Record<string, unknown> = {};
  if (chat.modelParams) {
    try {
      modelParams = JSON.parse(chat.modelParams);
    } catch {
      modelParams = {};
    }
  }

  // Create pending assistant message
  const assistantMessage = await db.message.create({
    data: {
      chatId: id,
      userId: user.id,
      role: 'assistant',
      content: '',
      status: MessageStatus.STREAMING,
      model: chat.modelId || undefined,
    },
  });

  const chatRequest = {
    model: chat.modelId || 'auto',
    messages: gatewayMessages,
    temperature:
      typeof modelParams.temperature === 'number' ? modelParams.temperature : undefined,
    maxTokens:
      typeof modelParams.maxTokens === 'number' ? modelParams.maxTokens : undefined,
    topP: typeof modelParams.topP === 'number' ? modelParams.topP : undefined,
    stream: true,
    ...(chat.providerType ? { preferredProvider: chat.providerType } : {}),
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullContent = '';
      let lastUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null = null;
      let finalModel = chat.modelId || 'auto';

      try {
        const generator = aiGateway.stream(chatRequest, {
          userId: user!.id,
          organizationId: chat.organizationId,
          subscriptionPlan: 'free',
          enableCache: false,
          enableFallback: true,
          enableRetry: true,
        });

        for await (const chunk of generator) {
          if (chunk.delta) fullContent += chunk.delta;
          if (chunk.usage) lastUsage = chunk.usage;

          const data = `data: ${JSON.stringify({
            id: chunk.id,
            delta: chunk.delta,
            done: chunk.done,
            finishReason: chunk.finishReason,
            messageId: assistantMessage.id,
            userMessageId: userMessage.id,
          })}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (chunk.done) {
            break;
          }
        }

        // Persist final assistant message
        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullContent,
            model: finalModel,
            tokensIn: lastUsage?.promptTokens ?? null,
            tokensOut: lastUsage?.completionTokens ?? null,
            status: MessageStatus.COMPLETED,
            metadata: JSON.stringify({
              streamed: true,
              totalTokens: lastUsage?.totalTokens ?? null,
            }),
          },
        });

        await db.chat.update({
          where: { id },
          data: { lastMessageAt: new Date() },
        });

        await createAuditLog({
          userId: user!.id,
          organizationId: chat.organizationId,
          action: 'CREATE',
          resource: 'message',
          resourceId: assistantMessage.id,
          details: {
            chatId: id,
            streamed: true,
            model: finalModel,
            tokens: lastUsage?.totalTokens ?? 0,
          },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });

        const doneData = `data: ${JSON.stringify({
          done: true,
          messageId: assistantMessage.id,
          userMessageId: userMessage.id,
          content: fullContent,
        })}\n\n`;
        controller.enqueue(encoder.encode(doneData));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown streaming error';

        // Mark assistant message as failed with partial content
        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullContent,
            status: MessageStatus.FAILED,
            metadata: JSON.stringify({ error: message, streamed: true }),
          },
        });

        const errorData = `data: ${JSON.stringify({
          error: message,
          done: true,
          messageId: assistantMessage.id,
          userMessageId: userMessage.id,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

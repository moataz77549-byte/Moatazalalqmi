import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';
import { MessageStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Helper: load chat and verify ownership
async function getOwnedChat(chatId: string, userId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId } });
  if (!chat) return null;
  if (chat.userId !== userId) return null;
  return chat;
}

// GET /api/v1/chats/[id]/messages — List messages (paginated, with versions and reactions)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const chat = await getOwnedChat(id, user.id);
    if (!chat) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);
    const role = searchParams.get('role');

    const where: Record<string, unknown> = { chatId: id };
    if (role) where.role = role;

    const [messages, total] = await Promise.all([
      db.message.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          versions: { orderBy: { version: 'desc' } },
          reactions: true,
          _count: { select: { artifacts: true } },
        },
      }),
      db.message.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(messages, page, limit, total));
  } catch (error) {
    console.error('List messages error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/chats/[id]/messages — Send a message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const chat = await getOwnedChat(id, user.id);
    if (!chat) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const body = await request.json();
    const { content, role } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }

    const messageRole = role || 'user';
    if (!['user', 'assistant', 'system'].includes(messageRole)) {
      return NextResponse.json(errorResponse('Invalid role'), { status: 400 });
    }

    // Create the user message
    const userMessage = await db.message.create({
      data: {
        chatId: id,
        userId: user.id,
        role: messageRole,
        content,
        status: MessageStatus.COMPLETED,
      },
    });

    // Update chat lastMessageAt
    await db.chat.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    // Build context from chat history (last 20 messages)
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
        status: MessageStatus.PENDING,
        model: chat.modelId || undefined,
      },
    });

    try {
      const chatRequest = {
        model: chat.modelId || 'auto',
        messages: gatewayMessages,
        temperature:
          typeof modelParams.temperature === 'number' ? modelParams.temperature : undefined,
        maxTokens:
          typeof modelParams.maxTokens === 'number' ? modelParams.maxTokens : undefined,
        topP: typeof modelParams.topP === 'number' ? modelParams.topP : undefined,
        stream: false,
        ...(chat.providerType ? { preferredProvider: chat.providerType } : {}),
      };

      const response = await aiGateway.chat(chatRequest, {
        userId: user.id,
        organizationId: chat.organizationId,
        subscriptionPlan: 'free',
        enableCache: true,
        enableFallback: true,
        enableRetry: true,
      });

      // Update assistant message with response
      const updated = await db.message.update({
        where: { id: assistantMessage.id },
        data: {
          content: response.content,
          model: response.model,
          tokensIn: response.usage.promptTokens,
          tokensOut: response.usage.completionTokens,
          status: MessageStatus.COMPLETED,
          metadata: JSON.stringify({
            provider: response.provider,
            finishReason: response.finishReason,
            cost: response.cost,
            latency: response.latency,
          }),
        },
        include: { versions: true, reactions: true },
      });

      await db.chat.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      });

      await createAuditLog({
        userId: user.id,
        organizationId: chat.organizationId,
        action: 'CREATE',
        resource: 'message',
        resourceId: assistantMessage.id,
        details: {
          chatId: id,
          model: response.model,
          tokens: response.usage.totalTokens,
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        successResponse({ userMessage, assistantMessage: updated }, 'Message sent successfully'),
        { status: 201 }
      );
    } catch (aiError) {
      // Mark assistant message as failed
      await db.message.update({
        where: { id: assistantMessage.id },
        data: {
          status: MessageStatus.FAILED,
          metadata: JSON.stringify({
            error: aiError instanceof Error ? aiError.message : 'Unknown error',
          }),
        },
      });
      throw aiError;
    }
  } catch (error) {
    console.error('Send message error:', error);
    if (error instanceof Error && error.name === 'GatewayError') {
      return NextResponse.json(
        errorResponse(error.message || 'AI request failed'),
        { status: 502 }
      );
    }
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

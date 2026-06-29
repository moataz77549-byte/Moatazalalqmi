import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { ragEngine } from '@/lib/knowledge/rag-engine';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function resolveOrgMembership(userId: string, organizationId?: string | null) {
  if (!organizationId) {
    const membership = await db.membership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { organizationId: true },
    });
    if (!membership) return null;
    return membership.organizationId;
  }
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

// POST /api/v1/rag/chat — RAG-enhanced chat
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      chatId,
      projectId,
      organizationId,
      collectionId,
      model,
      temperature,
      maxTokens,
    } = body || {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(errorResponse('query is required'), { status: 400 });
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    // Optional: associate with an existing chat (ownership check)
    if (chatId) {
      const chat = await db.chat.findFirst({
        where: { id: chatId, userId: user.id, organizationId: orgId },
        select: { id: true },
      });
      if (!chat) {
        return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
      }
    }

    // Step 1: Retrieve context using the RAG engine
    const ragResult = await ragEngine.retrieve({
      query,
      userId: user.id,
      organizationId: orgId,
      projectId: projectId || undefined,
      collectionId: collectionId || undefined,
    });

    // Step 2: Build the augmented prompt
    const systemPrompt = ragResult.context
      ? `You are a knowledgeable assistant answering based on the user's knowledge base and memory. Use the following retrieved context to inform your answer. When the context is insufficient, say so clearly. Cite sources by referencing the [Source: ...] markers in the context.\n\n=== Retrieved Context ===\n${ragResult.context}\n=== End Context ===`
      : 'You are a helpful assistant. No relevant context was found in the user\'s knowledge base for this query.';

    const chatResponse = await aiGateway.chat(
      {
        model: model || 'auto',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        maxTokens: typeof maxTokens === 'number' ? maxTokens : 1000,
      },
      {
        userId: user.id,
        organizationId: orgId,
        enableCache: true,
        enableFallback: true,
        enableRetry: true,
      }
    );

    const citations = ragResult.sources.map((s) => ({
      type: s.type,
      id: s.id,
      title: s.title,
      citation: s.citation,
      score: s.score,
    }));

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'rag',
      details: {
        action: 'chat',
        query: query.substring(0, 200),
        chatId: chatId || null,
        model: chatResponse.model,
        provider: chatResponse.provider,
        tokens: chatResponse.usage.totalTokens,
        cost: chatResponse.cost.total,
        sourcesCount: ragResult.sources.length,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          response: chatResponse.content,
          role: 'assistant',
          model: chatResponse.model,
          provider: chatResponse.provider,
          citations,
          sources: ragResult.sources,
          summary: ragResult.summary,
          usage: chatResponse.usage,
          cost: chatResponse.cost,
          chatId: chatId || null,
        },
        'RAG chat completed'
      )
    );
  } catch (error) {
    console.error('RAG chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

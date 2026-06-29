import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { memoryEngine } from '@/lib/memory/memory-engine';
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

// POST /api/v1/memory/extract — Extract memories from a conversation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { chatId, organizationId } = body || {};

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json(errorResponse('chatId is required'), { status: 400 });
    }

    const chat = await db.chat.findFirst({
      where: { id: chatId, userId: user.id },
      select: { id: true, organizationId: true, title: true },
    });
    if (!chat) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const orgId = await resolveOrgMembership(user.id, organizationId || chat.organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    const createdMemories = await memoryEngine.extractFromConversation(
      chatId,
      user.id,
      orgId
    );

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'memory',
      details: {
        source: 'conversation-extraction',
        chatId,
        count: createdMemories.length,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        { memories: createdMemories, count: createdMemories.length, chatId },
        `Extracted ${createdMemories.length} memories from conversation`
      )
    );
  } catch (error) {
    console.error('Extract memories error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

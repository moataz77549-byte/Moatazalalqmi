import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';
import { ProviderType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/v1/chats/[id]/branch — Create a branch from current chat (copies messages)
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
    const parentChat = await db.chat.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!parentChat || parentChat.userId !== user.id) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, upToMessageId } = body || {};

    // Filter messages if upToMessageId is provided
    let messagesToCopy = parentChat.messages;
    if (upToMessageId) {
      const idx = parentChat.messages.findIndex((m) => m.id === upToMessageId);
      if (idx >= 0) {
        messagesToCopy = parentChat.messages.slice(0, idx + 1);
      }
    }

    const branchTitle = title || `${parentChat.title || 'Chat'} (Branch)`;

    // Create new chat as branch
    const branchedChat = await db.chat.create({
      data: {
        title: branchTitle,
        organizationId: parentChat.organizationId,
        projectId: parentChat.projectId,
        userId: user.id,
        folderId: parentChat.folderId,
        providerType: parentChat.providerType as ProviderType | null,
        modelId: parentChat.modelId,
        modelParams: parentChat.modelParams,
        parentChatId: parentChat.id,
      },
      include: { parentChat: { select: { id: true, title: true } } },
    });

    // Copy messages
    if (messagesToCopy.length > 0) {
      await db.message.createMany({
        data: messagesToCopy.map((m) => ({
          chatId: branchedChat.id,
          userId: user.id,
          role: m.role,
          content: m.content,
          model: m.model,
          tokensIn: m.tokensIn,
          tokensOut: m.tokensOut,
          status: m.status,
          metadata: m.metadata,
          parentMessageId: m.id, // Preserve link to original
        })),
      });
    }

    await createAuditLog({
      userId: user.id,
      organizationId: parentChat.organizationId,
      action: 'CREATE',
      resource: 'chat_branch',
      resourceId: branchedChat.id,
      details: {
        parentChatId: parentChat.id,
        messagesCopied: messagesToCopy.length,
        upToMessageId: upToMessageId || null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(branchedChat, 'Chat branched successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Branch chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

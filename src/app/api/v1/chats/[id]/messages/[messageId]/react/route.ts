import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';
import { ReactionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_REACTIONS: ReactionType[] = [
  'LIKE',
  'DISLIKE',
  'LOVE',
  'THUMBS_UP',
  'THUMBS_DOWN',
];

// Helper: verify chat ownership
async function verifyChatOwnership(chatId: string, userId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId }, select: { userId: true, organizationId: true } });
  if (!chat || chat.userId !== userId) return null;
  return chat;
}

// POST /api/v1/chats/[id]/messages/[messageId]/react — Add or toggle reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id, messageId } = await params;
    const chat = await verifyChatOwnership(id, user.id);
    if (!chat) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const message = await db.message.findFirst({ where: { id: messageId, chatId: id } });
    if (!message) {
      return NextResponse.json(errorResponse('Message not found'), { status: 404 });
    }

    const body = await request.json();
    const { type } = body;

    if (!type || !VALID_REACTIONS.includes(type)) {
      return NextResponse.json(
        errorResponse(`type must be one of: ${VALID_REACTIONS.join(', ')}`),
        { status: 400 }
      );
    }

    // Toggle behavior: if reaction exists, remove it; otherwise create it
    const existing = await db.messageReaction.findUnique({
      where: {
        messageId_userId_type: {
          messageId,
          userId: user.id,
          type: type as ReactionType,
        },
      },
    });

    if (existing) {
      await db.messageReaction.delete({ where: { id: existing.id } });
      await createAuditLog({
        userId: user.id,
        organizationId: chat.organizationId,
        action: 'DELETE',
        resource: 'message_reaction',
        resourceId: existing.id,
        details: { messageId, type },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      return NextResponse.json(
        successResponse({ messageId, type, action: 'removed' }, 'Reaction removed')
      );
    }

    const reaction = await db.messageReaction.create({
      data: {
        messageId,
        userId: user.id,
        type: type as ReactionType,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'CREATE',
      resource: 'message_reaction',
      resourceId: reaction.id,
      details: { messageId, type },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(reaction, 'Reaction added'),
      { status: 201 }
    );
  } catch (error) {
    console.error('React message error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/chats/[id]/messages/[messageId]/react — Remove reaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id, messageId } = await params;
    const chat = await verifyChatOwnership(id, user.id);
    if (!chat) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ReactionType | null;

    if (!type || !VALID_REACTIONS.includes(type)) {
      return NextResponse.json(
        errorResponse(`type query param must be one of: ${VALID_REACTIONS.join(', ')}`),
        { status: 400 }
      );
    }

    const existing = await db.messageReaction.findUnique({
      where: {
        messageId_userId_type: {
          messageId,
          userId: user.id,
          type,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(errorResponse('Reaction not found'), { status: 404 });
    }

    await db.messageReaction.delete({ where: { id: existing.id } });

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'DELETE',
      resource: 'message_reaction',
      resourceId: existing.id,
      details: { messageId, type },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ id: existing.id }, 'Reaction removed successfully')
    );
  } catch (error) {
    console.error('Remove reaction error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

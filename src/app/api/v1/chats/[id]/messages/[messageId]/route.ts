import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Helper: verify chat ownership and load message
async function loadOwnedMessage(chatId: string, messageId: string, userId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) return null;
  return db.message.findFirst({ where: { id: messageId, chatId } });
}

// GET /api/v1/chats/[id]/messages/[messageId] — Get specific message with versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id, messageId } = await params;
    const message = await loadOwnedMessage(id, messageId, user.id);
    if (!message) {
      return NextResponse.json(errorResponse('Message not found'), { status: 404 });
    }

    const full = await db.message.findUnique({
      where: { id: messageId },
      include: {
        versions: { orderBy: { version: 'desc' } },
        reactions: true,
        artifacts: true,
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/chats/[id]/messages/[messageId] — Edit message (creates MessageVersion before updating)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id, messageId } = await params;
    const message = await loadOwnedMessage(id, messageId, user.id);
    if (!message) {
      return NextResponse.json(errorResponse('Message not found'), { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }

    // Compute next version number
    const versionCount = await db.messageVersion.count({ where: { messageId } });

    // Create a MessageVersion snapshot of the current content
    await db.messageVersion.create({
      data: {
        messageId,
        content: message.content,
        version: versionCount + 1,
        editedBy: user.id,
      },
    });

    const updated = await db.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        versions: { orderBy: { version: 'desc' } },
        reactions: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: (await db.chat.findUnique({ where: { id } }))?.organizationId,
      action: 'UPDATE',
      resource: 'message',
      resourceId: messageId,
      details: { chatId: id, version: versionCount + 1 },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Message updated successfully'));
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/chats/[id]/messages/[messageId] — Delete message
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
    const message = await loadOwnedMessage(id, messageId, user.id);
    if (!message) {
      return NextResponse.json(errorResponse('Message not found'), { status: 404 });
    }

    const chat = await db.chat.findUnique({ where: { id } });

    await db.message.delete({ where: { id: messageId } });

    await createAuditLog({
      userId: user.id,
      organizationId: chat?.organizationId,
      action: 'DELETE',
      resource: 'message',
      resourceId: messageId,
      details: { chatId: id },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id: messageId }, 'Message deleted successfully'));
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

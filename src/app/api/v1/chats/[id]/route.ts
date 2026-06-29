import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Helper: load chat and verify ownership
async function getOwnedChat(chatId: string, userId: string) {
  const chat = await db.chat.findUnique({
    where: { id: chatId },
    include: {
      folder: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      parentChat: { select: { id: true, title: true } },
      _count: { select: { messages: true, branches: true, shares: true } },
    },
  });
  if (!chat) return null;
  if (chat.userId !== userId) return null;
  return chat;
}

// GET /api/v1/chats/[id] — Get chat with messages
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

    const messages = await db.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        versions: { orderBy: { version: 'desc' } },
        reactions: true,
        _count: { select: { artifacts: true } },
      },
    });

    return NextResponse.json(successResponse({ ...chat, messages }));
  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/chats/[id] — Update chat
export async function PATCH(
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
    const { title, folderId, isPinned, isFavorite, isArchived, modelParams } = body;

    const data: Record<string, unknown> = {};
    if (typeof title === 'string') data.title = title;
    if (folderId !== undefined) data.folderId = folderId || null;
    if (typeof isPinned === 'boolean') data.isPinned = isPinned;
    if (typeof isFavorite === 'boolean') data.isFavorite = isFavorite;
    if (typeof isArchived === 'boolean') data.isArchived = isArchived;
    if (modelParams !== undefined) data.modelParams = modelParams ? JSON.stringify(modelParams) : null;

    const updated = await db.chat.update({
      where: { id },
      data,
      include: {
        folder: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'UPDATE',
      resource: 'chat',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Chat updated successfully'));
  } catch (error) {
    console.error('Update chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/chats/[id] — Delete chat
export async function DELETE(
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

    await db.chat.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'DELETE',
      resource: 'chat',
      resourceId: id,
      details: { title: chat.title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'Chat deleted successfully'));
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

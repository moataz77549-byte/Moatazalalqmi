import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Helper: verify chat ownership
async function getOwnedChat(chatId: string, userId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) return null;
  return chat;
}

// GET /api/v1/chats/[id]/share — Get share info
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

    const shares = await db.chatShare.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse({ isShared: chat.isShared, shares }));
  } catch (error) {
    console.error('Get share error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/chats/[id]/share — Create share link
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

    const body = await request.json().catch(() => ({}));
    const { isPublic, expiresAt } = body || {};

    const shareToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');

    const share = await db.chatShare.create({
      data: {
        chatId: id,
        userId: user.id,
        shareToken,
        isPublic: Boolean(isPublic),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Mark chat as shared
    await db.chat.update({
      where: { id },
      data: { isShared: true },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'CREATE',
      resource: 'chat_share',
      resourceId: share.id,
      details: { chatId: id, isPublic: Boolean(isPublic) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          ...share,
          shareUrl: `/shared/${share.shareToken}`,
        },
        'Share link created successfully'
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/chats/[id]/share — Revoke all shares (or specific by token)
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

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const where = token ? { chatId: id, shareToken: token } : { chatId: id };
    const deleted = await db.chatShare.deleteMany({ where });

    // If no shares remain, unset isShared
    const remaining = await db.chatShare.count({ where: { chatId: id } });
    if (remaining === 0) {
      await db.chat.update({ where: { id }, data: { isShared: false } });
    }

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'DELETE',
      resource: 'chat_share',
      resourceId: id,
      details: { token, count: deleted.count },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ revoked: deleted.count }, 'Share revoked successfully')
    );
  } catch (error) {
    console.error('Revoke share error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

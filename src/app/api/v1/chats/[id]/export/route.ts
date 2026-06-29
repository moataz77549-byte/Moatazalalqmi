import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/chats/[id]/export — Export chat as JSON or Markdown
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
    const chat = await db.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            model: true,
            tokensIn: true,
            tokensOut: true,
            status: true,
            createdAt: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!chat || chat.userId !== user.id) {
      return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    await createAuditLog({
      userId: user.id,
      organizationId: chat.organizationId,
      action: 'EXPORT',
      resource: 'chat',
      resourceId: id,
      details: { format },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const safeTitle = (chat.title || 'chat').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);

    if (format === 'markdown' || format === 'md') {
      const lines: string[] = [];
      lines.push(`# ${chat.title || 'Untitled Chat'}`);
      lines.push('');
      lines.push(`- **Chat ID:** ${chat.id}`);
      lines.push(`- **Created:** ${chat.createdAt.toISOString()}`);
      lines.push(`- **Updated:** ${chat.updatedAt.toISOString()}`);
      if (chat.tags.length > 0) {
        lines.push(`- **Tags:** ${chat.tags.map((t) => t.tag.name).join(', ')}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');

      for (const msg of chat.messages) {
        const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        lines.push(`## ${roleLabel} — ${msg.createdAt.toISOString()}`);
        lines.push('');
        lines.push(msg.content);
        lines.push('');
        if (msg.model) {
          lines.push(`> Model: ${msg.model} | Tokens in: ${msg.tokensIn ?? 0} / out: ${msg.tokensOut ?? 0}`);
          lines.push('');
        }
      }

      const markdown = lines.join('\n');

      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeTitle}.md"`,
        },
      });
    }

    // Default: JSON export
    const payload = {
      id: chat.id,
      title: chat.title,
      providerType: chat.providerType,
      modelId: chat.modelId,
      modelParams: chat.modelParams,
      isPinned: chat.isPinned,
      isFavorite: chat.isFavorite,
      isArchived: chat.isArchived,
      isShared: chat.isShared,
      parentChatId: chat.parentChatId,
      tags: chat.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      lastMessageAt: chat.lastMessageAt,
      messages: chat.messages,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeTitle}.json"`,
      },
    });
  } catch (error) {
    console.error('Export chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

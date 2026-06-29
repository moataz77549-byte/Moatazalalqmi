import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/search — Global search across chats, messages, files, notes, artifacts, projects
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    if (!q) {
      return NextResponse.json(
        errorResponse('Query parameter "q" is required'),
        { status: 400 }
      );
    }

    const organizationIds = (
      await db.membership.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
      })
    ).map((m) => m.organizationId);

    // Run all searches in parallel
    const [chats, messages, files, notes, artifacts, projects] = await Promise.all([
      db.chat.findMany({
        where: {
          userId: user.id,
          title: { contains: q },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          organizationId: true,
          projectId: true,
          updatedAt: true,
          isPinned: true,
          isFavorite: true,
        },
      }),
      db.message.findMany({
        where: {
          chat: { userId: user.id },
          content: { contains: q },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          chatId: true,
          role: true,
          content: true,
          createdAt: true,
          chat: { select: { id: true, title: true } },
        },
      }),
      db.file.findMany({
        where: {
          userId: user.id,
          name: { contains: q },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          mimeType: true,
          size: true,
          organizationId: true,
          projectId: true,
          updatedAt: true,
        },
      }),
      db.note.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          organizationId: true,
          projectId: true,
          updatedAt: true,
          isPinned: true,
        },
      }),
      db.artifact.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          artifactType: true,
          organizationId: true,
          projectId: true,
          chatId: true,
          updatedAt: true,
        },
      }),
      organizationIds.length > 0
        ? db.project.findMany({
            where: {
              organizationId: { in: organizationIds },
              OR: [{ name: { contains: q } }, { description: { contains: q } }],
            },
            take: limit,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              icon: true,
              color: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Truncate long content for previews
    const truncate = (text: string | null | undefined, maxLen = 200) => {
      if (!text) return '';
      if (text.length <= maxLen) return text;
      return text.slice(0, maxLen) + '…';
    };

    const results = {
      chats: chats.map((c) => ({ ...c, type: 'chat', preview: truncate(c.title || '', 200) })),
      messages: messages.map((m) => ({
        ...m,
        type: 'message',
        preview: truncate(m.content, 200),
      })),
      files: files.map((f) => ({ ...f, type: 'file', preview: truncate(f.name, 200) })),
      notes: notes.map((n) => ({
        ...n,
        type: 'note',
        preview: truncate(n.content, 200),
      })),
      artifacts: artifacts.map((a) => ({
        ...a,
        type: 'artifact',
        preview: truncate(a.title, 200),
      })),
      projects: projects.map((p) => ({
        ...p,
        type: 'project',
        preview: truncate(p.description || p.name, 200),
      })),
      total:
        chats.length +
        messages.length +
        files.length +
        notes.length +
        artifacts.length +
        projects.length,
      query: q,
    };

    return NextResponse.json(successResponse(results));
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

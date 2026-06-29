import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';
import { ProviderType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/v1/chats — List user's chats with filtering & search
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const folderId = searchParams.get('folderId');
    const isPinned = searchParams.get('isPinned');
    const isFavorite = searchParams.get('isFavorite');
    const isArchived = searchParams.get('isArchived');
    const search = searchParams.get('search') || searchParams.get('q');
    const tags = searchParams.get('tags'); // comma-separated tag IDs
    const projectId = searchParams.get('projectId');
    const organizationId = searchParams.get('organizationId');

    const where: Record<string, unknown> = { userId: user.id };

    if (folderId) where.folderId = folderId;
    if (projectId) where.projectId = projectId;
    if (organizationId) where.organizationId = organizationId;
    if (isPinned === 'true') where.isPinned = true;
    if (isPinned === 'false') where.isPinned = false;
    if (isFavorite === 'true') where.isFavorite = true;
    if (isFavorite === 'false') where.isFavorite = false;
    if (isArchived === 'true') where.isArchived = true;
    if (isArchived === 'false') where.isArchived = false;
    if (search) {
      where.title = { contains: search };
    }
    if (tags) {
      const tagIds = tags.split(',').map((t) => t.trim()).filter(Boolean);
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    const [chats, total] = await Promise.all([
      db.chat.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { [sortBy]: sortOrder }],
        include: {
          folder: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          _count: { select: { messages: true } },
        },
      }),
      db.chat.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(chats, page, limit, total));
  } catch (error) {
    console.error('List chats error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/chats — Create a new chat
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      organizationId,
      projectId,
      folderId,
      modelParams,
      providerType,
      modelId,
      tags,
    } = body;

    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

    // Validate organizationId belongs to user
    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json(errorResponse('Forbidden: not an organization member'), { status: 403 });
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await db.folder.findFirst({
        where: { id: folderId, userId: user.id, organizationId },
      });
      if (!folder) {
        return NextResponse.json(errorResponse('Folder not found'), { status: 404 });
      }
    }

    // Validate project if provided
    if (projectId) {
      const project = await db.project.findFirst({
        where: { id: projectId, organizationId },
      });
      if (!project) {
        return NextResponse.json(errorResponse('Project not found'), { status: 404 });
      }
    }

    const chat = await db.chat.create({
      data: {
        title: title || 'New Chat',
        organizationId,
        projectId: projectId || null,
        folderId: folderId || null,
        userId: user.id,
        providerType: providerType as ProviderType | null,
        modelId: modelId || null,
        modelParams: modelParams ? JSON.stringify(modelParams) : null,
      },
      include: {
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
      },
    });

    // Attach tags if provided
    if (Array.isArray(tags) && tags.length > 0) {
      const validTags = await db.tag.findMany({
        where: { id: { in: tags }, userId: user.id, organizationId },
      });
      if (validTags.length > 0) {
        await db.chatTag.createMany({
          data: validTags.map((t) => ({ chatId: chat.id, tagId: t.id })),
          skipDuplicates: true,
        });
      }
    }

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'chat',
      resourceId: chat.id,
      details: { title: chat.title, projectId, folderId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(chat, 'Chat created successfully'), { status: 201 });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

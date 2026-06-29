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
import { ArtifactType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_TYPES: ArtifactType[] = [
  'CODE',
  'IMAGE',
  'DOCUMENT',
  'TABLE',
  'CHART',
  'MARKDOWN',
  'PDF',
  'JSON',
  'CSV',
  'HTML',
  'SVG',
];

// GET /api/v1/artifacts — List artifacts (filter by type, projectId, chatId)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const type = searchParams.get('type') as ArtifactType | null;
    const projectId = searchParams.get('projectId');
    const chatId = searchParams.get('chatId');
    const messageId = searchParams.get('messageId');
    const search = searchParams.get('search') || searchParams.get('q');

    const where: Record<string, unknown> = { userId: user.id };
    if (type && VALID_TYPES.includes(type)) where.artifactType = type;
    if (projectId) where.projectId = projectId;
    if (chatId) where.chatId = chatId;
    if (messageId) where.messageId = messageId;
    if (search) where.title = { contains: search };

    const [artifacts, total] = await Promise.all([
      db.artifact.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: { select: { id: true, name: true } },
          chat: { select: { id: true, title: true } },
        },
      }),
      db.artifact.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(artifacts, page, limit, total));
  } catch (error) {
    console.error('List artifacts error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/artifacts — Create artifact
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { title, type, content, language, projectId, chatId, messageId, organizationId, isPublic, metadata } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(errorResponse('title is required'), { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        errorResponse(`type must be one of: ${VALID_TYPES.join(', ')}`),
        { status: 400 }
      );
    }
    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

    // Validate membership
    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: not an organization member'),
        { status: 403 }
      );
    }

    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, organizationId } });
      if (!project) {
        return NextResponse.json(errorResponse('Project not found'), { status: 404 });
      }
    }
    if (chatId) {
      const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id, organizationId } });
      if (!chat) {
        return NextResponse.json(errorResponse('Chat not found'), { status: 404 });
      }
    }
    if (messageId) {
      const message = await db.message.findFirst({ where: { id: messageId, chatId } });
      if (!message) {
        return NextResponse.json(errorResponse('Message not found'), { status: 404 });
      }
    }

    const artifact = await db.artifact.create({
      data: {
        title,
        artifactType: type as ArtifactType,
        content,
        language: language || null,
        organizationId,
        userId: user.id,
        projectId: projectId || null,
        chatId: chatId || null,
        messageId: messageId || null,
        isPublic: Boolean(isPublic),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'artifact',
      resourceId: artifact.id,
      details: { title, type, projectId, chatId, messageId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(artifact, 'Artifact created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create artifact error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

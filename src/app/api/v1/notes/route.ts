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

export const dynamic = 'force-dynamic';

// GET /api/v1/notes — List user's notes
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const projectId = searchParams.get('projectId');
    const organizationId = searchParams.get('organizationId');
    const isPinned = searchParams.get('isPinned');
    const search = searchParams.get('search') || searchParams.get('q');

    const where: Record<string, unknown> = { userId: user.id };
    if (projectId) where.projectId = projectId;
    if (organizationId) where.organizationId = organizationId;
    if (isPinned === 'true') where.isPinned = true;
    if (isPinned === 'false') where.isPinned = false;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [notes, total] = await Promise.all([
      db.note.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { [sortBy]: sortOrder }],
        include: { project: { select: { id: true, name: true } } },
      }),
      db.note.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(notes, page, limit, total));
  } catch (error) {
    console.error('List notes error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/notes — Create note
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { title, content, organizationId, projectId, isPinned, tags } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(errorResponse('title is required'), { status: 400 });
    }
    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

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

    const note = await db.note.create({
      data: {
        title,
        content,
        organizationId,
        userId: user.id,
        projectId: projectId || null,
        isPinned: Boolean(isPinned),
        tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'note',
      resourceId: note.id,
      details: { title, projectId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(note, 'Note created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

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

const VALID_STATUSES = ['todo', 'in-progress', 'done', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// GET /api/v1/tasks — List user's tasks
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
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search') || searchParams.get('q');

    const where: Record<string, unknown> = { userId: user.id };
    if (projectId) where.projectId = projectId;
    if (organizationId) where.organizationId = organizationId;
    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (priority && VALID_PRIORITIES.includes(priority)) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: { project: { select: { id: true, name: true } } },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(tasks, page, limit, total));
  } catch (error) {
    console.error('List tasks error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/tasks — Create task
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { title, description, status, priority, organizationId, projectId, dueDate, assigneeId, tags } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(errorResponse('title is required'), { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        errorResponse(`status must be one of: ${VALID_STATUSES.join(', ')}`),
        { status: 400 }
      );
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        errorResponse(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`),
        { status: 400 }
      );
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

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        organizationId,
        userId: user.id,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        completedAt: status === 'done' ? new Date() : null,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'task',
      resourceId: task.id,
      details: { title, status, priority },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(task, 'Task created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

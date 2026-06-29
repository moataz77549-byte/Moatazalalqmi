import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['todo', 'in-progress', 'done', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

async function getOwnedTask(taskId: string, userId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) return null;
  return task;
}

// GET /api/v1/tasks/[id] — Get task
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
    const task = await getOwnedTask(id, user.id);
    if (!task) {
      return NextResponse.json(errorResponse('Task not found'), { status: 404 });
    }

    const full = await db.task.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/tasks/[id] — Update task
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
    const task = await getOwnedTask(id, user.id);
    if (!task) {
      return NextResponse.json(errorResponse('Task not found'), { status: 404 });
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId, tags, projectId } = body;

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

    const data: Record<string, unknown> = {};
    if (typeof title === 'string') data.title = title;
    if (description !== undefined) data.description = description || null;
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
    }
    if (projectId !== undefined) data.projectId = projectId || null;

    // If status changed to done, set completedAt; otherwise clear
    if (status === 'done' && task.status !== 'done') {
      data.completedAt = new Date();
    } else if (status && status !== 'done') {
      data.completedAt = null;
    }

    const updated = await db.task.update({
      where: { id },
      data,
      include: { project: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: task.organizationId,
      action: 'UPDATE',
      resource: 'task',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Task updated successfully'));
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/tasks/[id] — Delete task
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
    const task = await getOwnedTask(id, user.id);
    if (!task) {
      return NextResponse.json(errorResponse('Task not found'), { status: 404 });
    }

    await db.task.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: task.organizationId,
      action: 'DELETE',
      resource: 'task',
      resourceId: id,
      details: { title: task.title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'Task deleted successfully'));
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

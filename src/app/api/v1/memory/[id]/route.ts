import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { memoryEngine } from '@/lib/memory/memory-engine';
import { errorResponse, successResponse } from '@/lib/api';
import { MemoryScope, MemoryType } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function getOwnedMemory(memoryId: string, userId: string) {
  const memory = await db.memory.findUnique({ where: { id: memoryId } });
  if (!memory || memory.userId !== userId) return null;
  return memory;
}

// GET /api/v1/memory/[id] — Get memory by ID
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
    const memory = await getOwnedMemory(id, user.id);
    if (!memory) {
      return NextResponse.json(errorResponse('Memory not found'), { status: 404 });
    }

    const full = await db.memory.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        versions: {
          select: { id: true, version: true, content: true, createdAt: true },
          orderBy: { version: 'desc' },
          take: 10,
        },
        permissions: {
          select: { id: true, userId: true, access: true, createdAt: true },
        },
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get memory error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/memory/[id] — Update memory (uses createVersion for content changes)
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
    const memory = await getOwnedMemory(id, user.id);
    if (!memory) {
      return NextResponse.json(errorResponse('Memory not found'), { status: 404 });
    }

    const body = await request.json();
    const {
      content,
      type,
      scope,
      importance,
      confidence,
      expiresAt,
      tags,
      metadata,
      projectId,
    } = body;

    // If content changed, create a new version
    if (typeof content === 'string' && content.trim() && content !== memory.content) {
      const updated = await memoryEngine.createVersion(id, content);

      // Apply other fields directly
      const extraData: Record<string, unknown> = {};
      if (type !== undefined) extraData.type = type as MemoryType;
      if (scope !== undefined) extraData.scope = scope as MemoryScope;
      if (typeof importance === 'number') extraData.importance = importance;
      if (typeof confidence === 'number') extraData.confidence = confidence;
      if (expiresAt !== undefined) {
        extraData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }
      if (tags !== undefined) {
        extraData.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
      }
      if (metadata !== undefined && typeof metadata === 'object') {
        extraData.metadata = JSON.stringify(metadata);
      }
      if (projectId !== undefined) extraData.projectId = projectId || null;

      const finalMemory = Object.keys(extraData).length
        ? await db.memory.update({ where: { id }, data: extraData })
        : updated;

      await createAuditLog({
        userId: user.id,
        organizationId: memory.organizationId,
        action: 'UPDATE',
        resource: 'memory',
        resourceId: id,
        details: { versioned: true, version: finalMemory.version, fields: Object.keys(extraData) },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        successResponse(finalMemory, 'Memory updated with new version')
      );
    }

    // Non-content changes only
    const data: Record<string, unknown> = {};
    if (type !== undefined) data.type = type as MemoryType;
    if (scope !== undefined) data.scope = scope as MemoryScope;
    if (typeof importance === 'number') data.importance = importance;
    if (typeof confidence === 'number') data.confidence = confidence;
    if (expiresAt !== undefined) {
      data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
    }
    if (metadata !== undefined && typeof metadata === 'object') {
      data.metadata = JSON.stringify(metadata);
    }
    if (projectId !== undefined) data.projectId = projectId || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(successResponse(memory, 'No changes'));
    }

    const updated = await db.memory.update({ where: { id }, data });

    await createAuditLog({
      userId: user.id,
      organizationId: memory.organizationId,
      action: 'UPDATE',
      resource: 'memory',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Memory updated successfully'));
  } catch (error) {
    console.error('Update memory error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/memory/[id] — Delete memory (or deprecate)
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
    const memory = await getOwnedMemory(id, user.id);
    if (!memory) {
      return NextResponse.json(errorResponse('Memory not found'), { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const reason = searchParams.get('reason') || undefined;

    if (permanent) {
      await db.memory.delete({ where: { id } });
      await createAuditLog({
        userId: user.id,
        organizationId: memory.organizationId,
        action: 'DELETE',
        resource: 'memory',
        resourceId: id,
        details: { permanent: true, reason },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      return NextResponse.json(
        successResponse({ id, deleted: true }, 'Memory permanently deleted')
      );
    }

    // Soft delete via deprecate
    const deprecated = await memoryEngine.deprecate(id, reason || undefined);
    await createAuditLog({
      userId: user.id,
      organizationId: memory.organizationId,
      action: 'DELETE',
      resource: 'memory',
      resourceId: id,
      details: { deprecated: true, reason },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(deprecated, 'Memory deprecated successfully')
    );
  } catch (error) {
    console.error('Delete memory error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { memoryEngine } from '@/lib/memory/memory-engine';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';
import { MemoryScope, MemoryStatus, MemoryType } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function resolveOrgMembership(userId: string, organizationId?: string | null) {
  if (!organizationId) {
    const membership = await db.membership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { organizationId: true },
    });
    if (!membership) return null;
    return membership.organizationId;
  }
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

// GET /api/v1/memory — List user's memories
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const organizationId = searchParams.get('organizationId');
    const scope = searchParams.get('scope');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search') || searchParams.get('q');

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(paginatedResponse([], page, limit, 0));
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      userId: user.id,
    };

    if (scope) {
      const scopes = scope.split(',').filter(Boolean) as MemoryScope[];
      if (scopes.length) where.scope = { in: scopes };
    }
    if (type) {
      const types = type.split(',').filter(Boolean) as MemoryType[];
      if (types.length) where.type = { in: types };
    }
    if (status) {
      const statuses = status.split(',').filter(Boolean) as MemoryStatus[];
      if (statuses.length) where.status = { in: statuses };
    }
    if (projectId) where.projectId = projectId;

    if (search) {
      where.OR = [
        { content: { contains: search } },
        { summary: { contains: search } },
      ];
    }

    const [memories, total] = await Promise.all([
      db.memory.findMany({
        where,
        skip,
        take,
        orderBy: [{ importance: 'desc' }, { [sortBy]: sortOrder }],
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
      db.memory.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(memories, page, limit, total));
  } catch (error) {
    console.error('List memories error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/memory — Create memory
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const {
      content,
      type,
      scope,
      organizationId,
      projectId,
      chatId,
      importance,
      confidence,
      expiresAt,
      tags,
      source,
      metadata,
    } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }
    if (!scope) {
      return NextResponse.json(errorResponse('scope is required'), { status: 400 });
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, organizationId: orgId } });
      if (!project) {
        return NextResponse.json(errorResponse('Project not found'), { status: 404 });
      }
    }

    const memory = await memoryEngine.create({
      content,
      type: type as MemoryType | undefined,
      scope: scope as MemoryScope,
      organizationId: orgId,
      userId: user.id,
      projectId: projectId || undefined,
      chatId: chatId || undefined,
      importance: typeof importance === 'number' ? importance : undefined,
      confidence: typeof confidence === 'number' ? confidence : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      source: source || 'manual',
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
    });

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'memory',
      resourceId: memory.id,
      details: { type: memory.type, scope: memory.scope, projectId: projectId || null },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(memory, 'Memory created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create memory error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

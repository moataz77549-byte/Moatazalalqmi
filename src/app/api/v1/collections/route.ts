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
import { CollectionType } from '@prisma/client';

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

// GET /api/v1/collections — List collections
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const organizationId = searchParams.get('organizationId');
    const collectionType = searchParams.get('type');
    const parentId = searchParams.get('parentId');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search') || searchParams.get('q');
    const rootOnly = searchParams.get('rootOnly') === 'true';

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(paginatedResponse([], page, limit, 0));
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      userId: user.id,
    };

    if (collectionType) {
      const types = collectionType.split(',').filter(Boolean) as CollectionType[];
      if (types.length) where.collectionType = { in: types };
    }
    if (projectId) where.projectId = projectId;
    if (rootOnly) {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [collections, total] = await Promise.all([
      db.collection.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { [sortBy]: sortOrder }],
        include: {
          project: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true } },
          _count: {
            select: {
              documents: true,
              children: true,
            },
          },
        },
      }),
      db.collection.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(collections, page, limit, total));
  } catch (error) {
    console.error('List collections error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/collections — Create collection
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      collectionType,
      parentId,
      organizationId,
      projectId,
      icon,
      color,
    } = body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(errorResponse('name is required'), { status: 400 });
    }

    const resolvedType = (type || collectionType) as CollectionType | undefined;
    if (!resolvedType) {
      return NextResponse.json(
        errorResponse('type (collectionType) is required'),
        { status: 400 }
      );
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    if (parentId) {
      const parent = await db.collection.findFirst({
        where: { id: parentId, organizationId: orgId, userId: user.id },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json(errorResponse('Parent collection not found'), { status: 404 });
      }
    }

    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, organizationId: orgId } });
      if (!project) {
        return NextResponse.json(errorResponse('Project not found'), { status: 404 });
      }
    }

    const collection = await db.collection.create({
      data: {
        name,
        description: description || null,
        collectionType: resolvedType,
        parentId: parentId || null,
        organizationId: orgId,
        userId: user.id,
        projectId: projectId || null,
        icon: icon || null,
        color: color || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'collection',
      resourceId: collection.id,
      details: { name, type: resolvedType, parentId, projectId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(collection, 'Collection created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create collection error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

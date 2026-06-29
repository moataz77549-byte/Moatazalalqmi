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

// Helper: list organization IDs the user is a member of
async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const memberships = await db.membership.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  return memberships.map((m) => m.organizationId);
}

// GET /api/v1/projects — List user's projects (with stats)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);
    const organizationId = searchParams.get('organizationId');
    const search = searchParams.get('search') || searchParams.get('q');

    const orgIds = await getUserOrganizationIds(user.id);
    if (organizationId && !orgIds.includes(organizationId) && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: not an organization member'),
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = {};
    if (organizationId) {
      where.organizationId = organizationId;
    } else {
      where.organizationId = { in: orgIds };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          organization: { select: { id: true, name: true } },
          _count: {
            select: {
              chats: true,
              files: true,
              artifacts: true,
              notes: true,
              tasks: true,
              workspaces: true,
            },
          },
        },
      }),
      db.project.count({ where }),
    ]);

    // Aggregate stats
    const stats = projects.map((p) => ({
      ...p,
      stats: {
        chats: p._count.chats,
        files: p._count.files,
        artifacts: p._count.artifacts,
        notes: p._count.notes,
        tasks: p._count.tasks,
        workspaces: p._count.workspaces,
      },
      _count: undefined,
    }));

    return NextResponse.json(paginatedResponse(stats, page, limit, total));
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/projects — Create project
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, icon, color, organizationId } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(errorResponse('name is required'), { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (
      (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MANAGER')) &&
      !user.isSuperAdmin
    ) {
      return NextResponse.json(
        errorResponse('Forbidden: Admin or Manager role required'),
        { status: 403 }
      );
    }

    const projectSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!projectSlug) {
      return NextResponse.json(errorResponse('Invalid project slug'), { status: 400 });
    }

    const existing = await db.project.findUnique({
      where: { organizationId_slug: { organizationId, slug: projectSlug } },
    });
    if (existing) {
      return NextResponse.json(
        errorResponse('Project slug already exists in this organization'),
        { status: 409 }
      );
    }

    const project = await db.project.create({
      data: {
        name,
        slug: projectSlug,
        description: description || null,
        icon: icon || null,
        color: color || null,
        organizationId,
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'project',
      resourceId: project.id,
      details: { name, slug: projectSlug },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(project, 'Project created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

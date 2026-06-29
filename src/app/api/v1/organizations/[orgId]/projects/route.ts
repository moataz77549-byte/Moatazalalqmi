import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { createProjectSchema } from '@/lib/validators';
import { createAuditLog } from '@/lib/audit';
import { parsePaginationParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Helper: check if user is a member of the organization
async function getMembership(userId: string, organizationId: string) {
  return db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

// GET /api/v1/organizations/[orgId]/projects — List projects in organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { orgId } = await params;

    // Check membership
    const membership = await getMembership(user.id, orgId);
    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: You are not a member of this organization'),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where: { organizationId: orgId },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { workspaces: true, chats: true, files: true },
          },
        },
      }),
      db.project.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json(
      paginatedResponse(projects, page, limit, total),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('List projects error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// POST /api/v1/organizations/[orgId]/projects — Create project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { orgId } = await params;

    // Check membership with ADMIN or MANAGER role
    const membership = await getMembership(user.id, orgId);
    if ((!membership || (membership.role !== 'ADMIN' && membership.role !== 'MANAGER')) && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: Admin or Manager role required'),
        { status: 403 }
      );
    }

    const body = await request.json();

    // Override organizationId with the URL param
    const dataWithOrgId = { ...body, organizationId: orgId };
    const validation = createProjectSchema.safeParse(dataWithOrgId);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { name, slug, description, icon, color } = validation.data;

    // Check slug uniqueness within organization
    const existingProject = await db.project.findUnique({
      where: { organizationId_slug: { organizationId: orgId, slug } },
    });

    if (existingProject) {
      return NextResponse.json(
        errorResponse('Project slug already exists in this organization'),
        { status: 409 }
      );
    }

    const project = await db.project.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        color: color || null,
        organizationId: orgId,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'project',
      resourceId: project.id,
      details: { name, slug },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(project, 'Project created successfully'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Create project error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

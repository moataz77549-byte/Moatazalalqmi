import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { createTeamSchema } from '@/lib/validators';
import { createAuditLog } from '@/lib/audit';
import { parsePaginationParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Helper: check if user is a member of the organization
async function getMembership(userId: string, organizationId: string) {
  return db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

// GET /api/v1/organizations/[orgId]/teams — List teams in organization
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

    const [teams, total] = await Promise.all([
      db.team.findMany({
        where: { organizationId: orgId },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { memberships: true },
          },
        },
      }),
      db.team.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json(
      paginatedResponse(teams, page, limit, total),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('List teams error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// POST /api/v1/organizations/[orgId]/teams — Create team
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
    const validation = createTeamSchema.safeParse(dataWithOrgId);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { name, slug, description } = validation.data;

    // Check slug uniqueness within organization
    const existingTeam = await db.team.findUnique({
      where: { organizationId_slug: { organizationId: orgId, slug } },
    });

    if (existingTeam) {
      return NextResponse.json(
        errorResponse('Team slug already exists in this organization'),
        { status: 409 }
      );
    }

    const team = await db.team.create({
      data: {
        name,
        slug,
        description: description || null,
        organizationId: orgId,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'team',
      resourceId: team.id,
      details: { name, slug },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(team, 'Team created successfully'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Create team error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

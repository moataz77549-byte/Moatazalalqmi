import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { createOrganizationSchema } from '@/lib/validators';
import { createAuditLog } from '@/lib/audit';
import { parsePaginationParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/organizations — List user's organizations (paginated)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const whereClause = {
      memberships: {
        some: { userId: user.id },
      },
    };

    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { memberships: true, projects: true, teams: true },
          },
        },
      }),
      db.organization.count({ where: whereClause }),
    ]);

    return NextResponse.json(
      paginatedResponse(organizations, page, limit, total),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('List organizations error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// POST /api/v1/organizations — Create organization
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const body = await request.json();
    const validation = createOrganizationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { name, slug, description } = validation.data;

    // Check slug uniqueness
    const existingOrg = await db.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return NextResponse.json(
        errorResponse('Organization slug already exists'),
        { status: 409 }
      );
    }

    // Create organization with owner membership
    const organization = await db.organization.create({
      data: {
        name,
        slug,
        description: description || null,
        ownerId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      organizationId: organization.id,
      action: 'CREATE',
      resource: 'organization',
      resourceId: organization.id,
      details: { name, slug },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(organization, 'Organization created successfully'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Create organization error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

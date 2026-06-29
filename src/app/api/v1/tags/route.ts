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

// GET /api/v1/tags — List user's tags
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

    const where: Record<string, unknown> = { userId: user.id };
    if (organizationId) where.organizationId = organizationId;
    if (search) where.name = { contains: search };

    const [tags, total] = await Promise.all([
      db.tag.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { chats: true } } },
      }),
      db.tag.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(tags, page, limit, total));
  } catch (error) {
    console.error('List tags error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/tags — Create tag
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { name, color, organizationId } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(errorResponse('name is required'), { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

    // Validate membership
    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: not an organization member'),
        { status: 403 }
      );
    }

    // Check uniqueness within org+user
    const existing = await db.tag.findUnique({
      where: {
        organizationId_name_userId: { organizationId, name, userId: user.id },
      },
    });
    if (existing) {
      return NextResponse.json(
        errorResponse('Tag with this name already exists for you in this organization'),
        { status: 409 }
      );
    }

    const tag = await db.tag.create({
      data: {
        name,
        color: color || '#6366f1',
        organizationId,
        userId: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'tag',
      resourceId: tag.id,
      details: { name, color },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(tag, 'Tag created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

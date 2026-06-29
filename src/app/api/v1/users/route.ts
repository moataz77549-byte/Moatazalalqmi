import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { parsePaginationParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/users — List users (paginated, requires auth)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const [users, total] = await Promise.all([
      db.user.findMany({
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          emailVerified: true,
          isActive: true,
          isSuperAdmin: true,
          preferredLocale: true,
          timezone: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.user.count(),
    ]);

    return NextResponse.json(
      paginatedResponse(users, page, limit, total),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('List users error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// POST /api/v1/users — Create user (admin only, stub)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    if (!user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: Admin access required'),
        { status: 403 }
      );
    }

    // Stub for admin user creation
    return NextResponse.json(
      successResponse(null, 'Admin user creation is not yet implemented'),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Create user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

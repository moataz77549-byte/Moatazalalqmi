import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { updateProfileSchema } from '@/lib/validators';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/users/[id] — Get user by ID (requires auth, self or admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { id } = await params;

    // Only allow self or super admin
    if (user.id !== id && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: You can only view your own profile'),
        { status: 403 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id },
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
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(targetUser),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Get user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// PATCH /api/v1/users/[id] — Update user profile (requires auth, self only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { id } = await params;

    // Only allow self
    if (user.id !== id) {
      return NextResponse.json(
        errorResponse('Forbidden: You can only update your own profile'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Build update object with only provided fields
    const data: Record<string, unknown> = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.avatarUrl !== undefined) data.avatarUrl = updateData.avatarUrl;
    if (updateData.locale !== undefined) data.preferredLocale = updateData.locale;
    if (updateData.timezone !== undefined) data.timezone = updateData.timezone;

    const updatedUser = await db.user.update({
      where: { id },
      data,
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
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      resource: 'user',
      resourceId: user.id,
      details: updateData,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(updatedUser, 'Profile updated successfully'),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Update user error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

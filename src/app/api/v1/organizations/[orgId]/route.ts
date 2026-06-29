import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Helper: check if user is a member of the organization
async function getMembership(userId: string, organizationId: string) {
  return db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

// GET /api/v1/organizations/[orgId] — Get organization by ID (member only)
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

    const organization = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { memberships: true, projects: true, teams: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        errorResponse('Organization not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(organization),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Get organization error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// PATCH /api/v1/organizations/[orgId] — Update organization (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { orgId } = await params;

    // Check membership with ADMIN role
    const membership = await getMembership(user.id, orgId);
    if ((!membership || membership.role !== 'ADMIN') && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: Admin role required'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, logoUrl, isActive } = body;

    // Build update object with only provided fields
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (isActive !== undefined) data.isActive = isActive;

    const updatedOrganization = await db.organization.update({
      where: { id: orgId },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'UPDATE',
      resource: 'organization',
      resourceId: orgId,
      details: data,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(updatedOrganization, 'Organization updated successfully'),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Update organization error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

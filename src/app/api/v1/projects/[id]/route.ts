import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getAccessibleProject(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!project) return null;

  // Verify user is a member of the project's organization
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: project.organizationId } },
  });
  if (!membership && !false) {
    // Allow access if membership exists; super admin bypass handled by caller
  }
  return { project, membership };
}

// GET /api/v1/projects/[id] — Get project with workspace variables
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const result = await getAccessibleProject(id, user.id);
    if (!result) {
      return NextResponse.json(errorResponse('Project not found'), { status: 404 });
    }
    const { project, membership } = result;
    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: not an organization member'),
        { status: 403 }
      );
    }

    const full = await db.project.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        workspaceVariables: {
          orderBy: { createdAt: 'asc' },
        },
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
    });

    // Mask secret values
    const maskedVars = full?.workspaceVariables.map((v) => ({
      ...v,
      value: v.isSecret ? '••••••••' : v.value,
    }));

    return NextResponse.json(
      successResponse({ ...full, workspaceVariables: maskedVars })
    );
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/projects/[id] — Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const result = await getAccessibleProject(id, user.id);
    if (!result) {
      return NextResponse.json(errorResponse('Project not found'), { status: 404 });
    }
    const { project, membership } = result;
    if (
      (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MANAGER')) &&
      !user.isSuperAdmin
    ) {
      return NextResponse.json(
        errorResponse('Forbidden: Admin or Manager role required'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, description, icon, color, isActive } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (typeof slug === 'string') {
      // Check slug uniqueness if changing
      if (slug !== project.slug) {
        const existing = await db.project.findUnique({
          where: {
            organizationId_slug: {
              organizationId: project.organizationId,
              slug,
            },
          },
        });
        if (existing && existing.id !== id) {
          return NextResponse.json(
            errorResponse('Project slug already exists in this organization'),
            { status: 409 }
          );
        }
      }
      data.slug = slug;
    }
    if (description !== undefined) data.description = description || null;
    if (icon !== undefined) data.icon = icon || null;
    if (color !== undefined) data.color = color || null;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const updated = await db.project.update({
      where: { id },
      data,
      include: { organization: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: project.organizationId,
      action: 'UPDATE',
      resource: 'project',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Project updated successfully'));
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/projects/[id] — Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const result = await getAccessibleProject(id, user.id);
    if (!result) {
      return NextResponse.json(errorResponse('Project not found'), { status: 404 });
    }
    const { project, membership } = result;
    if (
      (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MANAGER')) &&
      !user.isSuperAdmin
    ) {
      return NextResponse.json(
        errorResponse('Forbidden: Admin or Manager role required'),
        { status: 403 }
      );
    }

    await db.project.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: project.organizationId,
      action: 'DELETE',
      resource: 'project',
      resourceId: id,
      details: { name: project.name },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'Project deleted successfully'));
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

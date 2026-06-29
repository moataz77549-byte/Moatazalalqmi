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

async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!project) return null;

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: project.organizationId } },
  });
  return { project, membership };
}

// GET /api/v1/projects/[id]/variables — List workspace variables
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
    const result = await verifyProjectAccess(id, user.id);
    if (!result) {
      return NextResponse.json(errorResponse('Project not found'), { status: 404 });
    }
    if (!result.membership && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: not an organization member'),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const [variables, total] = await Promise.all([
      db.workspaceVariable.findMany({
        where: { projectId: id },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      db.workspaceVariable.count({ where: { projectId: id } }),
    ]);

    // Mask secret values
    const masked = variables.map((v) => ({
      ...v,
      value: v.isSecret ? '••••••••' : v.value,
    }));

    return NextResponse.json(paginatedResponse(masked, page, limit, total));
  } catch (error) {
    console.error('List workspace variables error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/projects/[id]/variables — Create variable
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const result = await verifyProjectAccess(id, user.id);
    if (!result) {
      return NextResponse.json(errorResponse('Project not found'), { status: 404 });
    }
    const { project, membership } = result;
    if (
      (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MANAGER' && membership.role !== 'MEMBER')) &&
      !user.isSuperAdmin
    ) {
      return NextResponse.json(
        errorResponse('Forbidden: organization membership required'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, value, isSecret, description } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json(errorResponse('key is required'), { status: 400 });
    }
    if (value === undefined || typeof value !== 'string') {
      return NextResponse.json(errorResponse('value is required'), { status: 400 });
    }
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      return NextResponse.json(
        errorResponse('key must be a valid identifier (letters, numbers, underscore)'),
        { status: 400 }
      );
    }

    const existing = await db.workspaceVariable.findUnique({
      where: { projectId_key: { projectId: id, key } },
    });
    if (existing) {
      return NextResponse.json(
        errorResponse('Variable with this key already exists for this project'),
        { status: 409 }
      );
    }

    const variable = await db.workspaceVariable.create({
      data: {
        key,
        value,
        description: description || null,
        isSecret: Boolean(isSecret),
        organizationId: project.organizationId,
        projectId: id,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: project.organizationId,
      action: 'CREATE',
      resource: 'workspace_variable',
      resourceId: variable.id,
      details: { key, isSecret: Boolean(isSecret), projectId: id },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Mask the secret value in response
    const masked = { ...variable, value: variable.isSecret ? '••••••••' : variable.value };

    return NextResponse.json(
      successResponse(masked, 'Workspace variable created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create workspace variable error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

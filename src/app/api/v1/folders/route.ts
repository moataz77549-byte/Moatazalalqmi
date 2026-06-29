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
import { FolderType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_TYPES: FolderType[] = ['CHAT', 'FILE', 'PROJECT'];

// GET /api/v1/folders — List folders (filter by type, parentId)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const type = searchParams.get('type') as FolderType | null;
    const parentId = searchParams.get('parentId');
    const organizationId = searchParams.get('organizationId');

    const where: Record<string, unknown> = { userId: user.id };
    if (organizationId) where.organizationId = organizationId;
    if (type && VALID_TYPES.includes(type)) where.type = type;
    if (parentId !== null) {
      if (parentId === 'null' || parentId === '') {
        where.parentId = null;
      } else {
        where.parentId = parentId;
      }
    }

    const [folders, total] = await Promise.all([
      db.folder.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { [sortBy]: sortOrder }],
        include: {
          _count: { select: { children: true, chats: true, files: true } },
        },
      }),
      db.folder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(folders, page, limit, total));
  } catch (error) {
    console.error('List folders error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/folders — Create folder
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { name, type, parentId, icon, color, organizationId, sortOrder } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(errorResponse('name is required'), { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        errorResponse(`type must be one of: ${VALID_TYPES.join(', ')}`),
        { status: 400 }
      );
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

    // Validate parent if provided
    if (parentId) {
      const parent = await db.folder.findFirst({
        where: { id: parentId, userId: user.id, organizationId },
      });
      if (!parent) {
        return NextResponse.json(errorResponse('Parent folder not found'), { status: 404 });
      }
    }

    const folder = await db.folder.create({
      data: {
        name,
        type: type as FolderType,
        parentId: parentId || null,
        organizationId,
        userId: user.id,
        icon: icon || null,
        color: color || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
      include: { parent: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'folder',
      resourceId: folder.id,
      details: { name, type, parentId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(folder, 'Folder created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

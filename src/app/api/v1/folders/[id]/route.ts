import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedFolder(folderId: string, userId: string) {
  const folder = await db.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== userId) return null;
  return folder;
}

// GET /api/v1/folders/[id] — Get folder with children
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
    const folder = await getOwnedFolder(id, user.id);
    if (!folder) {
      return NextResponse.json(errorResponse('Folder not found'), { status: 404 });
    }

    const full = await db.folder.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { children: true, chats: true, files: true } } },
        },
        chats: {
          orderBy: { updatedAt: 'desc' },
          take: 50,
          select: { id: true, title: true, updatedAt: true, isPinned: true },
        },
        files: {
          orderBy: { updatedAt: 'desc' },
          take: 50,
          select: { id: true, name: true, mimeType: true, size: true, updatedAt: true },
        },
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get folder error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/folders/[id] — Update folder
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
    const folder = await getOwnedFolder(id, user.id);
    if (!folder) {
      return NextResponse.json(errorResponse('Folder not found'), { status: 404 });
    }

    const body = await request.json();
    const { name, parentId, icon, color, sortOrder } = body;

    // Prevent creating cycles
    if (parentId && parentId === id) {
      return NextResponse.json(
        errorResponse('Folder cannot be its own parent'),
        { status: 400 }
      );
    }
    if (parentId) {
      const parent = await db.folder.findFirst({
        where: { id: parentId, userId: user.id, organizationId: folder.organizationId },
      });
      if (!parent) {
        return NextResponse.json(errorResponse('Parent folder not found'), { status: 404 });
      }
    }

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (parentId !== undefined) data.parentId = parentId || null;
    if (icon !== undefined) data.icon = icon || null;
    if (color !== undefined) data.color = color || null;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;

    const updated = await db.folder.update({
      where: { id },
      data,
      include: { parent: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: folder.organizationId,
      action: 'UPDATE',
      resource: 'folder',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Folder updated successfully'));
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/folders/[id] — Delete folder (cascade to children)
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
    const folder = await getOwnedFolder(id, user.id);
    if (!folder) {
      return NextResponse.json(errorResponse('Folder not found'), { status: 404 });
    }

    // Cascade delete (Prisma onDelete: Cascade on parent relation handles children automatically)
    await db.folder.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: folder.organizationId,
      action: 'DELETE',
      resource: 'folder',
      resourceId: id,
      details: { name: folder.name },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ id }, 'Folder deleted successfully')
    );
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

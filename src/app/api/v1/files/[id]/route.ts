import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedFile(fileId: string, userId: string) {
  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return null;
  return file;
}

// GET /api/v1/files/[id] — Get file metadata
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
    const file = await getOwnedFile(id, user.id);
    if (!file) {
      return NextResponse.json(errorResponse('File not found'), { status: 404 });
    }

    const full = await db.file.findUnique({
      where: { id },
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        versions: {
          select: { id: true, name: true, version: true, createdAt: true },
          orderBy: { version: 'desc' },
        },
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get file error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/files/[id] — Update file (name, folderId)
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
    const file = await getOwnedFile(id, user.id);
    if (!file) {
      return NextResponse.json(errorResponse('File not found'), { status: 404 });
    }

    const body = await request.json();
    const { name, folderId } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (folderId !== undefined) {
      if (folderId) {
        const folder = await db.folder.findFirst({
          where: { id: folderId, userId: user.id, organizationId: file.organizationId, type: 'FILE' },
        });
        if (!folder) {
          return NextResponse.json(errorResponse('Folder not found'), { status: 404 });
        }
      }
      data.folderId = folderId || null;
    }

    const updated = await db.file.update({
      where: { id },
      data,
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: file.organizationId,
      action: 'UPDATE',
      resource: 'file',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'File updated successfully'));
  } catch (error) {
    console.error('Update file error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/files/[id] — Delete file
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
    const file = await getOwnedFile(id, user.id);
    if (!file) {
      return NextResponse.json(errorResponse('File not found'), { status: 404 });
    }

    // Attempt to delete the underlying storage object (best-effort)
    try {
      await deleteFile(file.storageKey);
    } catch (storageErr) {
      console.warn('Failed to delete storage object:', storageErr);
    }

    await db.file.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: file.organizationId,
      action: 'DELETE',
      resource: 'file',
      resourceId: id,
      details: { name: file.name, storageKey: file.storageKey },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'File deleted successfully'));
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

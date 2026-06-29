import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { uploadFile } from '@/lib/storage';
import { randomUUID } from 'crypto';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/files — List files (filter by projectId, folderId, mimeType)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const projectId = searchParams.get('projectId');
    const folderId = searchParams.get('folderId');
    const mimeType = searchParams.get('mimeType');
    const organizationId = searchParams.get('organizationId');
    const search = searchParams.get('search') || searchParams.get('q');

    const where: Record<string, unknown> = { userId: user.id };
    if (projectId) where.projectId = projectId;
    if (folderId) where.folderId = folderId;
    if (mimeType) where.mimeType = { contains: mimeType };
    if (organizationId) where.organizationId = organizationId;
    if (search) where.name = { contains: search };

    const [files, total] = await Promise.all([
      db.file.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          folder: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      db.file.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(files, page, limit, total));
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/files — Upload file (multipart form data)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const organizationId = formData.get('organizationId') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const folderId = formData.get('folderId') as string | null;

    if (!file) {
      return NextResponse.json(errorResponse('file is required'), { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json(
        errorResponse('Forbidden: not an organization member'),
        { status: 403 }
      );
    }

    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, organizationId } });
      if (!project) {
        return NextResponse.json(errorResponse('Project not found'), { status: 404 });
      }
    }
    if (folderId) {
      const folder = await db.folder.findFirst({
        where: { id: folderId, userId: user.id, organizationId, type: 'FILE' },
      });
      if (!folder) {
        return NextResponse.json(errorResponse('Folder not found'), { status: 404 });
      }
    }

    // Build storage key
    const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
    const storageKey = `${organizationId}/${user.id}/${randomUUID()}${ext ? '.' + ext : ''}`;

    const uploadResult = await uploadFile(storageKey, file, file.type || 'application/octet-stream');

    const fileRecord = await db.file.create({
      data: {
        name: file.name,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storageKey: uploadResult.key,
        url: uploadResult.url,
        organizationId,
        userId: user.id,
        projectId: projectId || null,
        folderId: folderId || null,
        status: 'COMPLETED',
        metadata: JSON.stringify({ originalSize: file.size, contentType: file.type }),
      },
      include: {
        folder: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      resource: 'file',
      resourceId: fileRecord.id,
      details: { name: file.name, size: file.size, mimeType: file.type, projectId, folderId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(fileRecord, 'File uploaded successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload file error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

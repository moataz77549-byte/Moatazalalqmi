import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { documentProcessor } from '@/lib/knowledge/document-processor';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';
import { DocumentStatus, DocumentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function resolveOrgMembership(userId: string, organizationId?: string | null) {
  if (!organizationId) {
    const membership = await db.membership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { organizationId: true },
    });
    if (!membership) return null;
    return membership.organizationId;
  }
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

// GET /api/v1/documents — List knowledge documents
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const organizationId = searchParams.get('organizationId');
    const collectionId = searchParams.get('collectionId');
    const projectId = searchParams.get('projectId');
    const documentType = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || searchParams.get('q');

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(paginatedResponse([], page, limit, 0));
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      userId: user.id,
    };

    if (collectionId) where.collectionId = collectionId;
    if (projectId) where.projectId = projectId;
    if (documentType) {
      const types = documentType.split(',').filter(Boolean) as DocumentType[];
      if (types.length) where.documentType = { in: types };
    }
    if (status) {
      const statuses = status.split(',').filter(Boolean) as DocumentStatus[];
      if (statuses.length) where.status = { in: statuses };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [documents, total] = await Promise.all([
      db.knowledgeDocument.findMany({
        where,
        skip,
        take,
        orderBy: [{ [sortBy]: sortOrder }],
        include: {
          collection: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { chunks: true, embeddings: true } },
        },
      }),
      db.knowledgeDocument.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(documents, page, limit, total));
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/documents — Create / upload a document
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      documentType,
      collectionId,
      organizationId,
      projectId,
      sourceUrl,
      tags,
      categories,
      fileId,
      sourceType,
    } = body || {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(errorResponse('title is required'), { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }
    if (!documentType) {
      return NextResponse.json(errorResponse('documentType is required'), { status: 400 });
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    if (collectionId) {
      const collection = await db.collection.findFirst({
        where: { id: collectionId, organizationId: orgId, userId: user.id },
        select: { id: true },
      });
      if (!collection) {
        return NextResponse.json(errorResponse('Collection not found'), { status: 404 });
      }
    }
    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, organizationId: orgId } });
      if (!project) {
        return NextResponse.json(errorResponse('Project not found'), { status: 404 });
      }
    }

    const document = await db.knowledgeDocument.create({
      data: {
        title,
        content,
        documentType: documentType as DocumentType,
        status: DocumentStatus.PENDING,
        organizationId: orgId,
        userId: user.id,
        projectId: projectId || null,
        collectionId: collectionId || null,
        fileId: fileId || null,
        sourceUrl: sourceUrl || null,
        sourceType: sourceType || 'manual',
        tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
        categories: Array.isArray(categories) ? JSON.stringify(categories) : null,
      },
      include: {
        collection: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'CREATE',
      resource: 'document',
      resourceId: document.id,
      details: {
        title,
        documentType,
        collectionId: collectionId || null,
        projectId: projectId || null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Fire-and-forget async processing
    documentProcessor
      .process({
        documentId: document.id,
        content,
        title,
        documentType: documentType as DocumentType,
        organizationId: orgId,
        userId: user.id,
        sourceUrl: sourceUrl || undefined,
        fileId: fileId || undefined,
      })
      .catch((err) => {
        console.error(`Async document processing failed for ${document.id}:`, err);
      });

    return NextResponse.json(
      successResponse(document, 'Document created; processing started'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

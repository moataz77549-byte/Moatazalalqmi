import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedDocument(documentId: string, userId: string) {
  const doc = await db.knowledgeDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

// GET /api/v1/documents/[id] — Get document with chunks
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
    const doc = await getOwnedDocument(id, user.id);
    if (!doc) {
      return NextResponse.json(errorResponse('Document not found'), { status: 404 });
    }

    const full = await db.knowledgeDocument.findUnique({
      where: { id },
      include: {
        collection: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            chunkIndex: true,
            content: true,
            charCount: true,
            tokenCount: true,
            startPosition: true,
            endPosition: true,
            embeddingStatus: true,
            embeddingModel: true,
            createdAt: true,
          },
        },
        _count: { select: { embeddings: true } },
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/documents/[id] — Update document metadata
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
    const doc = await getOwnedDocument(id, user.id);
    if (!doc) {
      return NextResponse.json(errorResponse('Document not found'), { status: 404 });
    }

    const body = await request.json();
    const { title, tags, categories, collectionId, projectId } = body || {};

    const data: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) data.title = title;
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
    }
    if (categories !== undefined) {
      data.categories = Array.isArray(categories) ? JSON.stringify(categories) : null;
    }
    if (collectionId !== undefined) {
      if (collectionId) {
        const collection = await db.collection.findFirst({
          where: { id: collectionId, organizationId: doc.organizationId, userId: user.id },
          select: { id: true },
        });
        if (!collection) {
          return NextResponse.json(errorResponse('Collection not found'), { status: 404 });
        }
        data.collectionId = collectionId;
      } else {
        data.collectionId = null;
      }
    }
    if (projectId !== undefined) {
      if (projectId) {
        const project = await db.project.findFirst({
          where: { id: projectId, organizationId: doc.organizationId },
          select: { id: true },
        });
        if (!project) {
          return NextResponse.json(errorResponse('Project not found'), { status: 404 });
        }
        data.projectId = projectId;
      } else {
        data.projectId = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(successResponse(doc, 'No changes'));
    }

    const updated = await db.knowledgeDocument.update({
      where: { id },
      data,
      include: {
        collection: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: doc.organizationId,
      action: 'UPDATE',
      resource: 'document',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Document updated successfully'));
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/documents/[id] — Delete document (chunks and embeddings cascade)
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
    const doc = await getOwnedDocument(id, user.id);
    if (!doc) {
      return NextResponse.json(errorResponse('Document not found'), { status: 404 });
    }

    // Remove search index entries for this document
    await db.searchIndex.deleteMany({
      where: { itemId: id, itemType: 'document' },
    }).catch(() => null);

    await db.knowledgeDocument.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: doc.organizationId,
      action: 'DELETE',
      resource: 'document',
      resourceId: id,
      details: { title: doc.title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ id, deleted: true }, 'Document deleted successfully')
    );
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

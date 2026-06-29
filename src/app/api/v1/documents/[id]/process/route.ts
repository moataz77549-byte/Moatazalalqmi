import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { documentProcessor } from '@/lib/knowledge/document-processor';
import { errorResponse, successResponse } from '@/lib/api';
import { DocumentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function getOwnedDocument(documentId: string, userId: string) {
  const doc = await db.knowledgeDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

// POST /api/v1/documents/[id]/process — Manually trigger / re-trigger document processing
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
    const doc = await getOwnedDocument(id, user.id);
    if (!doc) {
      return NextResponse.json(errorResponse('Document not found'), { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { async: runAsync = true, resetChunks = false } = body || {};

    if (resetChunks) {
      // Remove existing chunks & embeddings to allow a clean re-process
      await db.documentChunk.deleteMany({ where: { documentId: id } });
      await db.embedding.deleteMany({ where: { documentId: id } });
      await db.searchIndex.deleteMany({ where: { itemId: id, itemType: 'document' } });
    }

    // Reset to PENDING so processor can take it through the pipeline again
    await db.knowledgeDocument.update({
      where: { id },
      data: {
        status: DocumentStatus.PENDING,
        processingError: null,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: doc.organizationId,
      action: 'UPDATE',
      resource: 'document',
      resourceId: id,
      details: { action: 'reprocess', resetChunks, async: runAsync },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const processPromise = documentProcessor.process({
      documentId: id,
      content: doc.content,
      title: doc.title,
      documentType: doc.documentType,
      organizationId: doc.organizationId,
      userId: user.id,
      sourceUrl: doc.sourceUrl || undefined,
      fileId: doc.fileId || undefined,
    });

    if (runAsync) {
      processPromise.catch((err) => {
        console.error(`Async document processing failed for ${id}:`, err);
      });

      return NextResponse.json(
        successResponse(
          { id, status: 'processing', async: true },
          'Document processing started asynchronously'
        ),
        { status: 202 }
      );
    }

    // Synchronous: wait for completion
    const result = await processPromise;
    return NextResponse.json(
      successResponse({ id, result }, 'Document processing completed')
    );
  } catch (error) {
    console.error('Process document error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

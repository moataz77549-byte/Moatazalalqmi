import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { errorResponse, successResponse } from '@/lib/api';
import { DocumentStatus, EmbeddingStatus } from '@prisma/client';

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

// GET /api/v1/index/status — Get indexing status for the user's organization
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const projectId = searchParams.get('projectId');

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        successResponse({
          organizationId: null,
          documents: {
            total: 0,
            indexed: 0,
            pending: 0,
            failed: 0,
            extracting: 0,
            chunking: 0,
            embedding: 0,
            duplicate: 0,
          },
          chunks: { total: 0, embedded: 0, pending: 0, failed: 0 },
          embeddings: { total: 0, completed: 0, pending: 0, failed: 0 },
          collections: 0,
        })
      );
    }

    const docWhere: Record<string, unknown> = {
      organizationId: orgId,
      userId: user.id,
    };
    if (projectId) docWhere.projectId = projectId;

    const chunkWhere: Record<string, unknown> = {
      document: {
        organizationId: orgId,
        userId: user.id,
      },
    };
    if (projectId) {
      (chunkWhere.document as Record<string, unknown>).projectId = projectId;
    }

    const embeddingWhere: Record<string, unknown> = {
      organizationId: orgId,
      userId: user.id,
    };

    const [
      totalDocs,
      indexedDocs,
      pendingDocs,
      failedDocs,
      extractingDocs,
      chunkingDocs,
      embeddingDocs,
      duplicateDocs,
      totalChunks,
      embeddedChunks,
      pendingChunks,
      failedChunks,
      totalEmbeddings,
      completedEmbeddings,
      pendingEmbeddings,
      failedEmbeddings,
      collectionsCount,
    ] = await Promise.all([
      db.knowledgeDocument.count({ where: docWhere }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.INDEXED } }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.PENDING } }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.FAILED } }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.EXTRACTING } }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.CHUNKING } }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.EMBEDDING } }),
      db.knowledgeDocument.count({ where: { ...docWhere, status: DocumentStatus.DUPLICATE } }),
      db.documentChunk.count({ where: chunkWhere }),
      db.documentChunk.count({ where: { ...chunkWhere, embeddingStatus: EmbeddingStatus.COMPLETED } }),
      db.documentChunk.count({ where: { ...chunkWhere, embeddingStatus: EmbeddingStatus.PENDING } }),
      db.documentChunk.count({ where: { ...chunkWhere, embeddingStatus: EmbeddingStatus.FAILED } }),
      db.embedding.count({ where: embeddingWhere }),
      db.embedding.count({ where: { ...embeddingWhere, status: EmbeddingStatus.COMPLETED } }),
      db.embedding.count({ where: { ...embeddingWhere, status: EmbeddingStatus.PENDING } }),
      db.embedding.count({ where: { ...embeddingWhere, status: EmbeddingStatus.FAILED } }),
      db.collection.count({
        where: { organizationId: orgId, userId: user.id, ...(projectId ? { projectId } : {}) },
      }),
    ]);

    const indexedPercent =
      totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : 0;
    const embeddedChunkPercent =
      totalChunks > 0 ? Math.round((embeddedChunks / totalChunks) * 100) : 0;

    return NextResponse.json(
      successResponse({
        organizationId: orgId,
        projectId: projectId || null,
        documents: {
          total: totalDocs,
          indexed: indexedDocs,
          pending: pendingDocs,
          extracting: extractingDocs,
          chunking: chunkingDocs,
          embedding: embeddingDocs,
          failed: failedDocs,
          duplicate: duplicateDocs,
          indexedPercent,
        },
        chunks: {
          total: totalChunks,
          embedded: embeddedChunks,
          pending: pendingChunks,
          failed: failedChunks,
          embeddedPercent: embeddedChunkPercent,
        },
        embeddings: {
          total: totalEmbeddings,
          completed: completedEmbeddings,
          pending: pendingEmbeddings,
          failed: failedEmbeddings,
        },
        collections: collectionsCount,
      })
    );
  } catch (error) {
    console.error('Index status error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedDocument(documentId: string, userId: string) {
  const doc = await db.knowledgeDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

// GET /api/v1/documents/[id]/chunks — List document chunks with embedding status
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

    const { searchParams } = new URL(request.url);
    const embeddingStatus = searchParams.get('embeddingStatus');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));

    const where: Record<string, unknown> = { documentId: id };
    if (embeddingStatus) where.embeddingStatus = embeddingStatus;

    const chunks = await db.documentChunk.findMany({
      where,
      orderBy: { chunkIndex: 'asc' },
      take: limit,
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
        metadata: true,
        createdAt: true,
      },
    });

    // Aggregate embedding status counts
    const statusCounts = chunks.reduce(
      (acc, chunk) => {
        acc[chunk.embeddingStatus] = (acc[chunk.embeddingStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json(
      successResponse({
        documentId: id,
        totalChunks: chunks.length,
        statusCounts,
        chunks,
      })
    );
  } catch (error) {
    console.error('List document chunks error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

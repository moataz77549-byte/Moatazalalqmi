import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { errorResponse, successResponse } from '@/lib/api';

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

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// POST /api/v1/embeddings/search — Semantic search across document chunk embeddings
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      organizationId,
      collectionId,
      projectId,
      limit,
      minRelevance,
    } = body || {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(errorResponse('query is required'), { status: 400 });
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        successResponse({ results: [], total: 0 }, 'No organization membership')
      );
    }

    const maxResults = Math.min(100, Math.max(1, typeof limit === 'number' ? limit : 10));
    const threshold = typeof minRelevance === 'number' ? minRelevance : 0.3;

    // Generate query embedding
    let queryEmbedding: number[] | null = null;
    try {
      const embResponse = await aiGateway.embeddings(
        { model: 'text-embedding-3-small', input: query },
        { userId: user.id, organizationId: orgId }
      );
      if (embResponse.embeddings.length > 0) {
        queryEmbedding = embResponse.embeddings[0];
      }
    } catch (err) {
      console.error('Query embedding generation failed:', err);
      return NextResponse.json(
        errorResponse('Failed to generate query embedding'),
        { status: 502 }
      );
    }

    if (!queryEmbedding) {
      return NextResponse.json(
        errorResponse('Empty query embedding returned'),
        { status: 502 }
      );
    }

    // Build where clause for chunks
    const chunkWhere: Record<string, unknown> = {
      embeddingStatus: 'COMPLETED',
      document: {
        organizationId: orgId,
        userId: user.id,
        status: 'INDEXED',
      },
    };
    if (collectionId) {
      (chunkWhere.document as Record<string, unknown>).collectionId = collectionId;
    }
    if (projectId) {
      (chunkWhere.document as Record<string, unknown>).projectId = projectId;
    }

    // Load candidate chunks (limit for performance)
    const chunks = await db.documentChunk.findMany({
      where: chunkWhere,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            documentType: true,
            collectionId: true,
            projectId: true,
            summary: true,
          },
        },
      },
      take: 500,
    });

    const scored: Array<{
      chunkId: string;
      documentId: string;
      documentTitle: string;
      chunkIndex: number;
      content: string;
      score: number;
      startPosition: number;
      endPosition: number;
      document: {
        id: string;
        title: string;
        documentType: string;
        summary: string | null;
      };
    }> = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;
      try {
        const chunkEmb = JSON.parse(chunk.embedding) as number[];
        const similarity = cosineSimilarity(queryEmbedding, chunkEmb);
        if (similarity >= threshold) {
          scored.push({
            chunkId: chunk.id,
            documentId: chunk.documentId,
            documentTitle: chunk.document.title,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            score: similarity,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            document: {
              id: chunk.document.id,
              title: chunk.document.title,
              documentType: chunk.document.documentType,
              summary: chunk.document.summary,
            },
          });
        }
      } catch {
        // ignore parse errors
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, maxResults);

    return NextResponse.json(
      successResponse(
        {
          results: top,
          total: top.length,
          candidateCount: chunks.length,
          query,
          minRelevance: threshold,
        },
        'Semantic search completed'
      )
    );
  } catch (error) {
    console.error('Embeddings search error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

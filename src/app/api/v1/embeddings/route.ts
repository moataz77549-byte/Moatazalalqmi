import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';
import { EmbeddingStatus } from '@prisma/client';

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

// GET /api/v1/embeddings — List embeddings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const organizationId = searchParams.get('organizationId');
    const documentId = searchParams.get('documentId');
    const status = searchParams.get('status');
    const model = searchParams.get('model');
    const includeVector = searchParams.get('includeVector') === 'true';

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(paginatedResponse([], page, limit, 0));
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      userId: user.id,
    };
    if (documentId) where.documentId = documentId;
    if (status) {
      const statuses = status.split(',').filter(Boolean) as EmbeddingStatus[];
      if (statuses.length) where.status = { in: statuses };
    }
    if (model) where.embeddingModel = model;

    const [embeddings, total] = await Promise.all([
      db.embedding.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          documentId: true,
          chunkId: true,
          memoryId: true,
          embeddingModel: true,
          dimensions: true,
          textPreview: true,
          status: true,
          qdrantId: true,
          qdrantCollection: true,
          createdAt: true,
          ...(includeVector ? { embedding: true } : {}),
        },
      }),
      db.embedding.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(embeddings, page, limit, total));
  } catch (error) {
    console.error('List embeddings error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/embeddings — Generate embeddings for text
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { text, model, organizationId, dimensions, persist, documentId, chunkId } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(errorResponse('text is required'), { status: 400 });
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    const response = await aiGateway.embeddings(
      {
        model: model || 'text-embedding-3-small',
        input: text,
        dimensions,
      },
      { userId: user.id, organizationId: orgId }
    );

    if (!response.embeddings || response.embeddings.length === 0) {
      return NextResponse.json(
        errorResponse('No embeddings returned by provider'),
        { status: 502 }
      );
    }

    const vector = response.embeddings[0];

    // Optionally persist the embedding record
    let embeddingRecord: Awaited<ReturnType<typeof db.embedding.create>> | null = null;
    if (persist) {
      embeddingRecord = await db.embedding.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          documentId: documentId || null,
          chunkId: chunkId || null,
          embedding: JSON.stringify(vector),
          embeddingModel: 'OPENAI_SMALL',
          dimensions: vector.length,
          textPreview: text.substring(0, 200),
          status: EmbeddingStatus.COMPLETED,
        },
      });

      await createAuditLog({
        userId: user.id,
        organizationId: orgId,
        action: 'CREATE',
        resource: 'embedding',
        resourceId: embeddingRecord.id,
        details: {
          model: model || 'text-embedding-3-small',
          dimensions: vector.length,
          documentId: documentId || null,
          chunkId: chunkId || null,
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    }

    return NextResponse.json(
      successResponse(
        {
          vector,
          dimensions: vector.length,
          model: model || 'text-embedding-3-small',
          provider: response.provider,
          usage: response.usage,
          record: embeddingRecord,
        },
        'Embeddings generated successfully'
      )
    );
  } catch (error) {
    console.error('Generate embeddings error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

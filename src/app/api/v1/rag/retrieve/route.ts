import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { ragEngine } from '@/lib/knowledge/rag-engine';
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

// POST /api/v1/rag/retrieve — Retrieve context using ragEngine
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
      projectId,
      collectionId,
      maxChunks,
      maxMemories,
      minRelevance,
    } = body || {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(errorResponse('query is required'), { status: 400 });
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

    const result = await ragEngine.retrieve({
      query,
      userId: user.id,
      organizationId: orgId,
      projectId: projectId || undefined,
      collectionId: collectionId || undefined,
      maxChunks: typeof maxChunks === 'number' ? maxChunks : undefined,
      maxMemories: typeof maxMemories === 'number' ? maxMemories : undefined,
      minRelevance: typeof minRelevance === 'number' ? minRelevance : undefined,
    });

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'READ',
      resource: 'rag',
      details: {
        action: 'retrieve',
        query: query.substring(0, 200),
        sourcesCount: result.sources.length,
        projectId: projectId || null,
        collectionId: collectionId || null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          context: result.context,
          sources: result.sources,
          summary: result.summary,
          sourceCount: result.sources.length,
        },
        'RAG retrieval completed'
      )
    );
  } catch (error) {
    console.error('RAG retrieve error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

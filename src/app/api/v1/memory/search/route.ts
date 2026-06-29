import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { memoryEngine } from '@/lib/memory/memory-engine';
import { errorResponse, successResponse } from '@/lib/api';
import { MemoryScope, MemoryType } from '@prisma/client';

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

// POST /api/v1/memory/search — Semantic + keyword search across memories
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
      scope,
      types,
      minConfidence,
      minImportance,
      limit,
      includeExpired,
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

    const results = await memoryEngine.search({
      query,
      organizationId: orgId,
      userId: user.id,
      projectId: projectId || undefined,
      scope: scope
        ? Array.isArray(scope)
          ? (scope as MemoryScope[])
          : (scope as MemoryScope)
        : undefined,
      types: Array.isArray(types) ? (types as MemoryType[]) : undefined,
      minConfidence: typeof minConfidence === 'number' ? minConfidence : undefined,
      minImportance: typeof minImportance === 'number' ? minImportance : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
      includeExpired: Boolean(includeExpired),
    });

    return NextResponse.json(
      successResponse(
        {
          results: results.map((r) => ({
            id: r.memory.id,
            content: r.memory.content,
            type: r.memory.type,
            scope: r.memory.scope,
            importance: r.memory.importance,
            confidence: r.memory.confidence,
            tags: r.memory.tags ? JSON.parse(r.memory.tags) : null,
            createdAt: r.memory.createdAt,
            score: r.score,
            reason: r.reason,
          })),
          total: results.length,
          query,
        },
        'Memory search completed'
      )
    );
  } catch (error) {
    console.error('Memory search error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

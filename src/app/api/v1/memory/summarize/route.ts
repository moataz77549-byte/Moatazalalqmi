import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { memoryEngine } from '@/lib/memory/memory-engine';
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

// POST /api/v1/memory/summarize — Summarize multiple memories into a compressed string
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { memoryIds, organizationId } = body || {};

    if (!Array.isArray(memoryIds) || memoryIds.length === 0) {
      return NextResponse.json(
        errorResponse('memoryIds (non-empty array) is required'),
        { status: 400 }
      );
    }

    const orgId = await resolveOrgMembership(user.id, organizationId);
    if (!orgId) {
      return NextResponse.json(
        errorResponse('User has no organization membership'),
        { status: 403 }
      );
    }

    // Verify ownership of all memories
    const owned = await db.memory.findMany({
      where: {
        id: { in: memoryIds },
        userId: user.id,
        organizationId: orgId,
      },
      select: { id: true, content: true, importance: true, type: true },
    });

    if (owned.length === 0) {
      return NextResponse.json(
        errorResponse('No accessible memories found for the given IDs'),
        { status: 404 }
      );
    }

    const accessibleIds = owned.map((m) => m.id);
    const summary = await memoryEngine.summarize(accessibleIds, user.id, orgId);

    await createAuditLog({
      userId: user.id,
      organizationId: orgId,
      action: 'READ',
      resource: 'memory',
      details: {
        action: 'summarize',
        memoryIds: accessibleIds,
        count: accessibleIds.length,
        summaryLength: summary.length,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          summary,
          memoryCount: accessibleIds.length,
          requestedCount: memoryIds.length,
        },
        'Memory summarization completed'
      )
    );
  } catch (error) {
    console.error('Summarize memories error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

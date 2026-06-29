import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { globalSearchEngine } from '@/lib/knowledge/search-engine';
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

async function runSearch(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  const query =
    (typeof (body || {}).query === 'string' && body.query) ||
    searchParams.get('query') ||
    searchParams.get('q') ||
    '';
  const organizationId =
    (body && body.organizationId) || searchParams.get('organizationId') || undefined;
  const projectId =
    (body && body.projectId) || searchParams.get('projectId') || undefined;
  const limitParam =
    (body && typeof body.limit === 'number'
      ? body.limit
      : parseInt(searchParams.get('limit') || '20', 10)) || 20;
  const includeAI =
    (body && typeof body.includeAI === 'boolean'
      ? body.includeAI
      : searchParams.get('includeAI') === 'true') || false;

  const trimmed = query.trim();
  if (!trimmed) {
    return NextResponse.json(
      errorResponse('query (or q) is required'),
      { status: 400 }
    );
  }

  const orgId = await resolveOrgMembership(user.id, organizationId);
  if (!orgId) {
    return NextResponse.json(
      successResponse(
        {
          results: [],
          total: 0,
          aiSummary: undefined,
          keywords: undefined,
          classification: undefined,
        },
        'No organization membership'
      )
    );
  }

  const limit = Math.min(100, Math.max(1, limitParam));

  const result = await globalSearchEngine.search({
    query: trimmed,
    userId: user.id,
    organizationId: orgId,
    projectId: projectId || undefined,
    limit,
    includeAI,
  });

  await createAuditLog({
    userId: user.id,
    organizationId: orgId,
    action: 'READ',
    resource: 'search',
    details: {
      action: 'global-smart-search',
      query: trimmed.substring(0, 200),
      resultCount: result.total,
      includeAI,
      projectId: projectId || null,
    },
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(
    successResponse(result, 'Smart search completed')
  );
}

// GET /api/v1/smart-search — Global intelligent search
export async function GET(request: NextRequest) {
  try {
    return await runSearch(request);
  } catch (error) {
    console.error('Smart search (GET) error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/smart-search — Global intelligent search
export async function POST(request: NextRequest) {
  try {
    return await runSearch(request);
  } catch (error) {
    console.error('Smart search (POST) error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

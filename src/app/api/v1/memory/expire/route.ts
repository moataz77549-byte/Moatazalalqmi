import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { memoryEngine } from '@/lib/memory/memory-engine';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

// POST /api/v1/memory/expire — Run expiration sweep across all memories
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const expiredCount = await memoryEngine.expireMemories();

    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      resource: 'memory',
      details: {
        action: 'expire-sweep',
        expiredCount,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        { expiredCount, sweptAt: new Date().toISOString() },
        `Expired ${expiredCount} memories`
      )
    );
  } catch (error) {
    console.error('Expire memories error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

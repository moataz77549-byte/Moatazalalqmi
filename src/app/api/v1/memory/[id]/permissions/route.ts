import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { memoryEngine } from '@/lib/memory/memory-engine';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedMemory(memoryId: string, userId: string) {
  const memory = await db.memory.findUnique({ where: { id: memoryId } });
  if (!memory || memory.userId !== userId) return null;
  return memory;
}

// GET /api/v1/memory/[id]/permissions — List permissions for a memory
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
    const memory = await getOwnedMemory(id, user.id);
    if (!memory) {
      return NextResponse.json(errorResponse('Memory not found'), { status: 404 });
    }

    const permissions = await db.memoryPermission.findMany({
      where: { memoryId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse({ permissions }));
  } catch (error) {
    console.error('List memory permissions error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/memory/[id]/permissions — Set permission for a user
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
    const memory = await getOwnedMemory(id, user.id);
    if (!memory) {
      return NextResponse.json(errorResponse('Memory not found'), { status: 404 });
    }

    const body = await request.json();
    const { userId: targetUserId, access } = body || {};

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(errorResponse('userId is required'), { status: 400 });
    }

    const validAccess = ['read', 'write', 'admin'];
    if (!access || !validAccess.includes(access)) {
      return NextResponse.json(
        errorResponse('access must be one of: read, write, admin'),
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json(errorResponse('Target user not found'), { status: 404 });
    }

    const permission = await memoryEngine.setPermission(
      id,
      targetUserId,
      access as 'read' | 'write' | 'admin'
    );

    await createAuditLog({
      userId: user.id,
      organizationId: memory.organizationId,
      action: 'PERMISSION_CHANGE',
      resource: 'memory',
      resourceId: id,
      details: { targetUserId, access },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(permission, 'Memory permission updated successfully')
    );
  } catch (error) {
    console.error('Set memory permission error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

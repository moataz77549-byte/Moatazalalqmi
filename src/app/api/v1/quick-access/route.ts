import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

const VALID_ITEM_TYPES = ['chat', 'project', 'file', 'note', 'artifact', 'task'];

// GET /api/v1/quick-access — List user's quick access items
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const items = await db.quickAccess.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(successResponse(items));
  } catch (error) {
    console.error('List quick access error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/quick-access — Add quick access item
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { itemType, itemId, label, icon, sortOrder } = body;

    if (!itemType || !VALID_ITEM_TYPES.includes(itemType)) {
      return NextResponse.json(
        errorResponse(`itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}`),
        { status: 400 }
      );
    }
    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json(errorResponse('itemId is required'), { status: 400 });
    }
    if (!label || typeof label !== 'string') {
      return NextResponse.json(errorResponse('label is required'), { status: 400 });
    }

    // Use upsert to handle the unique constraint on (userId, itemType, itemId)
    const item = await db.quickAccess.upsert({
      where: {
        userId_itemType_itemId: {
          userId: user.id,
          itemType,
          itemId,
        },
      },
      create: {
        userId: user.id,
        itemType,
        itemId,
        label,
        icon: icon || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
      update: {
        label,
        icon: icon || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      resource: 'quick_access',
      resourceId: item.id,
      details: { itemType, itemId, label },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(item, 'Quick access item added'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Add quick access error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/quick-access — Remove quick access item (by id or itemType+itemId)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const itemType = searchParams.get('itemType');
    const itemId = searchParams.get('itemId');

    if (!id && !(itemType && itemId)) {
      return NextResponse.json(
        errorResponse('Either "id" or both "itemType" and "itemId" query params are required'),
        { status: 400 }
      );
    }

    let where: Record<string, unknown>;
    if (id) {
      where = { id, userId: user.id };
    } else {
      where = { userId: user.id, itemType, itemId };
    }

    const deleted = await db.quickAccess.deleteMany({ where });

    if (deleted.count === 0) {
      return NextResponse.json(errorResponse('Quick access item not found'), { status: 404 });
    }

    await createAuditLog({
      userId: user.id,
      action: 'DELETE',
      resource: 'quick_access',
      details: { id, itemType, itemId, count: deleted.count },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ deleted: deleted.count }, 'Quick access item removed')
    );
  } catch (error) {
    console.error('Remove quick access error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

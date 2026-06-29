import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedTag(tagId: string, userId: string) {
  const tag = await db.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== userId) return null;
  return tag;
}

// PATCH /api/v1/tags/[id] — Update tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const tag = await getOwnedTag(id, user.id);
    if (!tag) {
      return NextResponse.json(errorResponse('Tag not found'), { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (typeof color === 'string') data.color = color;

    // If renaming, ensure uniqueness
    if (typeof name === 'string' && name !== tag.name) {
      const conflict = await db.tag.findUnique({
        where: {
          organizationId_name_userId: {
            organizationId: tag.organizationId,
            name,
            userId: user.id,
          },
        },
      });
      if (conflict) {
        return NextResponse.json(
          errorResponse('Tag with this name already exists'),
          { status: 409 }
        );
      }
    }

    const updated = await db.tag.update({ where: { id }, data });

    await createAuditLog({
      userId: user.id,
      organizationId: tag.organizationId,
      action: 'UPDATE',
      resource: 'tag',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Tag updated successfully'));
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/tags/[id] — Delete tag (ChatTag associations cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const tag = await getOwnedTag(id, user.id);
    if (!tag) {
      return NextResponse.json(errorResponse('Tag not found'), { status: 404 });
    }

    // ChatTag associations cascade automatically due to onDelete: Cascade
    await db.tag.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: tag.organizationId,
      action: 'DELETE',
      resource: 'tag',
      resourceId: id,
      details: { name: tag.name },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'Tag deleted successfully'));
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

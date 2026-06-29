import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';
import { CollectionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function getOwnedCollection(collectionId: string, userId: string) {
  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== userId) return null;
  return collection;
}

// GET /api/v1/collections/[id] — Get collection with documents
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
    const collection = await getOwnedCollection(id, user.id);
    if (!collection) {
      return NextResponse.json(errorResponse('Collection not found'), { status: 404 });
    }

    const full = await db.collection.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            collectionType: true,
            icon: true,
            color: true,
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            summary: true,
            documentType: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { documents: true, children: true },
        },
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get collection error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/collections/[id] — Update collection
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
    const collection = await getOwnedCollection(id, user.id);
    if (!collection) {
      return NextResponse.json(errorResponse('Collection not found'), { status: 404 });
    }

    const body = await request.json();
    const { name, description, type, collectionType, parentId, projectId, icon, color, sortOrder, isShared, isPublic } = body || {};

    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (type !== undefined) data.collectionType = type as CollectionType;
    if (collectionType !== undefined) data.collectionType = collectionType as CollectionType;
    if (parentId !== undefined) {
      if (parentId && parentId !== id) {
        const parent = await db.collection.findFirst({
          where: { id: parentId, organizationId: collection.organizationId, userId: user.id },
          select: { id: true },
        });
        if (!parent) {
          return NextResponse.json(errorResponse('Parent collection not found'), { status: 404 });
        }
        data.parentId = parentId;
      } else {
        data.parentId = null;
      }
    }
    if (projectId !== undefined) data.projectId = projectId || null;
    if (icon !== undefined) data.icon = icon || null;
    if (color !== undefined) data.color = color || null;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
    if (typeof isShared === 'boolean') data.isShared = isShared;
    if (typeof isPublic === 'boolean') data.isPublic = isPublic;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(successResponse(collection, 'No changes'));
    }

    const updated = await db.collection.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: collection.organizationId,
      action: 'UPDATE',
      resource: 'collection',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Collection updated successfully'));
  } catch (error) {
    console.error('Update collection error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/collections/[id] — Delete collection (cascade handled by Prisma)
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
    const collection = await getOwnedCollection(id, user.id);
    if (!collection) {
      return NextResponse.json(errorResponse('Collection not found'), { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get('cascade') !== 'false'; // default true

    if (!cascade) {
      // Move children to parent (or root)
      await db.collection.updateMany({
        where: { parentId: id, userId: user.id },
        data: { parentId: collection.parentId || null },
      });
      // Detach documents
      await db.knowledgeDocument.updateMany({
        where: { collectionId: id, userId: user.id },
        data: { collectionId: null },
      });
    }

    await db.collection.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: collection.organizationId,
      action: 'DELETE',
      resource: 'collection',
      resourceId: id,
      details: { name: collection.name, cascade },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ id, deleted: true, cascade }, 'Collection deleted successfully')
    );
  } catch (error) {
    console.error('Delete collection error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

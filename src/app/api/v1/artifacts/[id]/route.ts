import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedArtifact(artifactId: string, userId: string) {
  const artifact = await db.artifact.findUnique({ where: { id: artifactId } });
  if (!artifact || artifact.userId !== userId) return null;
  return artifact;
}

// GET /api/v1/artifacts/[id] — Get artifact
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
    const artifact = await getOwnedArtifact(id, user.id);
    if (!artifact) {
      return NextResponse.json(errorResponse('Artifact not found'), { status: 404 });
    }

    const full = await db.artifact.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        chat: { select: { id: true, title: true } },
        message: { select: { id: true, role: true } },
      },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get artifact error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/artifacts/[id] — Update artifact (creates new version)
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
    const artifact = await getOwnedArtifact(id, user.id);
    if (!artifact) {
      return NextResponse.json(errorResponse('Artifact not found'), { status: 404 });
    }

    const body = await request.json();
    const { title, content, language, isPublic, metadata } = body;

    const data: Record<string, unknown> = {};
    if (typeof title === 'string') data.title = title;
    if (typeof content === 'string') data.content = content;
    if (language !== undefined) data.language = language || null;
    if (typeof isPublic === 'boolean') data.isPublic = isPublic;
    if (metadata !== undefined) data.metadata = metadata ? JSON.stringify(metadata) : null;

    // Bump version if content changed
    if (typeof content === 'string' && content !== artifact.content) {
      data.version = artifact.version + 1;
    }

    const updated = await db.artifact.update({ where: { id }, data });

    await createAuditLog({
      userId: user.id,
      organizationId: artifact.organizationId,
      action: 'UPDATE',
      resource: 'artifact',
      resourceId: id,
      details: { fields: Object.keys(data), version: data.version ?? artifact.version },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Artifact updated successfully'));
  } catch (error) {
    console.error('Update artifact error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/artifacts/[id] — Delete artifact
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
    const artifact = await getOwnedArtifact(id, user.id);
    if (!artifact) {
      return NextResponse.json(errorResponse('Artifact not found'), { status: 404 });
    }

    await db.artifact.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: artifact.organizationId,
      action: 'DELETE',
      resource: 'artifact',
      resourceId: id,
      details: { title: artifact.title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse({ id }, 'Artifact deleted successfully')
    );
  } catch (error) {
    console.error('Delete artifact error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

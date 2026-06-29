import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedNote(noteId: string, userId: string) {
  const note = await db.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) return null;
  return note;
}

// GET /api/v1/notes/[id] — Get note
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
    const note = await getOwnedNote(id, user.id);
    if (!note) {
      return NextResponse.json(errorResponse('Note not found'), { status: 404 });
    }

    const full = await db.note.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json(successResponse(full));
  } catch (error) {
    console.error('Get note error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/notes/[id] — Update note
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
    const note = await getOwnedNote(id, user.id);
    if (!note) {
      return NextResponse.json(errorResponse('Note not found'), { status: 404 });
    }

    const body = await request.json();
    const { title, content, isPinned, tags, projectId } = body;

    const data: Record<string, unknown> = {};
    if (typeof title === 'string') data.title = title;
    if (typeof content === 'string') data.content = content;
    if (typeof isPinned === 'boolean') data.isPinned = isPinned;
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
    }
    if (projectId !== undefined) data.projectId = projectId || null;

    const updated = await db.note.update({
      where: { id },
      data,
      include: { project: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: note.organizationId,
      action: 'UPDATE',
      resource: 'note',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Note updated successfully'));
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/notes/[id] — Delete note
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
    const note = await getOwnedNote(id, user.id);
    if (!note) {
      return NextResponse.json(errorResponse('Note not found'), { status: 404 });
    }

    await db.note.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: note.organizationId,
      action: 'DELETE',
      resource: 'note',
      resourceId: id,
      details: { title: note.title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'Note deleted successfully'));
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

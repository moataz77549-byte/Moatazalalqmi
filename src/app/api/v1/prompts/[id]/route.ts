import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getOwnedPrompt(promptId: string, userId: string) {
  const prompt = await db.promptLibrary.findUnique({ where: { id: promptId } });
  if (!prompt || prompt.userId !== userId) return null;
  return prompt;
}

// GET /api/v1/prompts/[id] — Get prompt
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
    const prompt = await getOwnedPrompt(id, user.id);
    if (!prompt) {
      return NextResponse.json(errorResponse('Prompt not found'), { status: 404 });
    }

    return NextResponse.json(successResponse(prompt));
  } catch (error) {
    console.error('Get prompt error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PATCH /api/v1/prompts/[id] — Update prompt
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
    const prompt = await getOwnedPrompt(id, user.id);
    if (!prompt) {
      return NextResponse.json(errorResponse('Prompt not found'), { status: 404 });
    }

    const body = await request.json();
    const { title, description, content, category, tags, isPublic, isFavorite } = body;

    const data: Record<string, unknown> = {};
    if (typeof title === 'string') data.title = title;
    if (description !== undefined) data.description = description || null;
    if (typeof content === 'string') data.content = content;
    if (typeof category === 'string') data.category = category;
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
    }
    if (typeof isPublic === 'boolean') data.isPublic = isPublic;
    if (typeof isFavorite === 'boolean') data.isFavorite = isFavorite;

    const updated = await db.promptLibrary.update({ where: { id }, data });

    await createAuditLog({
      userId: user.id,
      organizationId: prompt.organizationId || undefined,
      action: 'UPDATE',
      resource: 'prompt',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse(updated, 'Prompt updated successfully'));
  } catch (error) {
    console.error('Update prompt error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// DELETE /api/v1/prompts/[id] — Delete prompt
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
    const prompt = await getOwnedPrompt(id, user.id);
    if (!prompt) {
      return NextResponse.json(errorResponse('Prompt not found'), { status: 404 });
    }

    await db.promptLibrary.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      organizationId: prompt.organizationId || undefined,
      action: 'DELETE',
      resource: 'prompt',
      resourceId: id,
      details: { title: prompt.title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(successResponse({ id }, 'Prompt deleted successfully'));
  } catch (error) {
    console.error('Delete prompt error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

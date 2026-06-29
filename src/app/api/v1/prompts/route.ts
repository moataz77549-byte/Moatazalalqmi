import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import {
  parsePaginationParams,
  paginatedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/v1/prompts — List user's prompt library
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const category = searchParams.get('category');
    const isFavorite = searchParams.get('isFavorite');
    const isPublic = searchParams.get('isPublic');
    const search = searchParams.get('search') || searchParams.get('q');

    const where: Record<string, unknown> = { userId: user.id };
    if (category) where.category = category;
    if (isFavorite === 'true') where.isFavorite = true;
    if (isFavorite === 'false') where.isFavorite = false;
    if (isPublic === 'true') where.isPublic = true;
    if (isPublic === 'false') where.isPublic = false;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [prompts, total] = await Promise.all([
      db.promptLibrary.findMany({
        where,
        skip,
        take,
        orderBy: [{ isFavorite: 'desc' }, { [sortBy]: sortOrder }],
      }),
      db.promptLibrary.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(prompts, page, limit, total));
  } catch (error) {
    console.error('List prompts error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// POST /api/v1/prompts — Create prompt
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { title, description, content, category, tags, organizationId, isPublic, isFavorite } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(errorResponse('title is required'), { status: 400 });
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json(errorResponse('content is required'), { status: 400 });
    }

    const prompt = await db.promptLibrary.create({
      data: {
        title,
        description: description || null,
        content,
        category: category || 'general',
        tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
        organizationId: organizationId || null,
        userId: user.id,
        isPublic: Boolean(isPublic),
        isFavorite: Boolean(isFavorite),
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: organizationId || undefined,
      action: 'CREATE',
      resource: 'prompt',
      resourceId: prompt.id,
      details: { title, category },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(prompt, 'Prompt created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create prompt error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

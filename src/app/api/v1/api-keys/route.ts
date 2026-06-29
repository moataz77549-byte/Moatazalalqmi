import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, requireAuth } from '@/lib/middleware';
import { createApiKeySchema } from '@/lib/validators';
import { createAuditLog } from '@/lib/audit';
import { parsePaginationParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function generateApiKey(): string {
  return `mz_${crypto.randomBytes(32).toString('hex')}`;
}

// GET /api/v1/api-keys — List user's API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip, take, sortBy, sortOrder } = parsePaginationParams(searchParams);

    const [apiKeys, total] = await Promise.all([
      db.apiKey.findMany({
        where: { userId: user.id, isRevoked: false },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          lastUsedAt: true,
          expiresAt: true,
          isRevoked: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      db.apiKey.count({ where: { userId: user.id, isRevoked: false } }),
    ]);

    return NextResponse.json(
      paginatedResponse(apiKeys, page, limit, total),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('List API keys error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

// POST /api/v1/api-keys — Create API key
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireAuth(user);

    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { name, organizationId, permissions, expiresAt } = validation.data;

    // If organizationId provided, verify user is a member
    if (organizationId) {
      const membership = await db.membership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId } },
      });

      if (!membership && !user.isSuperAdmin) {
        return NextResponse.json(
          errorResponse('Forbidden: You are not a member of this organization'),
          { status: 403 }
        );
      }
    }

    // Generate raw key
    const rawKey = generateApiKey();
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = await bcrypt.hash(rawKey, 10);

    // Store hashed key
    const apiKey = await db.apiKey.create({
      data: {
        userId: user.id,
        organizationId: organizationId || null,
        name,
        keyHash,
        keyPrefix,
        permissions: permissions ? JSON.stringify(permissions) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      organizationId: organizationId || undefined,
      action: 'API_KEY_CREATED',
      resource: 'api-key',
      resourceId: apiKey.id,
      details: { name, keyPrefix },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Return the raw key ONCE — it will never be shown again
    return NextResponse.json(
      successResponse({
        ...apiKey,
        key: rawKey, // Only returned on creation
      }, 'API key created. Save the key — it will not be shown again.'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: 401 }
      );
    }
    console.error('Create API key error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

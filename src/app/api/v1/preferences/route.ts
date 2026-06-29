import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['workspace', 'chat', 'models', 'notifications', 'privacy'];

// GET /api/v1/preferences — Get user preferences (optionally filter by category)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = { userId: user.id };
    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          errorResponse(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
          { status: 400 }
        );
      }
      where.category = category;
    }

    const preferences = await db.userPreference.findMany({ where });

    // Parse settings JSON for convenience
    const parsed = preferences.map((p) => ({
      ...p,
      settings: (() => {
        try {
          return JSON.parse(p.settings);
        } catch {
          return {};
        }
      })(),
    }));

    return NextResponse.json(successResponse(parsed));
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// PUT /api/v1/preferences — Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const body = await request.json();
    const { category, settings } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        errorResponse(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
        { status: 400 }
      );
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json(
        errorResponse('settings must be a JSON object'),
        { status: 400 }
      );
    }

    const settingsStr = JSON.stringify(settings);

    const preference = await db.userPreference.upsert({
      where: {
        userId_category: { userId: user.id, category },
      },
      create: {
        userId: user.id,
        category,
        settings: settingsStr,
      },
      update: {
        settings: settingsStr,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'SETTINGS_CHANGE',
      resource: 'user_preference',
      resourceId: preference.id,
      details: { category, keys: Object.keys(settings) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const parsed = {
      ...preference,
      settings: (() => {
        try {
          return JSON.parse(preference.settings);
        } catch {
          return {};
        }
      })(),
    };

    return NextResponse.json(successResponse(parsed, 'Preferences updated successfully'));
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

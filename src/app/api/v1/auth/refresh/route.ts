import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, revokeSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        errorResponse('Refresh token is required'),
        { status: 400 }
      );
    }

    // Find session by refresh token
    const existingSession = await db.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!existingSession) {
      return NextResponse.json(
        errorResponse('Invalid refresh token'),
        { status: 401 }
      );
    }

    // Validate not expired
    if (existingSession.expiresAt < new Date()) {
      return NextResponse.json(
        errorResponse('Refresh token expired'),
        { status: 401 }
      );
    }

    // Validate not revoked
    if (existingSession.isRevoked) {
      return NextResponse.json(
        errorResponse('Refresh token has been revoked'),
        { status: 401 }
      );
    }

    // Check user is still active
    if (!existingSession.user.isActive) {
      return NextResponse.json(
        errorResponse('Account is deactivated'),
        { status: 403 }
      );
    }

    // Create new session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const newSession = await createSession(existingSession.userId, userAgent, ipAddress);

    // Revoke old session
    await revokeSession(existingSession.token);

    // Create audit log
    await createAuditLog({
      userId: existingSession.userId,
      action: 'CREATE',
      resource: 'session',
      resourceId: newSession.id,
      details: { previousSessionId: existingSession.id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      successResponse({
        token: newSession.token,
        refreshToken: newSession.refreshToken,
      }, 'Token refreshed successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

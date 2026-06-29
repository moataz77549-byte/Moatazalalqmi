import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, validateSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('Missing or invalid authorization header'),
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const session = await validateSession(token);

    if (!session) {
      return NextResponse.json(
        errorResponse('Invalid or expired session'),
        { status: 401 }
      );
    }

    // Revoke the session
    await revokeSession(token);

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'LOGOUT',
      resource: 'session',
      resourceId: session.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(null, 'Logged out successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

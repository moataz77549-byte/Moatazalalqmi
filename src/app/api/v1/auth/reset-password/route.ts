import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        errorResponse('Token and new password are required'),
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        errorResponse('Password must be at least 8 characters'),
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        errorResponse('Invalid reset token'),
        { status: 404 }
      );
    }

    // Check if already used
    if (resetToken.usedAt) {
      return NextResponse.json(
        errorResponse('Reset token has already been used'),
        { status: 400 }
      );
    }

    // Check if expired
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        errorResponse('Reset token has expired'),
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Mark token as used
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Revoke all active sessions for security
    await db.session.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET',
      resource: 'user',
      resourceId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(null, 'Password reset successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

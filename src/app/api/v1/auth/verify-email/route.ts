import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        errorResponse('Verification token is required'),
        { status: 400 }
      );
    }

    // Find the token
    const verificationToken = await db.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        errorResponse('Invalid verification token'),
        { status: 404 }
      );
    }

    // Check if already used
    if (verificationToken.usedAt) {
      return NextResponse.json(
        errorResponse('Token has already been used'),
        { status: 400 }
      );
    }

    // Check if expired
    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.json(
        errorResponse('Verification token has expired'),
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        errorResponse('Email is already verified'),
        { status: 400 }
      );
    }

    // Mark user email as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Mark token as used
    await db.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(null, 'Email verified successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

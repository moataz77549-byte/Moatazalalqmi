import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP — 5 attempts per 15 minutes
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = rateLimit(`forgot-password:${clientIp}`, 5, 15 * 60 * 1000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        errorResponse('Too many requests. Please try again later.'),
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        errorResponse('Email is required'),
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    // Only create token if user exists
    if (email && typeof email === 'string') {
      try {
        const resetToken = await createPasswordResetToken(email);
        // In a production app, you would send the token via email here
        // For now, we'll include it in the response for development purposes
        void resetToken;
      } catch {
        // Silently fail — don't reveal if email exists
      }
    }

    return NextResponse.json(
      successResponse(null, 'If an account with that email exists, a password reset link has been sent.'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

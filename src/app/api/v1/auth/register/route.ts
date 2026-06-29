import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { hashPassword, createSession, createEmailVerificationToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { name, email, password, locale } = validation.data;

    // Check email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        errorResponse('Email already registered'),
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: false,
        preferredLocale: locale,
      },
    });

    // Create email verification token
    const verificationToken = await createEmailVerificationToken(email);

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const session = await createSession(user.id, userAgent, ipAddress);

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      resource: 'user',
      resourceId: user.id,
      details: { email, name },
      ipAddress,
      userAgent,
    });

    // Return user without passwordHash + session token
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      successResponse({
        user: userWithoutPassword,
        token: session.token,
        refreshToken: session.refreshToken,
        verificationToken: verificationToken.token,
      }, 'Registration successful'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}

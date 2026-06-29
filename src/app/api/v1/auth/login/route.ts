import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validators';
import { verifyPassword, createSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP — 10 attempts per 15 minutes
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    // Safety check for rateLimit function to avoid Internal Server Error if it fails
    let rateLimitResult;
    try {
      rateLimitResult = rateLimit(`login:${clientIp}`, 10, 15 * 60 * 1000);
    } catch (e) {
      console.warn('Rate limit check failed, bypassing:', e);
      rateLimitResult = { allowed: true };
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        errorResponse('Too many login attempts. Please try again later.'),
        { status: 429 }
      );
    }

    // Safely parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(errorResponse('Invalid JSON body'), { status: 400 });
    }

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      // Audit log should be non-blocking
      createAuditLog({
        action: 'LOGIN_FAILED',
        resource: 'session',
        details: { email, reason: 'user_not_found' },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(console.error);

      return NextResponse.json(
        errorResponse('Invalid email or password'),
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'session',
        details: { email, reason: 'invalid_password' },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(console.error);

      return NextResponse.json(
        errorResponse('Invalid email or password'),
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        errorResponse('Account is deactivated'),
        { status: 403 }
      );
    }

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const session = await createSession(user.id, userAgent, clientIp);

    // Update lastLoginAt and lastLoginIp
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      },
    });

    // Create audit log
    createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'session',
      resourceId: session.id,
      ipAddress: clientIp,
      userAgent,
    }).catch(console.error);

    // Return user without passwordHash + session token
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      successResponse({
        user: userWithoutPassword,
        token: session.token,
        refreshToken: session.refreshToken,
      }, 'Login successful'),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Login error details:', error);
    // Return more helpful error message in production if it's a known database issue
    const message = error.message?.includes('Prisma') 
      ? 'Database connection error. Please check if your database is running.'
      : 'Internal server error';
      
    return NextResponse.json(
      errorResponse(message),
      { status: 500 }
    );
  }
}

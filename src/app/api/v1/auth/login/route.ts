import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validators';
import { verifyPassword, createSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { errorResponse, successResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Login:${requestId}] 🟢 Authentication request started`);

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log(`[Login:${requestId}] Client IP: ${clientIp}`);

    // 1. Rate Limiting
    let rateLimitResult;
    try {
      rateLimitResult = rateLimit(`login:${clientIp}`, 10, 15 * 60 * 1000);
    } catch (e) {
      console.warn(`[Login:${requestId}] ⚠️ Rate limit check failed:`, e);
      rateLimitResult = { allowed: true };
    }

    if (!rateLimitResult.allowed) {
      console.log(`[Login:${requestId}] ❌ Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        errorResponse('Too many login attempts. Please try again later.'),
        { status: 429 }
      );
    }

    // 2. Body Parsing
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.log(`[Login:${requestId}] ❌ Invalid JSON body`);
      return NextResponse.json(errorResponse('Invalid JSON body'), { status: 400 });
    }

    // 3. Validation
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      console.log(`[Login:${requestId}] ❌ Validation failed:`, validation.error.issues.map(i => i.message));
      return NextResponse.json(
        errorResponse(validation.error.issues.map((i) => i.message).join(', ')),
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    console.log(`[Login:${requestId}] Attempting login for email: ${email}`);

    // 4. User Lookup
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      console.log(`[Login:${requestId}] ❌ User not found or no password hash for: ${email}`);
      createAuditLog({
        action: 'LOGIN_FAILED',
        resource: 'session',
        details: { email, reason: 'user_not_found' },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(err => console.error(`[Login:${requestId}] Audit log error:`, err));

      return NextResponse.json(
        errorResponse('Invalid email or password'),
        { status: 401 }
      );
    }

    // 5. Password Verification
    console.log(`[Login:${requestId}] Verifying password for user: ${user.id}`);
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.log(`[Login:${requestId}] ❌ Invalid password for user: ${user.id}`);
      createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'session',
        details: { email, reason: 'invalid_password' },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(err => console.error(`[Login:${requestId}] Audit log error:`, err));

      return NextResponse.json(
        errorResponse('Invalid email or password'),
        { status: 401 }
      );
    }

    // 6. Account Status Check
    if (!user.isActive) {
      console.log(`[Login:${requestId}] ❌ Account deactivated for user: ${user.id}`);
      return NextResponse.json(
        errorResponse('Account is deactivated'),
        { status: 403 }
      );
    }

    // 7. Session Creation
    console.log(`[Login:${requestId}] Creating session for user: ${user.id}`);
    const userAgent = request.headers.get('user-agent') || undefined;
    const session = await createSession(user.id, userAgent, clientIp);

    // 8. Finalizing Login
    console.log(`[Login:${requestId}] Updating last login info for user: ${user.id}`);
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      },
    });

    createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'session',
      resourceId: session.id,
      ipAddress: clientIp,
      userAgent,
    }).catch(err => console.error(`[Login:${requestId}] Audit log error:`, err));

    console.log(`[Login:${requestId}] ✅ Login successful for user: ${user.id}`);
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
    console.error(`[Login:${requestId}] 💥 UNHANDLED EXCEPTION:`, error);
    
    // Safety fallback: Never return 500 if possible, or return a clean message
    const errorMessage = error.message?.includes('Prisma') 
      ? 'Database connectivity issue. Please try again in a moment.'
      : 'Authentication service temporarily unavailable.';
      
    return NextResponse.json(
      errorResponse(errorMessage),
      { status: 500 }
    );
  }
}

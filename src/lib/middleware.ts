/**
 * Moataz AI — Authentication & Authorization Middleware
 * Handles Bearer token validation (session + API key), RBAC context.
 */

import { validateSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashApiKey } from '@/lib/ai-gateway/key-vault';
import { getUserRoles, hasPermission, type Permission, type Resource } from '@/lib/rbac';
import { rateLimitByEndpoint } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  organizationId?: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);

  // API key authentication (format: mz_xxx)
  if (token.startsWith('mz_')) {
    const keyHash = hashApiKey(token);
    const apiKey = await db.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey || apiKey.isRevoked) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    const roles = await getUserRoles(apiKey.user.id, apiKey.organizationId || undefined);

    return {
      id: apiKey.user.id,
      email: apiKey.user.email,
      name: apiKey.user.name,
      isSuperAdmin: apiKey.user.isSuperAdmin,
      roles,
      organizationId: apiKey.organizationId || undefined,
    };
  }

  // Session token authentication
  const session = await validateSession(token);
  if (!session) return null;

  const roles = await getUserRoles(session.user.id);

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isSuperAdmin: session.user.isSuperAdmin,
    roles,
  };
}

export function requireAuth(user: AuthenticatedUser | null): AuthenticatedUser {
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

export function requirePermission(
  user: AuthenticatedUser,
  resource: Resource,
  action: Permission
): void {
  if (user.isSuperAdmin) return;
  if (!hasPermission(user.roles, resource, action)) {
    throw new AuthError('Insufficient permissions', 403);
  }
}

export function applyRateLimit(
  request: NextRequest,
  endpoint: string,
  identifier?: string
): void {
  const id = identifier || getClientIdentifier(request);
  const result = rateLimitByEndpoint(id, endpoint);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfter || 60);
  }
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded', retryAfter: error.retryAfter },
      {
        status: 429,
        headers: { 'Retry-After': String(error.retryAfter) },
      }
    );
  }
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}

export function securityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

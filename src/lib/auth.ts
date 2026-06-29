import { db } from '@/lib/db';
import crypto from 'crypto';

// Password hashing with bcryptjs
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT token generation
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// Session creation
export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const token = generateToken();
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const session = await db.session.create({
    data: {
      userId,
      token,
      refreshToken,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  return session;
}

// Email verification token
export async function createEmailVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return db.emailVerificationToken.create({
    data: { email, token, expiresAt },
  });
}

// Password reset token
export async function createPasswordResetToken(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return db.passwordResetToken.create({
    data: { email, token, expiresAt },
  });
}

// Validate session
export async function validateSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.isRevoked) return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

// Revoke session
export async function revokeSession(token: string) {
  return db.session.update({
    where: { token },
    data: { isRevoked: true },
  });
}

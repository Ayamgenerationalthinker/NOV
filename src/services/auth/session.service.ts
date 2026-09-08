import crypto from 'crypto';
import { env } from '@/lib/env';
import { Role } from '@prisma/client';
import { cookies } from 'next/headers';

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  role: Role;
  exp?: number;
}

export const SESSION_COOKIE_NAME = 'nov_session_token';
const SESSION_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class SessionService {
  /**
   * Create a tamper-proof cryptographically signed session token (HMAC-SHA256)
   */
  static async createToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + SESSION_EXPIRATION_SECONDS;
    const fullPayload: SessionPayload = { ...payload, exp };

    const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', env.AUTH_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verify and decode session token with constant-time signature comparison
   */
  static async verifyToken(token: string): Promise<SessionPayload | null> {
    try {
      if (!token || typeof token !== 'string') return null;

      const parts = token.split('.');
      if (parts.length !== 2) return null;

      const [payloadBase64, providedSignature] = parts;
      if (!payloadBase64 || !providedSignature) return null;

      const expectedSignature = crypto
        .createHmac('sha256', env.AUTH_SECRET)
        .update(payloadBase64)
        .digest('base64url');

      const providedBuf = Buffer.from(providedSignature);
      const expectedBuf = Buffer.from(expectedSignature);

      if (providedBuf.length !== expectedBuf.length) return null;
      if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

      const decodedPayload: SessionPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64url').toString('utf-8')
      );

      // Check expiration
      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      return {
        userId: decodedPayload.userId,
        email: decodedPayload.email,
        name: decodedPayload.name,
        role: decodedPayload.role,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get current authenticated user session from Next.js cookies
   */
  static async getCurrentSession(): Promise<SessionPayload | null> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (!token) return null;
      return this.verifyToken(token);
    } catch {
      return null;
    }
  }

  /**
   * Cookie configuration for production and local development
   */
  static getCookieOptions(isMaxAgeZero = false) {
    return {
      name: SESSION_COOKIE_NAME,
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: isMaxAgeZero ? 0 : SESSION_EXPIRATION_SECONDS,
    };
  }
}

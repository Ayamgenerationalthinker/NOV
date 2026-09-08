import { describe, it, expect } from 'vitest';
import { SessionService, SessionPayload } from '@/services/auth/session.service';
import { Role } from '@prisma/client';

describe('SessionService', () => {
  it('should create and verify JWT session token correctly', async () => {
    const payload: SessionPayload = {
      userId: 'usr_test_123',
      email: 'customer@example.com',
      name: 'Jane Doe',
      role: Role.CUSTOMER,
    };

    const token = await SessionService.createToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await SessionService.verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.name).toBe(payload.name);
    expect(decoded?.role).toBe(Role.CUSTOMER);
  });

  it('should reject invalid or tampered tokens', async () => {
    const invalidResult = await SessionService.verifyToken('invalid.tampered.token');
    expect(invalidResult).toBeNull();
  });

  it('should generate appropriate cookie options', () => {
    const options = SessionService.getCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBeGreaterThan(0);

    const expiredOptions = SessionService.getCookieOptions(true);
    expect(expiredOptions.maxAge).toBe(0);
  });
});

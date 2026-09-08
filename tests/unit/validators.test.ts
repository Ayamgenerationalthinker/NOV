import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators/auth';

describe('Auth Validation Schemas', () => {
  it('should validate valid registration data', () => {
    const valid = registerSchema.safeParse({
      name: 'Prince Fiebor',
      email: 'prince@example.com',
      password: 'StrongPassword1!',
    });
    expect(valid.success).toBe(true);
  });

  it('should reject invalid registration emails and weak passwords', () => {
    const invalidEmail = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPassword1!',
    });
    expect(invalidEmail.success).toBe(false);

    const weakPassword = registerSchema.safeParse({
      email: 'user@example.com',
      password: '123',
    });
    expect(weakPassword.success).toBe(false);
  });

  it('should validate login schema', () => {
    const valid = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'AnyPassword123',
    });
    expect(valid.success).toBe(true);

    const missingPass = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(missingPass.success).toBe(false);
  });

  it('should validate forgot and reset password schemas', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'invalid' }).success).toBe(false);

    const validReset = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      token: 'tok_123456',
      password: 'NewStrongPassword1!',
    });
    expect(validReset.success).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { PasswordService } from '@/services/auth/password.service';

describe('PasswordService', () => {
  it('should hash a password and verify correctly', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await PasswordService.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true);

    const isValid = await PasswordService.verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordService.verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });

  it('should validate password complexity correctly', () => {
    const validResult = PasswordService.validateComplexity('StrongPass123');
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const tooShort = PasswordService.validateComplexity('Pass1');
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.errors).toContain('Password must be at least 8 characters long');

    const noUpper = PasswordService.validateComplexity('pass12345');
    expect(noUpper.isValid).toBe(false);
    expect(noUpper.errors).toContain('Password must contain at least one uppercase letter');

    const noNumber = PasswordService.validateComplexity('PasswordOnly');
    expect(noNumber.isValid).toBe(false);
    expect(noNumber.errors).toContain('Password must contain at least one number');
  });
});

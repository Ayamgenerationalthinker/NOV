import { describe, it, expect } from 'vitest';
import { TokenService } from '@/services/auth/token.service';

describe('TokenService', () => {
  it('should generate secure random hex tokens', () => {
    const token1 = TokenService.generateSecureToken(32);
    const token2 = TokenService.generateSecureToken(32);

    expect(token1).toHaveLength(64); // 32 bytes in hex = 64 chars
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('should hash tokens with SHA256', () => {
    const token = 'sample-verification-token';
    const hash = TokenService.hashToken(token);

    expect(hash).toHaveLength(64);
    expect(TokenService.hashToken(token)).toBe(hash); // Deterministic
  });

  it('should calculate and check expiration correctly', () => {
    const futureDate = TokenService.getExpirationDate(1);
    expect(TokenService.isExpired(futureDate)).toBe(false);

    const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
    expect(TokenService.isExpired(pastDate)).toBe(true);
  });
});

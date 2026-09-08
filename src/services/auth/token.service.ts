import crypto from 'crypto';

export class TokenService {
  /**
   * Generate a cryptographically secure random token (e.g. for email verification / password reset)
   */
  static generateSecureToken(byteLength: number = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Compute SHA256 hash of a token for secure database storage / lookups
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a short expiration date (default: 1 hour)
   */
  static getExpirationDate(hours: number = 1): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Check whether an expiration date has passed
   */
  static isExpired(expiresAt: Date | string): boolean {
    const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return exp.getTime() < Date.now();
  }
}

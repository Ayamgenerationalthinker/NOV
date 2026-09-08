import { Role } from '@prisma/client';
import { SessionPayload, SessionService } from './session.service';
import { NextResponse } from 'next/server';

export class RBACService {
  /**
   * Check if a given user role has sufficient privileges
   */
  static hasRole(userRole: Role, allowedRoles: Role[]): boolean {
    return allowedRoles.includes(userRole);
  }

  /**
   * Check if user has administrative privileges (ADMIN or SUPER_ADMIN)
   */
  static isAdmin(role: Role): boolean {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }

  /**
   * Check if user has Super Admin privileges
   */
  static isSuperAdmin(role: Role): boolean {
    return role === Role.SUPER_ADMIN;
  }

  /**
   * Guard an API route for authenticated users
   */
  static async requireAuth(): Promise<{ session: SessionPayload } | { error: NextResponse }> {
    const session = await SessionService.getCurrentSession();
    if (!session) {
      return {
        error: NextResponse.json(
          { error: 'Unauthorized: Authentication required to access this resource' },
          { status: 401 }
        ),
      };
    }
    return { session };
  }

  /**
   * Guard an API route for administrator roles only
   */
  static async requireAdmin(): Promise<{ session: SessionPayload } | { error: NextResponse }> {
    const authResult = await this.requireAuth();
    if ('error' in authResult) return authResult;

    if (!this.isAdmin(authResult.session.role)) {
      return {
        error: NextResponse.json(
          { error: 'Forbidden: Administrator privileges required' },
          { status: 403 }
        ),
      };
    }

    return authResult;
  }
}

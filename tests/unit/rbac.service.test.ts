import { describe, it, expect } from 'vitest';
import { RBACService } from '@/services/auth/rbac.service';
import { Role } from '@prisma/client';

describe('RBACService', () => {
  it('should correctly check role authorization', () => {
    expect(RBACService.hasRole(Role.CUSTOMER, [Role.CUSTOMER, Role.ADMIN])).toBe(true);
    expect(RBACService.hasRole(Role.CUSTOMER, [Role.ADMIN, Role.SUPER_ADMIN])).toBe(false);
  });

  it('should identify admin roles correctly', () => {
    expect(RBACService.isAdmin(Role.ADMIN)).toBe(true);
    expect(RBACService.isAdmin(Role.SUPER_ADMIN)).toBe(true);
    expect(RBACService.isAdmin(Role.CUSTOMER)).toBe(false);
  });

  it('should identify super admin role strictly', () => {
    expect(RBACService.isSuperAdmin(Role.SUPER_ADMIN)).toBe(true);
    expect(RBACService.isSuperAdmin(Role.ADMIN)).toBe(false);
    expect(RBACService.isSuperAdmin(Role.CUSTOMER)).toBe(false);
  });
});

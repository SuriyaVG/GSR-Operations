import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleService } from '../roleService';
import { UserRole } from '@/Entities/User';

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      admin: {
        getUserById: vi.fn()
      }
    }
  }
}));

// Mock other dependencies
vi.mock('../errorHandlingService', () => ({
  ErrorHandlingService: {
    handleRoleChangeError: vi.fn().mockReturnValue({ message: 'Test error' }),
    handleUserManagementError: vi.fn().mockReturnValue({ message: 'Test error' }),
    handlePermissionError: vi.fn().mockReturnValue({ message: 'Test error' })
  }
}));

vi.mock('../auditService', () => ({
  AuditService: {
    createAuditLog: vi.fn().mockResolvedValue({}),
    getAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 })
  }
}));

vi.mock('@/lib/authorization', () => ({
  AuthorizationService: {
    hasRole: vi.fn().mockReturnValue(true),
    hasPermission: vi.fn().mockReturnValue(true)
  }
}));

describe('RoleService - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRoleChange', () => {
    it('should return true for valid role changes', async () => {
      // Mock the private methods
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(2);
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([]);

      const result = await RoleService.validateRoleChange(
        'user-123',
        UserRole.PRODUCTION,
        UserRole.VIEWER
      );

      expect(result).toBe(true);
    });

    it('should return false when roles are the same', async () => {
      const result = await RoleService.validateRoleChange(
        'user-123',
        UserRole.VIEWER,
        UserRole.VIEWER
      );

      expect(result).toBe(false);
    });

    it('should return false when demoting the last admin', async () => {
      // Mock getAdminCount to return 1 (last admin)
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(1);
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([]);

      const result = await RoleService.validateRoleChange(
        'admin-123',
        UserRole.VIEWER,
        UserRole.ADMIN
      );

      expect(result).toBe(false);
    });

    it('should return false when too many recent changes', async () => {
      // Mock getRecentRoleChanges to return 3 changes (exceeds limit)
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(2);
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([
        { id: 'log1' }, { id: 'log2' }, { id: 'log3' }
      ]);

      const result = await RoleService.validateRoleChange(
        'user-123',
        UserRole.EDITOR,
        UserRole.VIEWER
      );

      expect(result).toBe(false);
    });
  });

  describe('Permission checking', () => {
    it('should check if user has specific permission', async () => {
      // Mock getUserCustomPermissions to return permissions
      vi.spyOn(RoleService, 'getUserCustomPermissions').mockResolvedValue(['orders:create', 'orders:read']);

      const result = await RoleService.hasCustomPermission('user-123', 'orders', 'create');

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      // Mock getUserCustomPermissions to return permissions
      vi.spyOn(RoleService, 'getUserCustomPermissions').mockResolvedValue(['orders:read']);

      const result = await RoleService.hasCustomPermission('user-123', 'orders', 'delete');

      expect(result).toBe(false);
    });

    it('should handle wildcard permissions', async () => {
      // Mock getUserCustomPermissions to return wildcard permissions
      vi.spyOn(RoleService, 'getUserCustomPermissions').mockResolvedValue(['orders:*']);

      const result = await RoleService.hasCustomPermission('user-123', 'orders', 'create');

      expect(result).toBe(true);
    });
  });

  describe('Role permissions', () => {
    it('should return permissions for admin role', () => {
      const permissions = RoleService.getPermissionsForRole(UserRole.ADMIN);
      
      expect(permissions).toEqual(expect.arrayContaining([
        expect.objectContaining({ resource: '*', action: 'create' }),
        expect.objectContaining({ resource: '*', action: 'read' }),
        expect.objectContaining({ resource: '*', action: 'update' }),
        expect.objectContaining({ resource: '*', action: 'delete' })
      ]));
    });

    it('should return permissions for viewer role', () => {
      const permissions = RoleService.getPermissionsForRole(UserRole.VIEWER);
      
      expect(permissions).toEqual(expect.arrayContaining([
        expect.objectContaining({ resource: 'order', action: 'read' })
      ]));
      expect(permissions).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ resource: '*', action: 'create' })
      ]));
    });

    it('should return all role permissions', () => {
      const allPermissions = RoleService.getAllRolePermissions();
      
      expect(allPermissions).toHaveProperty(UserRole.ADMIN);
      expect(allPermissions).toHaveProperty(UserRole.VIEWER);
      expect(allPermissions[UserRole.ADMIN]).toEqual(expect.arrayContaining([
        expect.objectContaining({ resource: '*', action: 'create' })
      ]));
    });
  });
});
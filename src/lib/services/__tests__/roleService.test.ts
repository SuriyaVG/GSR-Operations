import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleService } from '../roleService';
import { supabase } from '@/lib/supabase';
import { UserRole, AuthorizationService } from '@/Entities/User';
import { AuditService } from '../auditService';
import { ErrorHandlingService } from '../errorHandlingService';

// Mock dependencies
vi.mock('@/lib/supabase', () => {
  // Create a mock that properly chains methods
  const createMockQuery = () => {
    const mockQuery = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      single: vi.fn(),
      then: vi.fn()
    };
    
    // Make all methods return the same mock object for chaining
    Object.keys(mockQuery).forEach(key => {
      if (key === 'single') {
        mockQuery[key].mockResolvedValue({ 
          data: { 
            id: 'test-user-id', 
            email: 'test@example.com', 
            role: 'admin',
            active: true,
            name: 'Test User'
          }, 
          error: null 
        });
      } else if (key === 'then') {
        mockQuery[key].mockResolvedValue({ 
          data: [{ 
            id: 'test-user-id', 
            email: 'test@example.com', 
            role: 'admin',
            active: true,
            name: 'Test User'
          }], 
          error: null 
        });
      } else {
        mockQuery[key].mockReturnValue(mockQuery);
      }
    });
    
    return mockQuery;
  };

  return {
    supabase: {
      from: vi.fn().mockImplementation(() => createMockQuery()),
      auth: {
        getUser: vi.fn(),
        admin: {
          getUserById: vi.fn()
        }
      }
    }
  };
});

vi.mock('@/Entities/User', () => ({
  UserRole: {
    ADMIN: 'admin',
    PRODUCTION: 'production',
    SALES_MANAGER: 'sales_manager',
    FINANCE: 'finance',
    VIEWER: 'viewer'
  },
  AuthorizationService: {
    hasRole: vi.fn(),
    hasPermission: vi.fn(),
    getUserPermissions: vi.fn()
  }
}));

vi.mock('../auditService', () => ({
  AuditService: {
    createAuditLog: vi.fn(),
    getAuditLogs: vi.fn()
  }
}));

vi.mock('../errorHandlingService', () => ({
  ErrorHandlingService: {
    handleRoleChangeError: vi.fn(),
    handlePermissionError: vi.fn()
  }
}));

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the private helper methods
    vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(2);
    vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([]);
  });

  describe('changeUserRole', () => {
    const userId = 'user-123';
    const adminId = 'admin-456';
    const newRole = UserRole.ADMIN;
    const currentRole = UserRole.VIEWER;

    it('should successfully change a user role', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: adminId, role: UserRole.ADMIN },
                  error: null
                })
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        } as any;
      });

      // Mock current profile fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: userId, role: currentRole },
              error: null
            })
          })
        })
      } as any));

      // Mock role update
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: userId, role: newRole },
                error: null
              })
            })
          })
        })
      } as any));

      // Mock auth user fetch
      vi.mocked(supabase.auth.admin.getUserById).mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: 'user@example.com',
            created_at: '2025-01-01T00:00:00Z'
          }
        },
        error: null
      } as any);

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock audit log creation
      vi.mocked(AuditService.createAuditLog).mockResolvedValue({} as any);

      // Execute the method
      const result = await RoleService.changeUserRole(userId, newRole, adminId);

      // Verify the result
      expect(result).toBe(true);

      // Verify the dependencies were called correctly
      expect(AuthorizationService.hasRole).toHaveBeenCalledWith(
        expect.objectContaining({ id: adminId }),
        [UserRole.ADMIN]
      );
      expect(AuditService.createAuditLog).toHaveBeenCalledWith(
        userId,
        'role_change',
        { role: currentRole },
        { role: newRole },
        adminId
      );
    });

    it('should reject role change if admin does not have permission', async () => {
      // Mock admin check with non-admin role
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.VIEWER },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(false);

      // Execute the method and expect it to throw
      await expect(RoleService.changeUserRole(userId, newRole, adminId))
        .rejects.toThrow('Access denied: Admin role required to change user roles');

      // Verify no update was attempted
      expect(AuditService.createAuditLog).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock current profile fetch with error
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any));

      // Mock error handling
      vi.mocked(ErrorHandlingService.handleRoleChangeError).mockReturnValue({
        type: 'database_error',
        message: 'Failed to fetch user profile: Database error',
        recoveryActions: []
      });

      // Execute the method and expect it to throw
      await expect(RoleService.changeUserRole(userId, newRole, adminId))
        .rejects.toThrow('Failed to fetch user profile: Database error');

      // Verify error handling was called
      expect(ErrorHandlingService.handleRoleChangeError).toHaveBeenCalled();
    });
  });

  describe('bulkRoleUpdate', () => {
    const adminId = 'admin-456';
    const users = [
      { userId: 'user-1', role: UserRole.PRODUCTION },
      { userId: 'user-2', role: UserRole.FINANCE }
    ];

    it('should successfully update multiple user roles', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock profiles fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'user-1', role: UserRole.VIEWER },
              { id: 'user-2', role: UserRole.VIEWER }
            ],
            error: null
          })
        })
      } as any));

      // Mock batch update
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any));

      // Mock audit log creation
      vi.mocked(AuditService.createAuditLog).mockResolvedValue({} as any);

      // Execute the method
      const result = await RoleService.bulkRoleUpdate(users, adminId);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(2);
      expect(result.results.every(r => r.success)).toBe(true);

      // Verify the dependencies were called correctly
      expect(AuthorizationService.hasRole).toHaveBeenCalledWith(
        expect.objectContaining({ id: adminId }),
        [UserRole.ADMIN]
      );
      expect(AuditService.createAuditLog).toHaveBeenCalledTimes(2);
    });

    it('should handle validation failures for some users', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock profiles fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'user-1', role: UserRole.VIEWER },
              // user-2 is missing
            ],
            error: null
          })
        })
      } as any));

      // Mock validateRoleChange to fail for one user
      const originalValidateRoleChange = RoleService.validateRoleChange;
      RoleService.validateRoleChange = vi.fn()
        .mockResolvedValueOnce(true)  // First user passes
        .mockResolvedValueOnce(false); // Second user fails

      // Execute the method
      const result = await RoleService.bulkRoleUpdate(users, adminId);

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.results.length).toBe(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);

      // Restore original method
      RoleService.validateRoleChange = originalValidateRoleChange;
    });

    it('should reject bulk update if admin does not have permission', async () => {
      // Mock admin check with non-admin role
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.VIEWER },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(false);

      // Execute the method and expect it to throw
      await expect(RoleService.bulkRoleUpdate(users, adminId))
        .rejects.toThrow('Access denied: Admin role required for bulk role updates');

      // Verify no update was attempted
      expect(AuditService.createAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('validateRoleChange', () => {
    const userId = 'user-123';
    const newRole = UserRole.ADMIN;
    const currentRole = UserRole.VIEWER;

    it('should validate role change when conditions are met', async () => {
      // Mock admin count check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              count: vi.fn().mockResolvedValue({
                count: 2,
                error: null
              })
            })
          })
        })
      } as any));

      // Mock recent changes check
      vi.mocked(AuditService.getAuditLogs).mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      });

      const result = await RoleService.validateRoleChange(userId, newRole, currentRole);

      expect(result).toBe(true);
    });

    it('should reject role change when roles are the same', async () => {
      const result = await RoleService.validateRoleChange(userId, currentRole, currentRole);

      expect(result).toBe(false);
    });

    it('should reject role change when demoting the last admin', async () => {
      // Mock getAdminCount to return 1 (last admin)
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(1);

      const userId = 'admin-user-id';
      const result = await RoleService.validateRoleChange(userId, UserRole.VIEWER, UserRole.ADMIN);

      // Should return false because we can't demote the last admin
      expect(result).toBe(false);
    });

    it('should reject role change when too many recent changes', async () => {
      // Mock getRecentRoleChanges to return 3 changes (exceeds limit)
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([
        { id: 'log1', timestamp: '2023-01-01T00:00:00Z' },
        { id: 'log2', timestamp: '2023-01-01T01:00:00Z' },
        { id: 'log3', timestamp: '2023-01-01T02:00:00Z' }
      ]);

      const userId = 'user-with-many-changes';
      const newRole = UserRole.EDITOR;
      const currentRole = UserRole.VIEWER;

      const result = await RoleService.validateRoleChange(userId, newRole, currentRole);

      // Should return false because there are too many recent changes
      expect(result).toBe(false);
    });
  });

  describe('getAllUsersForManagement', () => {
    const adminId = 'admin-456';

    it('should fetch all users with their management data', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock users fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'user-1',
                role: UserRole.VIEWER,
                name: 'User One',
                designation: 'Viewer',
                active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
                custom_settings: {},
                auth: {
                  users: {
                    email: 'user1@example.com',
                    last_sign_in_at: '2025-01-01T01:00:00Z'
                  }
                }
              },
              {
                id: 'user-2',
                role: UserRole.ADMIN,
                name: 'User Two',
                designation: 'Admin',
                active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
                custom_settings: {},
                auth: {
                  users: {
                    email: 'user2@example.com',
                    last_sign_in_at: '2025-01-01T02:00:00Z'
                  }
                }
              }
            ],
            error: null
          })
        })
      } as any));

      const result = await RoleService.getAllUsersForManagement(adminId);

      expect(result.length).toBe(2);
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].email).toBe('user2@example.com');
      expect(result[0].role).toBe(UserRole.VIEWER);
      expect(result[1].role).toBe(UserRole.ADMIN);
    });

    it('should reject request if admin does not have permission', async () => {
      // Mock admin check with non-admin role
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.VIEWER },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(false);

      // Execute the method and expect it to throw
      await expect(RoleService.getAllUsersForManagement(adminId))
        .rejects.toThrow('Access denied: Admin role required to view user management data');
    });
  });

  describe('getRoleChangeHistory', () => {
    const userId = 'user-123';

    it('should fetch role change history for a user', async () => {
      // Mock auth check
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'current-user' } },
        error: null
      } as any);

      // Mock audit logs fetch
      vi.mocked(AuditService.getAuditLogs).mockResolvedValue({
        logs: [
          {
            id: 'log-1',
            user_id: userId,
            action: 'role_change',
            old_values: { role: UserRole.VIEWER },
            new_values: { role: UserRole.ADMIN },
            performed_by: 'admin-1',
            timestamp: '2025-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1
      });

      const result = await RoleService.getRoleChangeHistory(userId);

      expect(result.length).toBe(1);
      expect(result[0].action).toBe('role_change');
      expect(result[0].old_values.role).toBe(UserRole.VIEWER);
      expect(result[0].new_values.role).toBe(UserRole.ADMIN);
    });

    it('should handle authentication errors', async () => {
      // Mock auth check with no user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      } as any);

      await expect(RoleService.getRoleChangeHistory(userId))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('getUserCountByRole', () => {
    it('should return count of users by role', async () => {
      // Mock users fetch
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { role: UserRole.ADMIN },
              { role: UserRole.ADMIN },
              { role: UserRole.VIEWER },
              { role: UserRole.PRODUCTION },
              { role: UserRole.FINANCE },
              { role: UserRole.SALES_MANAGER }
            ],
            error: null
          })
        })
      } as any));

      const result = await RoleService.getUserCountByRole();

      expect(result[UserRole.ADMIN]).toBe(2);
      expect(result[UserRole.VIEWER]).toBe(1);
      expect(result[UserRole.PRODUCTION]).toBe(1);
      expect(result[UserRole.FINANCE]).toBe(1);
      expect(result[UserRole.SALES_MANAGER]).toBe(1);
    });

    it('should handle database errors', async () => {
      // Mock users fetch with error
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any));

      await expect(RoleService.getUserCountByRole())
        .rejects.toThrow('Failed to fetch user role counts: Database error');
    });
  });

  describe('manageUserPermissions', () => {
    const userId = 'user-123';
    const adminId = 'admin-456';
    const permissions = [
      { resource: 'orders', action: 'create' },
      { resource: 'orders', action: 'read' }
    ];

    it('should add permissions to a user', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock current profile fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: userId,
                custom_settings: {
                  special_permissions: ['customers:read']
                }
              },
              error: null
            })
          })
        })
      } as any));

      // Mock profile update
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any));

      // Mock audit log creation
      vi.mocked(AuditService.createAuditLog).mockResolvedValue({} as any);

      const result = await RoleService.manageUserPermissions(
        {
          userId,
          permissions,
          operation: 'add'
        },
        adminId
      );

      expect(result).toBe(true);
      expect(AuditService.createAuditLog).toHaveBeenCalledWith(
        userId,
        'permission_change',
        { special_permissions: ['customers:read'] },
        { special_permissions: ['customers:read', 'orders:create', 'orders:read'] },
        adminId
      );
    });

    it('should remove permissions from a user', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock current profile fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: userId,
                custom_settings: {
                  special_permissions: ['orders:create', 'orders:read', 'customers:read']
                }
              },
              error: null
            })
          })
        })
      } as any));

      // Mock profile update
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any));

      // Mock audit log creation
      vi.mocked(AuditService.createAuditLog).mockResolvedValue({} as any);

      const result = await RoleService.manageUserPermissions(
        {
          userId,
          permissions,
          operation: 'remove'
        },
        adminId
      );

      expect(result).toBe(true);
      expect(AuditService.createAuditLog).toHaveBeenCalledWith(
        userId,
        'permission_change',
        { special_permissions: ['orders:create', 'orders:read', 'customers:read'] },
        { special_permissions: ['customers:read'] },
        adminId
      );
    });

    it('should replace all permissions for a user', async () => {
      // Mock admin check
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.ADMIN },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock current profile fetch
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: userId,
                custom_settings: {
                  special_permissions: ['customers:read', 'customers:write']
                }
              },
              error: null
            })
          })
        })
      } as any));

      // Mock profile update
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any));

      // Mock audit log creation
      vi.mocked(AuditService.createAuditLog).mockResolvedValue({} as any);

      const result = await RoleService.manageUserPermissions(
        {
          userId,
          permissions,
          operation: 'replace'
        },
        adminId
      );

      expect(result).toBe(true);
      expect(AuditService.createAuditLog).toHaveBeenCalledWith(
        userId,
        'permission_change',
        { special_permissions: ['customers:read', 'customers:write'] },
        { special_permissions: ['orders:create', 'orders:read'] },
        adminId
      );
    });

    it('should reject request if admin does not have permission', async () => {
      // Mock admin check with non-admin role
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: adminId, role: UserRole.VIEWER },
              error: null
            })
          })
        })
      } as any));

      // Mock authorization check
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(false);

      // Execute the method and expect it to throw
      await expect(RoleService.manageUserPermissions(
        {
          userId,
          permissions,
          operation: 'add'
        },
        adminId
      )).rejects.toThrow('Access denied: Admin role required to manage permissions');
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions for a role', () => {
      const role = UserRole.ADMIN;
      const mockPermissions = [
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update' },
        { resource: 'users', action: 'delete' }
      ];

      vi.mocked(AuthorizationService.getUserPermissions).mockReturnValue(mockPermissions);

      const result = RoleService.getPermissionsForRole(role);

      expect(result).toEqual(mockPermissions);
      expect(AuthorizationService.getUserPermissions).toHaveBeenCalledWith({ role });
    });
  });

  describe('getUserCustomPermissions', () => {
    const userId = 'user-123';

    it('should return custom permissions for a user', async () => {
      // Mock profile fetch
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                custom_settings: {
                  special_permissions: ['orders:create', 'orders:read']
                }
              },
              error: null
            })
          })
        })
      } as any));

      const result = await RoleService.getUserCustomPermissions(userId);

      expect(result).toEqual(['orders:create', 'orders:read']);
    });

    it('should return empty array when user has no custom permissions', async () => {
      // Mock profile fetch with no custom settings
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                custom_settings: {}
              },
              error: null
            })
          })
        })
      } as any));

      const result = await RoleService.getUserCustomPermissions(userId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Mock profile fetch with error
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await RoleService.getUserCustomPermissions(userId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching user custom permissions:', expect.any(Object));
    });
  });

  describe('hasCustomPermission', () => {
    const userId = 'user-123';
    const resource = 'orders';
    const action = 'create';

    it('should return true when user has specific permission', async () => {
      // Mock getUserCustomPermissions
      const originalGetUserCustomPermissions = RoleService.getUserCustomPermissions;
      RoleService.getUserCustomPermissions = vi.fn().mockResolvedValue(['orders:create']);

      const result = await RoleService.hasCustomPermission(userId, resource, action);

      expect(result).toBe(true);

      // Restore original method
      RoleService.getUserCustomPermissions = originalGetUserCustomPermissions;
    });

    it('should return true when user has wildcard permission', async () => {
      // Mock getUserCustomPermissions
      const originalGetUserCustomPermissions = RoleService.getUserCustomPermissions;
      RoleService.getUserCustomPermissions = vi.fn().mockResolvedValue(['*']);

      const result = await RoleService.hasCustomPermission(userId, resource, action);

      expect(result).toBe(true);

      // Restore original method
      RoleService.getUserCustomPermissions = originalGetUserCustomPermissions;
    });

    it('should return true when user has resource wildcard permission', async () => {
      // Mock getUserCustomPermissions
      const originalGetUserCustomPermissions = RoleService.getUserCustomPermissions;
      RoleService.getUserCustomPermissions = vi.fn().mockResolvedValue(['orders:*']);

      const result = await RoleService.hasCustomPermission(userId, resource, action);

      expect(result).toBe(true);

      // Restore original method
      RoleService.getUserCustomPermissions = originalGetUserCustomPermissions;
    });

    it('should return true when user has action wildcard permission', async () => {
      // Mock getUserCustomPermissions
      const originalGetUserCustomPermissions = RoleService.getUserCustomPermissions;
      RoleService.getUserCustomPermissions = vi.fn().mockResolvedValue(['*:create']);

      const result = await RoleService.hasCustomPermission(userId, resource, action);

      expect(result).toBe(true);

      // Restore original method
      RoleService.getUserCustomPermissions = originalGetUserCustomPermissions;
    });

    it('should return false when user does not have permission', async () => {
      // Mock getUserCustomPermissions
      const originalGetUserCustomPermissions = RoleService.getUserCustomPermissions;
      RoleService.getUserCustomPermissions = vi.fn().mockResolvedValue(['customers:read']);

      const result = await RoleService.hasCustomPermission(userId, resource, action);

      expect(result).toBe(false);

      // Restore original method
      RoleService.getUserCustomPermissions = originalGetUserCustomPermissions;
    });
  });

  describe('getAllRolePermissions', () => {
    it('should return permissions for all roles', () => {
      const mockPermissions = {
        [UserRole.ADMIN]: [{ resource: 'users', action: 'create' }],
        [UserRole.VIEWER]: [{ resource: 'users', action: 'read' }],
        [UserRole.PRODUCTION]: [{ resource: 'production', action: 'create' }],
        [UserRole.SALES_MANAGER]: [{ resource: 'orders', action: 'create' }],
        [UserRole.FINANCE]: [{ resource: 'invoices', action: 'create' }]
      };

      // Mock getPermissionsForRole
      const originalGetPermissionsForRole = RoleService.getPermissionsForRole;
      RoleService.getPermissionsForRole = vi.fn()
        .mockReturnValueOnce(mockPermissions[UserRole.ADMIN])
        .mockReturnValueOnce(mockPermissions[UserRole.PRODUCTION])
        .mockReturnValueOnce(mockPermissions[UserRole.SALES_MANAGER])
        .mockReturnValueOnce(mockPermissions[UserRole.FINANCE])
        .mockReturnValueOnce(mockPermissions[UserRole.VIEWER]);

      const result = RoleService.getAllRolePermissions();

      expect(result).toEqual(mockPermissions);
      expect(RoleService.getPermissionsForRole).toHaveBeenCalledTimes(5);

      // Restore original method
      RoleService.getPermissionsForRole = originalGetPermissionsForRole;
    });
  });
});
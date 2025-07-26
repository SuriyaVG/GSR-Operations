import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/Entities/User';
import { SupabaseAuthorizationService, EnhancedAuthorizationService } from '@/lib/authorization';
import { RoleService } from '@/lib/services/roleService';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      admin: {
        getUserById: vi.fn()
      }
    }
  }
}));

// Mock User entity and AuthorizationService
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
    getUserPermissions: vi.fn(),
    canAccessFinancialData: vi.fn(),
    canModifyInventory: vi.fn(),
    canManageCustomers: vi.fn()
  }
}));

// Mock AuditService
vi.mock('@/lib/services/auditService', () => ({
  AuditService: {
    createAuditLog: vi.fn().mockResolvedValue({}),
    getAuditLogs: vi.fn().mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0
    })
  }
}));

// Mock ErrorHandlingService to pass through original error messages
vi.mock('@/lib/services/errorHandlingService', () => ({
  ErrorHandlingService: {
    handleRoleChangeError: vi.fn().mockImplementation((error) => {
      // Always preserve the original error message
      return {
        type: error.message?.includes('Access denied') ? 'permission_error' : 'unknown_error',
        message: error.message || 'Test error',
        recoveryActions: []
      };
    }),
    handlePermissionError: vi.fn().mockImplementation((error) => ({
      type: 'permission_error',
      message: error.message || 'Test error',
      recoveryActions: []
    }))
  }
}));

describe('Role-Based Access Control Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the notification functionality to prevent insert errors
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'notifications' || table === 'role_updates') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        } as any;
      }
      
      // Default mock for other tables
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })),
          limit: vi.fn().mockResolvedValue({ error: null })
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Database Role Assignment Tests', () => {
    it('should assign ADMIN role based on database user_profiles table', async () => {
      // Mock RPC call for getting user role
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.ADMIN, error: null });

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      expect(role).toBe(UserRole.ADMIN);
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role');
    });

    it('should assign PRODUCTION role based on database user_profiles table', async () => {
      // Mock database response for production user
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.PRODUCTION, error: null });

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      expect(role).toBe(UserRole.PRODUCTION);
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role');
    });

    it('should assign SALES_MANAGER role based on database user_profiles table', async () => {
      // Mock database response for sales manager user
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.SALES_MANAGER, error: null });

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      expect(role).toBe(UserRole.SALES_MANAGER);
    });

    it('should assign FINANCE role based on database user_profiles table', async () => {
      // Mock database response for finance user
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.FINANCE, error: null });

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      expect(role).toBe(UserRole.FINANCE);
    });

    it('should assign VIEWER role based on database user_profiles table', async () => {
      // Mock database response for viewer user
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.VIEWER, error: null });

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      expect(role).toBe(UserRole.VIEWER);
    });

    it('should not use hardcoded email-based role assignment', async () => {
      // Mock database response that would differ from hardcoded logic
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.PRODUCTION, error: null });

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      // Should get role from database, not hardcoded logic
      expect(role).toBe(UserRole.PRODUCTION);
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role');
    });
  });

  describe('ADMIN Role Permissions Tests', () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      active: true
    };

    beforeEach(() => {
      // Mock admin role checks
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null }) // has_role
        .mockResolvedValueOnce({ data: true, error: null }); // is_admin
    });

    it('should allow ADMIN to access all resources', async () => {
      // Mock successful database operations for admin
      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const permissions = await SupabaseAuthorizationService.testUserPermissions(adminUser);

      expect(permissions.canViewOrders).toBe(true);
      expect(permissions.canCreateOrders).toBe(true);
      expect(permissions.canViewCustomers).toBe(true);
      expect(permissions.canCreateCustomers).toBe(true);
      expect(permissions.canViewFinancialData).toBe(true);
      expect(permissions.canCreateInvoices).toBe(true);
      expect(permissions.canViewProduction).toBe(true);
      expect(permissions.canCreateProduction).toBe(true);
      expect(permissions.isAdminFromDatabase).toBe(true);
    });

    it('should allow ADMIN to change user roles', async () => {
      // Mock admin user fetch
      vi.spyOn(RoleService as any, 'getCurrentUser').mockResolvedValue(adminUser);
      
      // Mock AuthorizationService
      const { AuthorizationService } = await import('@/Entities/User');
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock profile operations
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-1', role: UserRole.VIEWER },
              error: null
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-1', role: UserRole.PRODUCTION },
                error: null
              })
            }))
          }))
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      // Mock validation
      vi.spyOn(RoleService, 'validateRoleChange').mockResolvedValue(true);

      const result = await RoleService.changeUserRole('user-1', UserRole.PRODUCTION, 'admin-1');
      
      expect(result).toBe(true);
      expect(AuthorizationService.hasRole).toHaveBeenCalledWith(adminUser, [UserRole.ADMIN]);
    });
  });

  describe('PRODUCTION Role Permissions Tests', () => {
    const productionUser = {
      id: 'production-1',
      email: 'production@example.com',
      role: UserRole.PRODUCTION,
      active: true
    };

    beforeEach(() => {
      // Mock production role checks
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null }) // has_role for production
        .mockResolvedValueOnce({ data: false, error: null }); // is_admin (false)
    });

    it('should allow PRODUCTION to access production-related resources', async () => {
      // Mock database operations - allow production access, deny financial
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'production_batches') {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: null })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: null })
              }))
            }))
          } as any;
        }
        if (table === 'financial_ledger' || table === 'invoices') {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
              }))
            }))
          } as any;
        }
        // Default allow for other tables
        return {
          select: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ error: null })
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ error: null })
            }))
          }))
        } as any;
      });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(productionUser);

      expect(permissions.canViewProduction).toBe(true);
      expect(permissions.canCreateProduction).toBe(true);
      expect(permissions.canViewFinancialData).toBe(false);
      expect(permissions.canCreateInvoices).toBe(false);
      expect(permissions.isAdminFromDatabase).toBe(false);
    });

    it('should deny PRODUCTION access to role management', async () => {
      // Mock non-admin user
      vi.spyOn(RoleService as any, 'getCurrentUser').mockResolvedValue(productionUser);
      
      const { AuthorizationService } = await import('@/Entities/User');
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(false);

      // Mock the profile fetch to avoid database errors
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-1', role: UserRole.VIEWER },
              error: null
            })
          }))
        }))
      } as any);

      await expect(
        RoleService.changeUserRole('user-1', UserRole.VIEWER, 'production-1')
      ).rejects.toThrow();
    });
  });

  describe('SALES_MANAGER Role Permissions Tests', () => {
    const salesUser = {
      id: 'sales-1',
      email: 'sales@example.com',
      role: UserRole.SALES_MANAGER,
      active: true
    };

    beforeEach(() => {
      // Mock sales manager role checks
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null }) // has_role for sales_manager
        .mockResolvedValueOnce({ data: false, error: null }); // is_admin (false)
    });

    it('should allow SALES_MANAGER to access customer and order resources', async () => {
      // Mock database operations - allow customer/order access, deny production/financial
      vi.mocked(supabase.from).mockImplementation((table) => {
        const allowedTables = ['customers', 'orders'];
        const deniedTables = ['production_batches', 'financial_ledger'];
        
        if (allowedTables.includes(table)) {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: null })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: null })
              }))
            }))
          } as any;
        }
        
        if (deniedTables.includes(table)) {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
              }))
            }))
          } as any;
        }

        // Default allow for other tables
        return {
          select: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ error: null })
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ error: null })
            }))
          }))
        } as any;
      });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(salesUser);

      expect(permissions.canViewCustomers).toBe(true);
      expect(permissions.canCreateCustomers).toBe(true);
      expect(permissions.canViewOrders).toBe(true);
      expect(permissions.canCreateOrders).toBe(true);
      expect(permissions.canViewProduction).toBe(false);
      expect(permissions.canViewFinancialData).toBe(false);
    });
  });

  describe('FINANCE Role Permissions Tests', () => {
    const financeUser = {
      id: 'finance-1',
      email: 'finance@example.com',
      role: UserRole.FINANCE,
      active: true
    };

    beforeEach(() => {
      // Mock finance role checks
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null }) // has_role for finance
        .mockResolvedValueOnce({ data: false, error: null }); // is_admin (false)
    });

    it('should allow FINANCE to access financial resources', async () => {
      // Mock database operations - allow financial access, deny production
      vi.mocked(supabase.from).mockImplementation((table) => {
        const allowedTables = ['financial_ledger', 'invoices', 'orders', 'customers'];
        const deniedTables = ['production_batches', 'material_intake_log'];
        
        if (allowedTables.includes(table)) {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: null })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: null })
              }))
            }))
          } as any;
        }
        
        if (deniedTables.includes(table)) {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
              }))
            }))
          } as any;
        }

        return {
          select: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ error: null })
          }))
        } as any;
      });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(financeUser);

      expect(permissions.canViewFinancialData).toBe(true);
      expect(permissions.canCreateInvoices).toBe(true);
      expect(permissions.canViewOrders).toBe(true);
      expect(permissions.canViewCustomers).toBe(true);
      expect(permissions.canViewProduction).toBe(false);
      expect(permissions.canCreateProduction).toBe(false);
    });
  });

  describe('VIEWER Role Permissions Tests', () => {
    const viewerUser = {
      id: 'viewer-1',
      email: 'viewer@example.com',
      role: UserRole.VIEWER,
      active: true
    };

    beforeEach(() => {
      // Mock viewer role checks
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null }) // has_role for viewer
        .mockResolvedValueOnce({ data: false, error: null }); // is_admin (false)
    });

    it('should allow VIEWER only read access to basic resources', async () => {
      // Mock database operations - allow only SELECT, deny all INSERT/UPDATE/DELETE
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
        }))
      }) as any);

      const permissions = await SupabaseAuthorizationService.testUserPermissions(viewerUser);

      expect(permissions.canViewOrders).toBe(true);
      expect(permissions.canCreateOrders).toBe(false);
      expect(permissions.canViewCustomers).toBe(true);
      expect(permissions.canCreateCustomers).toBe(false);
      expect(permissions.canViewProduction).toBe(true);
      expect(permissions.canCreateProduction).toBe(false);
      expect(permissions.canViewFinancialData).toBe(true);
      expect(permissions.canCreateInvoices).toBe(false);
    });

    it('should deny VIEWER access to administrative functions', async () => {
      // Mock non-admin user
      vi.spyOn(RoleService as any, 'getCurrentUser').mockResolvedValue(viewerUser);
      
      const { AuthorizationService } = await import('@/Entities/User');
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(false);

      // Mock the profile fetch to avoid database errors
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-1', role: UserRole.PRODUCTION },
              error: null
            })
          }))
        }))
      } as any);

      await expect(
        RoleService.changeUserRole('user-1', UserRole.PRODUCTION, 'viewer-1')
      ).rejects.toThrow();

      await expect(
        RoleService.getAllUsersForManagement('viewer-1')
      ).rejects.toThrow('Access denied: Admin role required to view user management data');
    });
  });

  describe('RLS Policy Enforcement Tests', () => {
    it('should enforce RLS policies correctly with proper role assignments', async () => {
      // Mock user profile access
      const mockQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-1', role: UserRole.PRODUCTION },
            error: null
          }),
          limit: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      
      // Mock RPC calls for role validation
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.PRODUCTION, error: null })
        .mockResolvedValueOnce({ data: false, error: null });

      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect RLS policy violations', async () => {
      // Mock profile access failure due to RLS
      const mockQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'RLS policy violation: insufficient permissions' }
          }),
          limit: vi.fn().mockResolvedValue({ 
            error: { message: 'permission denied for table orders' } 
          })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      
      // Mock RPC failures
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: null, error: { message: 'Function access denied' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Function access denied' } });

      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Cannot access user profile');
    });
  });

  describe('Enhanced Authorization Service Tests', () => {
    const testUser = {
      id: 'test-user',
      email: 'test@example.com',
      role: UserRole.SALES_MANAGER,
      active: true
    };

    it('should validate user access with both client and database checks', async () => {
      // Mock client-side authorization
      const { AuthorizationService } = await import('@/Entities/User');
      vi.mocked(AuthorizationService.hasPermission).mockReturnValue(true);
      vi.mocked(AuthorizationService.canAccessFinancialData).mockReturnValue(true);
      vi.mocked(AuthorizationService.canModifyInventory).mockReturnValue(false);
      vi.mocked(AuthorizationService.canManageCustomers).mockReturnValue(true);

      // Mock database permissions to match client
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'production_batches') {
          return {
            select: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ error: { message: 'RLS policy violation' } })
              }))
            }))
          } as any;
        }
        // Allow access to other tables
        return {
          select: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ error: null })
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ error: null })
            }))
          }))
        } as any;
      });
      
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.SALES_MANAGER, error: null })
        .mockResolvedValueOnce({ data: false, error: null });

      const validation = await EnhancedAuthorizationService.validateUserAccess(testUser);

      expect(validation.valid).toBe(true);
      expect(validation.discrepancies).toHaveLength(0);
    });

    it('should detect discrepancies between client and database permissions', async () => {
      // Mock client-side to allow access
      const { AuthorizationService } = await import('@/Entities/User');
      vi.mocked(AuthorizationService.hasPermission).mockReturnValue(true);
      vi.mocked(AuthorizationService.canAccessFinancialData).mockReturnValue(true);
      vi.mocked(AuthorizationService.canModifyInventory).mockReturnValue(true);
      vi.mocked(AuthorizationService.canManageCustomers).mockReturnValue(true);

      // Mock database to deny access
      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ 
            error: { message: 'RLS policy violation' } 
          })
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              error: { message: 'RLS policy violation' } 
            })
          }))
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.VIEWER, error: null })
        .mockResolvedValueOnce({ data: false, error: null });

      const validation = await EnhancedAuthorizationService.validateUserAccess(testUser);

      expect(validation.valid).toBe(false);
      expect(validation.discrepancies.length).toBeGreaterThan(0);
    });
  });

  describe('Role Assignment Validation Tests', () => {
    it('should prevent assignment of invalid roles', async () => {
      const isValid = await RoleService.validateRoleChange(
        'user-1',
        'INVALID_ROLE' as UserRole,
        UserRole.VIEWER
      );

      expect(isValid).toBe(false);
    });

    it('should prevent demotion of the last admin', async () => {
      // Mock admin count to return 1
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(1);

      const isValid = await RoleService.validateRoleChange(
        'last-admin',
        UserRole.VIEWER,
        UserRole.ADMIN
      );

      expect(isValid).toBe(false);
    });

    it('should allow role changes when multiple admins exist', async () => {
      // Mock admin count to return 2
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(2);
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([]);

      const isValid = await RoleService.validateRoleChange(
        'admin-user',
        UserRole.PRODUCTION,
        UserRole.ADMIN
      );

      expect(isValid).toBe(true);
    });

    it('should prevent too many role changes in short time period', async () => {
      // Mock recent changes to exceed limit
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([
        { id: 'log1', timestamp: '2023-01-01T00:00:00Z' },
        { id: 'log2', timestamp: '2023-01-01T01:00:00Z' },
        { id: 'log3', timestamp: '2023-01-01T02:00:00Z' }
      ]);

      const isValid = await RoleService.validateRoleChange(
        'frequent-changer',
        UserRole.PRODUCTION,
        UserRole.VIEWER
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full role assignment workflow', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        active: true
      };

      // Mock admin user fetch
      vi.spyOn(RoleService as any, 'getCurrentUser').mockResolvedValue(adminUser);
      
      // Mock AuthorizationService
      const { AuthorizationService } = await import('@/Entities/User');
      vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

      // Mock profile operations
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-1', role: UserRole.VIEWER },
              error: null
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-1', role: UserRole.PRODUCTION },
                error: null
              })
            }))
          }))
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      // Mock validation and helper methods
      vi.spyOn(RoleService, 'validateRoleChange').mockResolvedValue(true);
      vi.spyOn(RoleService as any, 'getAdminCount').mockResolvedValue(2);
      vi.spyOn(RoleService as any, 'getRecentRoleChanges').mockResolvedValue([]);
      vi.spyOn(RoleService as any, 'notifyUserOfRoleChange').mockResolvedValue(undefined);

      // Execute role change
      const result = await RoleService.changeUserRole('user-1', UserRole.PRODUCTION, 'admin-1');
      
      expect(result).toBe(true);
      
      // Verify the workflow
      expect(AuthorizationService.hasRole).toHaveBeenCalledWith(adminUser, [UserRole.ADMIN]);
      expect(RoleService.validateRoleChange).toHaveBeenCalledWith('user-1', UserRole.PRODUCTION, UserRole.VIEWER);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should handle role-based database access correctly', async () => {
      // Test that different roles get different database access
      const roles = [UserRole.ADMIN, UserRole.PRODUCTION, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.VIEWER];
      
      for (const role of roles) {
        // Mock role-specific database responses
        vi.mocked(supabase.rpc)
          .mockResolvedValueOnce({ data: role, error: null }) // getCurrentUserRole
          .mockResolvedValueOnce({ data: true, error: null }); // hasRole
        
        const currentRole = await SupabaseAuthorizationService.getCurrentUserRole();
        expect(currentRole).toBe(role);
        
        const hasRole = await SupabaseAuthorizationService.hasRole(role);
        expect(hasRole).toBe(true);
      }
    });
  });
});
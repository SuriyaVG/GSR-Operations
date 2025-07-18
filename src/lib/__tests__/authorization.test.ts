import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAuthorizationService, EnhancedAuthorizationService } from '../authorization';
import { UserRole } from '../../Entities/User';
import { supabase } from '../supabase';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('SupabaseAuthorizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testDatabasePermission', () => {
    it('should test SELECT permission successfully', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await SupabaseAuthorizationService.testDatabasePermission('orders', 'SELECT');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('orders');
    });

    it('should test SELECT permission with RLS denial', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ 
            error: { message: 'RLS policy violation' } 
          })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await SupabaseAuthorizationService.testDatabasePermission('orders', 'SELECT');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('RLS policy violation');
    });

    it('should test INSERT permission successfully', async () => {
      const mockQuery = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const testData = { name: 'Test', email: 'test@example.com' };
      const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'INSERT', testData);

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should require test data for INSERT operation', async () => {
      const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'INSERT');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Test data required for INSERT operation');
    });

    it('should test UPDATE permission', async () => {
      const mockQuery = {
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const testData = { name: 'Updated Name' };
      const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'UPDATE', testData);

      expect(result.allowed).toBe(true);
    });

    it('should test DELETE permission', async () => {
      const mockQuery = {
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'DELETE');

      expect(result.allowed).toBe(true);
    });

    it('should handle unsupported operations', async () => {
      const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'INVALID' as any);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Unsupported operation: INVALID');
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await SupabaseAuthorizationService.hasRole(UserRole.ADMIN);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('has_role', { required_role: UserRole.ADMIN });
    });

    it('should return false when user does not have role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null });

      const result = await SupabaseAuthorizationService.hasRole(UserRole.ADMIN);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const result = await SupabaseAuthorizationService.hasRole(UserRole.ADMIN);

      expect(result).toBe(false);
    });

    it('should handle exceptions', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Connection error'));

      const result = await SupabaseAuthorizationService.hasRole(UserRole.ADMIN);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has any of the roles', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await SupabaseAuthorizationService.hasAnyRole([UserRole.ADMIN, UserRole.SALES_MANAGER]);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('has_any_role', { 
        roles: [UserRole.ADMIN, UserRole.SALES_MANAGER] 
      });
    });

    it('should return false when user has none of the roles', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null });

      const result = await SupabaseAuthorizationService.hasAnyRole([UserRole.ADMIN, UserRole.SALES_MANAGER]);

      expect(result).toBe(false);
    });
  });

  describe('getCurrentUserRole', () => {
    it('should return user role from database', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: UserRole.ADMIN, error: null });

      const result = await SupabaseAuthorizationService.getCurrentUserRole();

      expect(result).toBe(UserRole.ADMIN);
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role');
    });

    it('should return null on database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const result = await SupabaseAuthorizationService.getCurrentUserRole();

      expect(result).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await SupabaseAuthorizationService.isAdmin();

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('is_admin');
    });

    it('should return false for non-admin user', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null });

      const result = await SupabaseAuthorizationService.isAdmin();

      expect(result).toBe(false);
    });
  });

  describe('testUserPermissions', () => {
    it('should test comprehensive user permissions', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        active: true
      };

      // Mock all the database permission tests
      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.ADMIN, error: null }) // getCurrentUserRole
        .mockResolvedValueOnce({ data: true, error: null }); // isAdmin

      const result = await SupabaseAuthorizationService.testUserPermissions(mockUser);

      expect(result.canViewOrders).toBe(true);
      expect(result.canCreateOrders).toBe(true);
      expect(result.canViewCustomers).toBe(true);
      expect(result.canCreateCustomers).toBe(true);
      expect(result.canViewFinancialData).toBe(true);
      expect(result.canCreateInvoices).toBe(true);
      expect(result.canViewProduction).toBe(true);
      expect(result.canCreateProduction).toBe(true);
      expect(result.roleFromDatabase).toBe(UserRole.ADMIN);
      expect(result.isAdminFromDatabase).toBe(true);
    });
  });

  describe('validateRLSPolicies', () => {
    it('should validate RLS policies successfully', async () => {
      // Mock user profile access
      const mockQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: { id: '1', role: UserRole.ADMIN }, 
            error: null 
          })
        })),
        limit: vi.fn().mockResolvedValue({ error: null })
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      
      // Mock RPC calls
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.ADMIN, error: null }) // getCurrentUserRole
        .mockResolvedValueOnce({ data: true, error: null }); // isAdmin

      const result = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect RLS policy violations', async () => {
      // Mock profile access failure
      const mockQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'RLS policy violation' } 
          })
        })),
        limit: vi.fn().mockResolvedValue({ error: null })
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: null, error: { message: 'Function error' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Function error' } });

      const result = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Cannot access user profile');
    });
  });
});

describe('EnhancedAuthorizationService', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should check client-side permission first', async () => {
      // Mock the AuthorizationService import
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasPermission: vi.fn().mockReturnValue(true)
        }
      }));

      const result = await EnhancedAuthorizationService.hasPermission(
        mockUser, 
        'order', 
        'read', 
        false
      );

      expect(result).toBe(true);
    });

    it('should return false if client-side check fails', async () => {
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasPermission: vi.fn().mockReturnValue(false)
        }
      }));

      const result = await EnhancedAuthorizationService.hasPermission(
        mockUser, 
        'order', 
        'read', 
        false
      );

      expect(result).toBe(false);
    });

    it('should validate with database when requested', async () => {
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasPermission: vi.fn().mockReturnValue(true)
        }
      }));

      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await EnhancedAuthorizationService.hasPermission(
        mockUser, 
        'orders', 
        'read', 
        true
      );

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('orders');
    });
  });

  describe('hasRole', () => {
    it('should check client-side role first', async () => {
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasRole: vi.fn().mockReturnValue(true)
        }
      }));

      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await EnhancedAuthorizationService.hasRole(mockUser, [UserRole.ADMIN]);

      expect(result).toBe(true);
    });

    it('should return false if client-side role check fails', async () => {
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasRole: vi.fn().mockReturnValue(false)
        }
      }));

      const result = await EnhancedAuthorizationService.hasRole(mockUser, [UserRole.ADMIN]);

      expect(result).toBe(false);
    });
  });

  describe('validateUserAccess', () => {
    it('should compare client and database permissions', async () => {
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasPermission: vi.fn().mockReturnValue(true),
          canAccessFinancialData: vi.fn().mockReturnValue(true),
          canModifyInventory: vi.fn().mockReturnValue(true),
          canManageCustomers: vi.fn().mockReturnValue(true)
        }
      }));

      // Mock database permissions to match client permissions
      const mockQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.ADMIN, error: null })
        .mockResolvedValueOnce({ data: true, error: null });

      const result = await EnhancedAuthorizationService.validateUserAccess(mockUser);

      expect(result.valid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.clientPermissions.canViewOrders).toBe(true);
      expect(result.databasePermissions.canViewOrders).toBe(true);
    });

    it('should detect discrepancies between client and database permissions', async () => {
      vi.doMock('../../Entities/User', () => ({
        AuthorizationService: {
          hasPermission: vi.fn().mockReturnValue(true), // Client allows
          canAccessFinancialData: vi.fn().mockReturnValue(true),
          canModifyInventory: vi.fn().mockReturnValue(true),
          canManageCustomers: vi.fn().mockReturnValue(true)
        }
      }));

      // Mock database to deny permissions
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

      const result = await EnhancedAuthorizationService.validateUserAccess(mockUser);

      expect(result.valid).toBe(false);
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });
  });
});
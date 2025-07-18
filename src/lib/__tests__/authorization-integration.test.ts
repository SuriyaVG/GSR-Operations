import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAuthorizationService, EnhancedAuthorizationService } from '../authorization';
import { User, UserRole, AuthorizationService } from '../../Entities/User';
import { supabase } from '../supabase';

/**
 * Integration tests for the complete authorization system
 * These tests verify that client-side and database-side authorization work together
 */

// Mock Supabase for integration testing
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

describe('Authorization Integration Tests', () => {
  const mockUsers = {
    admin: {
      id: 'admin-user-id',
      email: 'admin@gsroperations.com',
      role: UserRole.ADMIN,
      name: 'Admin User',
      active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    production: {
      id: 'production-user-id',
      email: 'production@gsroperations.com',
      role: UserRole.PRODUCTION,
      name: 'Production Manager',
      active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    salesManager: {
      id: 'sales-user-id',
      email: 'sales@gsroperations.com',
      role: UserRole.SALES_MANAGER,
      name: 'Sales Manager',
      active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    finance: {
      id: 'finance-user-id',
      email: 'finance@gsroperations.com',
      role: UserRole.FINANCE,
      name: 'Finance Manager',
      active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    viewer: {
      id: 'viewer-user-id',
      email: 'viewer@gsroperations.com',
      role: UserRole.VIEWER,
      name: 'Viewer User',
      active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin User Authorization', () => {
    const adminUser = mockUsers.admin;

    it('should have full access to all resources', () => {
      // Test client-side permissions
      expect(AuthorizationService.hasPermission(adminUser, 'order', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'order', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'order', 'update')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'order', 'delete')).toBe(true);
      
      expect(AuthorizationService.hasPermission(adminUser, 'customer', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'financial_ledger', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'batch', 'create')).toBe(true);
      
      // Test role-based checks
      expect(AuthorizationService.hasRole(adminUser, [UserRole.ADMIN])).toBe(true);
      expect(AuthorizationService.canAccessFinancialData(adminUser)).toBe(true);
      expect(AuthorizationService.canModifyInventory(adminUser)).toBe(true);
      expect(AuthorizationService.canManageCustomers(adminUser)).toBe(true);
      
      // Test price override
      expect(AuthorizationService.canOverridePrice(adminUser, 100, 50)).toBe(true); // 50% override
      expect(AuthorizationService.canOverridePrice(adminUser, 100, 200)).toBe(true); // 100% override
    });

    it('should have database-level admin permissions', async () => {
      // Mock database responses for admin user
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: true, error: null }) // is_admin
        .mockResolvedValueOnce({ data: UserRole.ADMIN, error: null }) // get_user_role
        .mockResolvedValueOnce({ data: true, error: null }); // has_role

      const isAdmin = await SupabaseAuthorizationService.isAdmin();
      const userRole = await SupabaseAuthorizationService.getCurrentUserRole();
      const hasAdminRole = await SupabaseAuthorizationService.hasRole(UserRole.ADMIN);

      expect(isAdmin).toBe(true);
      expect(userRole).toBe(UserRole.ADMIN);
      expect(hasAdminRole).toBe(true);
    });
  });

  describe('Production User Authorization', () => {
    const productionUser = mockUsers.production;

    it('should have production-specific permissions', () => {
      // Production can manage batches and inventory
      expect(AuthorizationService.hasPermission(productionUser, 'batch', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(productionUser, 'batch', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(productionUser, 'batch', 'update')).toBe(true);
      
      expect(AuthorizationService.hasPermission(productionUser, 'inventory', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(productionUser, 'inventory', 'update')).toBe(true);
      
      expect(AuthorizationService.hasPermission(productionUser, 'material_intake', 'create')).toBe(true);
      
      // Production cannot manage customers or financial data
      expect(AuthorizationService.hasPermission(productionUser, 'customer', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(productionUser, 'invoice', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(productionUser, 'financial_ledger', 'read')).toBe(false);
      
      // Role-based checks
      expect(AuthorizationService.hasRole(productionUser, [UserRole.PRODUCTION])).toBe(true);
      expect(AuthorizationService.hasRole(productionUser, [UserRole.ADMIN])).toBe(false);
      expect(AuthorizationService.canAccessFinancialData(productionUser)).toBe(false);
      expect(AuthorizationService.canModifyInventory(productionUser)).toBe(true);
      expect(AuthorizationService.canManageCustomers(productionUser)).toBe(false);
    });

    it('should have limited database permissions', async () => {
      // Mock database responses for production user
      const mockSelectQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null }) // Can read production data
        }))
      };
      
      const mockInsertQuery = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null }) // Can create production data
          }))
        }))
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockSelectQuery as any) // production_batches SELECT
        .mockReturnValueOnce(mockInsertQuery as any) // production_batches INSERT
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ 
              error: { message: 'RLS policy violation' } 
            })
          }))
        } as any); // financial_ledger SELECT (should fail)

      const canViewProduction = await SupabaseAuthorizationService.testDatabasePermission('production_batches', 'SELECT');
      const canCreateProduction = await SupabaseAuthorizationService.testDatabasePermission('production_batches', 'INSERT', {
        batch_number: 'TEST-001',
        start_date: new Date().toISOString(),
        status: 'in_progress'
      });
      const canViewFinancial = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');

      expect(canViewProduction.allowed).toBe(true);
      expect(canCreateProduction.allowed).toBe(true);
      expect(canViewFinancial.allowed).toBe(false);
    });
  });

  describe('Sales Manager Authorization', () => {
    const salesUser = mockUsers.salesManager;

    it('should have sales-specific permissions', () => {
      // Sales can manage orders and customers
      expect(AuthorizationService.hasPermission(salesUser, 'order', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'order', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'order', 'update')).toBe(true);
      
      expect(AuthorizationService.hasPermission(salesUser, 'customer', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'customer', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'customer', 'update')).toBe(true);
      
      expect(AuthorizationService.hasPermission(salesUser, 'samples_log', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'interaction_log', 'create')).toBe(true);
      
      // Sales cannot manage production or financial data
      expect(AuthorizationService.hasPermission(salesUser, 'batch', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(salesUser, 'invoice', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(salesUser, 'financial_ledger', 'create')).toBe(false);
      
      // Role-based checks
      expect(AuthorizationService.hasRole(salesUser, [UserRole.SALES_MANAGER])).toBe(true);
      expect(AuthorizationService.canAccessFinancialData(salesUser)).toBe(false);
      expect(AuthorizationService.canModifyInventory(salesUser)).toBe(false);
      expect(AuthorizationService.canManageCustomers(salesUser)).toBe(true);
      
      // Price override limits
      expect(AuthorizationService.canOverridePrice(salesUser, 100, 120)).toBe(true); // 20% override
      expect(AuthorizationService.canOverridePrice(salesUser, 100, 80)).toBe(true); // 20% override
      expect(AuthorizationService.canOverridePrice(salesUser, 100, 130)).toBe(false); // 30% override (exceeds limit)
    });
  });

  describe('Finance User Authorization', () => {
    const financeUser = mockUsers.finance;

    it('should have finance-specific permissions', () => {
      // Finance can manage invoices and financial data
      expect(AuthorizationService.hasPermission(financeUser, 'invoice', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'invoice', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'invoice', 'update')).toBe(true);
      
      expect(AuthorizationService.hasPermission(financeUser, 'credit_note', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'financial_ledger', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'returns_log', 'create')).toBe(true);
      
      // Finance can read orders and customers but not create/modify
      expect(AuthorizationService.hasPermission(financeUser, 'order', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'customer', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'order', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(financeUser, 'customer', 'create')).toBe(false);
      
      // Finance cannot manage production
      expect(AuthorizationService.hasPermission(financeUser, 'batch', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(financeUser, 'inventory', 'update')).toBe(false);
      
      // Role-based checks
      expect(AuthorizationService.hasRole(financeUser, [UserRole.FINANCE])).toBe(true);
      expect(AuthorizationService.canAccessFinancialData(financeUser)).toBe(true);
      expect(AuthorizationService.canModifyInventory(financeUser)).toBe(false);
      expect(AuthorizationService.canManageCustomers(financeUser)).toBe(false);
    });
  });

  describe('Viewer User Authorization', () => {
    const viewerUser = mockUsers.viewer;

    it('should have read-only permissions', () => {
      // Viewer can only read specific resources
      expect(AuthorizationService.hasPermission(viewerUser, 'order', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'customer', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'batch', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'inventory', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'financial_ledger', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'invoice', 'read')).toBe(true);
      
      // Viewer cannot create, update, or delete anything
      expect(AuthorizationService.hasPermission(viewerUser, 'order', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(viewerUser, 'order', 'update')).toBe(false);
      expect(AuthorizationService.hasPermission(viewerUser, 'order', 'delete')).toBe(false);
      
      expect(AuthorizationService.hasPermission(viewerUser, 'customer', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(viewerUser, 'batch', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(viewerUser, 'invoice', 'create')).toBe(false);
      
      // Role-based checks
      expect(AuthorizationService.hasRole(viewerUser, [UserRole.VIEWER])).toBe(true);
      expect(AuthorizationService.canAccessFinancialData(viewerUser)).toBe(false);
      expect(AuthorizationService.canModifyInventory(viewerUser)).toBe(false);
      expect(AuthorizationService.canManageCustomers(viewerUser)).toBe(false);
      
      // No price override capability
      expect(AuthorizationService.canOverridePrice(viewerUser, 100, 120)).toBe(false);
    });
  });

  describe('Enhanced Authorization Service Integration', () => {
    it('should validate client and database permissions match for admin', async () => {
      const adminUser = mockUsers.admin;
      
      // Mock successful database permissions for admin
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

      const validation = await EnhancedAuthorizationService.validateUserAccess(adminUser);

      expect(validation.valid).toBe(true);
      expect(validation.discrepancies).toHaveLength(0);
      expect(validation.clientPermissions.canViewOrders).toBe(true);
      expect(validation.databasePermissions.canViewOrders).toBe(true);
    });

    it('should detect discrepancies between client and database permissions', async () => {
      const viewerUser = mockUsers.viewer;
      
      // Mock database denying permissions (as expected for viewer)
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

      const validation = await EnhancedAuthorizationService.validateUserAccess(viewerUser);

      // For viewer, we expect some discrepancies because client allows read but database might deny
      expect(validation.clientPermissions.canViewOrders).toBe(true); // Client allows
      expect(validation.databasePermissions.canViewOrders).toBe(false); // Database denies
    });

    it('should perform comprehensive permission validation', async () => {
      const salesUser = mockUsers.salesManager;
      
      // Mock database permissions that align with sales manager role
      const mockSelectQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      
      const mockInsertQuery = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      };
      
      const mockDeniedQuery = {
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ 
            error: { message: 'RLS policy violation' } 
          })
        }))
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockSelectQuery as any) // orders SELECT
        .mockReturnValueOnce(mockInsertQuery as any) // orders INSERT
        .mockReturnValueOnce(mockSelectQuery as any) // customers SELECT
        .mockReturnValueOnce(mockInsertQuery as any) // customers INSERT
        .mockReturnValueOnce(mockDeniedQuery as any) // financial_ledger SELECT
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ 
                error: { message: 'RLS policy violation' } 
              })
            }))
          }))
        } as any) // invoices INSERT
        .mockReturnValueOnce(mockSelectQuery as any) // production_batches SELECT
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ 
                error: { message: 'RLS policy violation' } 
              })
            }))
          }))
        } as any); // production_batches INSERT

      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.SALES_MANAGER, error: null })
        .mockResolvedValueOnce({ data: false, error: null });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(salesUser);

      expect(permissions.canViewOrders).toBe(true);
      expect(permissions.canCreateOrders).toBe(true);
      expect(permissions.canViewCustomers).toBe(true);
      expect(permissions.canCreateCustomers).toBe(true);
      expect(permissions.canViewFinancialData).toBe(false);
      expect(permissions.canCreateInvoices).toBe(false);
      expect(permissions.roleFromDatabase).toBe(UserRole.SALES_MANAGER);
      expect(permissions.isAdminFromDatabase).toBe(false);
    });
  });

  describe('RLS Policy Validation', () => {
    it('should validate that RLS policies are properly configured', async () => {
      // Mock successful profile access and function calls
      const mockQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'user-id', role: UserRole.ADMIN }, 
            error: null 
          }),
          limit: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: UserRole.ADMIN, error: null })
        .mockResolvedValueOnce({ data: true, error: null });

      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect RLS policy issues', async () => {
      // Mock profile access failure
      const mockQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'RLS policy violation' } 
          }),
          limit: vi.fn().mockResolvedValue({ error: null })
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: null, error: { message: 'Function not found' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Function not found' } });

      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
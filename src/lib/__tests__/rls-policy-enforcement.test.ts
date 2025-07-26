import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserRole } from '../../Entities/User';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock('../supabase', () => ({
  supabase: mockSupabase
}));

// Mock test users for different roles
const TEST_USERS = {
  admin: {
    id: 'admin-test-user-id',
    email: 'admin@test.com',
    role: UserRole.ADMIN
  },
  production: {
    id: 'production-test-user-id',
    email: 'production@test.com',
    role: UserRole.PRODUCTION
  },
  sales: {
    id: 'sales-test-user-id',
    email: 'sales@test.com',
    role: UserRole.SALES_MANAGER
  },
  finance: {
    id: 'finance-test-user-id',
    email: 'finance@test.com',
    role: UserRole.FINANCE
  },
  viewer: {
    id: 'viewer-test-user-id',
    email: 'viewer@test.com',
    role: UserRole.VIEWER
  }
};

describe('RLS Policy Enforcement', () => {
  beforeEach(() => {
    // Mock successful session for all tests
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        }
      },
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Function Tests', () => {
    it('should test get_user_role function', async () => {
      // Mock the RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: UserRole.ADMIN,
        error: null
      });

      const { SupabaseAuthorizationService } = await import('../authorization');
      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      
      expect(role).toBe(UserRole.ADMIN);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_role');
    });

    it('should test is_admin function', async () => {
      // Mock the RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      });

      const { SupabaseAuthorizationService } = await import('../authorization');
      const isAdmin = await SupabaseAuthorizationService.isAdmin();
      
      expect(isAdmin).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('is_admin');
    });

    it('should test has_role function', async () => {
      // Mock the RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      });

      const { SupabaseAuthorizationService } = await import('../authorization');
      const hasRole = await SupabaseAuthorizationService.hasRole(UserRole.PRODUCTION);
      
      expect(hasRole).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('has_role', { required_role: UserRole.PRODUCTION });
    });

    it('should test has_any_role function', async () => {
      // Mock the RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      });

      const { SupabaseAuthorizationService } = await import('../authorization');
      const roles = [UserRole.PRODUCTION, UserRole.SALES_MANAGER];
      const hasAnyRole = await SupabaseAuthorizationService.hasAnyRole(roles);
      
      expect(hasAnyRole).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('has_any_role', { roles });
    });
  });

  describe('Table Access Control Tests', () => {
    describe('User Profiles Table', () => {
      it('should allow users to view their own profile', async () => {
        // Mock successful profile query
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-user-id', role: UserRole.VIEWER },
              error: null
            })
          })
        } as any);

        const { SupabaseAuthorizationService } = await import('../authorization');
        const result = await SupabaseAuthorizationService.testDatabasePermission('user_profiles', 'SELECT');
        
        expect(result.allowed).toBe(true);
      });

      it('should prevent users from viewing other profiles (non-admin)', async () => {
        // Mock RLS policy blocking access
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'RLS policy violation', code: 'PGRST301' }
            })
          })
        } as any);

        const result = await SupabaseAuthorizationService.testDatabasePermission('user_profiles', 'SELECT');
        
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('RLS policy violation');
      });
    });

    describe('Orders Table', () => {
      it('should allow all authenticated users to view orders', async () => {
        // Mock successful orders query
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'order-1', customer_id: 'customer-1' }],
              error: null
            })
          })
        } as any);

        const result = await SupabaseAuthorizationService.testDatabasePermission('orders', 'SELECT');
        
        expect(result.allowed).toBe(true);
      });

      it('should only allow sales managers and admins to create orders', async () => {
        // Mock successful order creation for authorized role
        vi.mocked(supabase.from).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-order-id' },
                error: null
              })
            })
          })
        } as any);

        const testData = {
          customer_id: 'test-customer',
          order_date: new Date().toISOString(),
          status: 'pending',
          total_amount: 100
        };

        const result = await SupabaseAuthorizationService.testDatabasePermission('orders', 'INSERT', testData);
        
        expect(result.allowed).toBe(true);
      });

      it('should prevent unauthorized roles from creating orders', async () => {
        // Mock RLS policy blocking creation
        vi.mocked(supabase.from).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: insufficient permissions', code: 'PGRST301' }
              })
            })
          })
        } as any);

        const testData = {
          customer_id: 'test-customer',
          order_date: new Date().toISOString(),
          status: 'pending',
          total_amount: 100
        };

        const result = await SupabaseAuthorizationService.testDatabasePermission('orders', 'INSERT', testData);
        
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('RLS policy violation');
      });
    });

    describe('Production Batches Table', () => {
      it('should allow production users and admins to create production batches', async () => {
        // Mock successful production batch creation
        vi.mocked(supabase.from).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-batch-id' },
                error: null
              })
            })
          })
        } as any);

        const testData = {
          batch_number: 'TEST-BATCH-001',
          start_date: new Date().toISOString(),
          status: 'in_progress'
        };

        const result = await SupabaseAuthorizationService.testDatabasePermission('production_batches', 'INSERT', testData);
        
        expect(result.allowed).toBe(true);
      });

      it('should prevent non-production users from creating production batches', async () => {
        // Mock RLS policy blocking creation
        vi.mocked(supabase.from).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: production access required', code: 'PGRST301' }
              })
            })
          })
        } as any);

        const testData = {
          batch_number: 'TEST-BATCH-001',
          start_date: new Date().toISOString(),
          status: 'in_progress'
        };

        const result = await SupabaseAuthorizationService.testDatabasePermission('production_batches', 'INSERT', testData);
        
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('RLS policy violation');
      });
    });

    describe('Financial Ledger Table', () => {
      it('should only allow finance users and admins to view financial ledger', async () => {
        // Mock successful financial ledger query for authorized role
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'ledger-1', amount: 1000 }],
              error: null
            })
          })
        } as any);

        const result = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
        
        expect(result.allowed).toBe(true);
      });

      it('should prevent non-finance users from viewing financial ledger', async () => {
        // Mock RLS policy blocking access
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'RLS policy violation: finance access required', code: 'PGRST301' }
            })
          })
        } as any);

        const result = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
        
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('RLS policy violation');
      });
    });

    describe('Customers Table', () => {
      it('should allow sales managers and admins to manage customers', async () => {
        // Mock successful customer creation
        vi.mocked(supabase.from).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-customer-id' },
                error: null
              })
            })
          })
        } as any);

        const testData = {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890'
        };

        const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'INSERT', testData);
        
        expect(result.allowed).toBe(true);
      });

      it('should prevent non-sales users from managing customers', async () => {
        // Mock RLS policy blocking creation
        vi.mocked(supabase.from).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: sales access required', code: 'PGRST301' }
              })
            })
          })
        } as any);

        const testData = {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '1234567890'
        };

        const result = await SupabaseAuthorizationService.testDatabasePermission('customers', 'INSERT', testData);
        
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('RLS policy violation');
      });
    });
  });

  describe('Role-Based Access Control Tests', () => {
    it('should validate admin user has access to all resources', async () => {
      const adminUser = {
        id: TEST_USERS.admin.id,
        email: TEST_USERS.admin.email,
        role: TEST_USERS.admin.role,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock all database operations as successful for admin
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
          })
        })
      } as any);

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.ADMIN, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_any_role') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(adminUser);

      expect(permissions.canViewOrders).toBe(true);
      expect(permissions.canCreateOrders).toBe(true);
      expect(permissions.canViewCustomers).toBe(true);
      expect(permissions.canCreateCustomers).toBe(true);
      expect(permissions.canViewFinancialData).toBe(true);
      expect(permissions.canCreateInvoices).toBe(true);
      expect(permissions.canViewProduction).toBe(true);
      expect(permissions.canCreateProduction).toBe(true);
      expect(permissions.roleFromDatabase).toBe(UserRole.ADMIN);
      expect(permissions.isAdminFromDatabase).toBe(true);
    });

    it('should validate production user has limited access', async () => {
      const productionUser = {
        id: TEST_USERS.production.id,
        email: TEST_USERS.production.email,
        role: TEST_USERS.production.role,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock database operations based on production role permissions
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'financial_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'RLS policy violation: finance access required', code: 'PGRST301' }
              })
            })
          } as any;
        }
        
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                if (table === 'production_batches') {
                  return Promise.resolve({ data: { id: 'test' }, error: null });
                }
                return Promise.resolve({ 
                  data: null, 
                  error: { message: 'RLS policy violation', code: 'PGRST301' }
                });
              })
            })
          })
        } as any;
      });

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.PRODUCTION, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(productionUser);

      expect(permissions.canViewOrders).toBe(true); // Can view
      expect(permissions.canCreateOrders).toBe(false); // Cannot create
      expect(permissions.canViewCustomers).toBe(true); // Can view
      expect(permissions.canCreateCustomers).toBe(false); // Cannot create
      expect(permissions.canViewFinancialData).toBe(false); // Cannot access financial data
      expect(permissions.canCreateInvoices).toBe(false); // Cannot create invoices
      expect(permissions.canViewProduction).toBe(true); // Can view production
      expect(permissions.canCreateProduction).toBe(true); // Can create production
      expect(permissions.roleFromDatabase).toBe(UserRole.PRODUCTION);
      expect(permissions.isAdminFromDatabase).toBe(false);
    });

    it('should validate viewer user has minimal access', async () => {
      const viewerUser = {
        id: TEST_USERS.viewer.id,
        email: TEST_USERS.viewer.email,
        role: TEST_USERS.viewer.role,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock database operations - viewer can only view, not create
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'financial_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'RLS policy violation: finance access required', code: 'PGRST301' }
              })
            })
          } as any;
        }
        
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'RLS policy violation: insufficient permissions', code: 'PGRST301' }
              })
            })
          })
        } as any;
      });

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const permissions = await SupabaseAuthorizationService.testUserPermissions(viewerUser);

      expect(permissions.canViewOrders).toBe(true); // Can view
      expect(permissions.canCreateOrders).toBe(false); // Cannot create
      expect(permissions.canViewCustomers).toBe(true); // Can view
      expect(permissions.canCreateCustomers).toBe(false); // Cannot create
      expect(permissions.canViewFinancialData).toBe(false); // Cannot access financial data
      expect(permissions.canCreateInvoices).toBe(false); // Cannot create invoices
      expect(permissions.canViewProduction).toBe(true); // Can view production
      expect(permissions.canCreateProduction).toBe(false); // Cannot create production
      expect(permissions.roleFromDatabase).toBe(UserRole.VIEWER);
      expect(permissions.isAdminFromDatabase).toBe(false);
    });
  });

  describe('RLS Policy Validation', () => {
    it('should validate that RLS policies are functioning correctly', async () => {
      // Mock user profile access
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-user', role: UserRole.VIEWER },
            error: null
          })
        })
      } as any);

      // Mock RPC functions
      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect RLS policy failures', async () => {
      // Mock profile access failure
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'permission denied for table user_profiles', code: 'PGRST301' }
          })
        })
      } as any);

      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Cannot access user profile');
    });
  });

  describe('Enhanced Authorization Service', () => {
    it('should validate user access with both client and database checks', async () => {
      const testUser = {
        id: 'test-user',
        email: 'test@example.com',
        role: UserRole.SALES_MANAGER,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock database operations for sales manager
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'financial_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'RLS policy violation: finance access required', code: 'PGRST301' }
              })
            })
          } as any;
        }
        
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                if (table === 'orders' || table === 'customers') {
                  return Promise.resolve({ data: { id: 'test' }, error: null });
                }
                return Promise.resolve({ 
                  data: null, 
                  error: { message: 'RLS policy violation', code: 'PGRST301' }
                });
              })
            })
          })
        } as any;
      });

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.SALES_MANAGER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const validation = await EnhancedAuthorizationService.validateUserAccess(testUser);

      expect(validation.valid).toBe(true); // Should be valid if client and database agree
      expect(validation.discrepancies).toHaveLength(0);
      expect(validation.clientPermissions.canViewOrders).toBe(true);
      expect(validation.databasePermissions.canViewOrders).toBe(true);
      expect(validation.clientPermissions.canCreateOrders).toBe(true);
      expect(validation.databasePermissions.canCreateOrders).toBe(true);
    });

    it('should detect discrepancies between client and database permissions', async () => {
      const testUser = {
        id: 'test-user',
        email: 'test@example.com',
        role: UserRole.VIEWER,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock database allowing more than client should
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
          })
        })
      } as any);

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const validation = await EnhancedAuthorizationService.validateUserAccess(testUser);

      // Should detect discrepancies where database allows more than client
      expect(validation.discrepancies.length).toBeGreaterThan(0);
    });
  });
});
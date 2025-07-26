import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserRole } from '../../Entities/User';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Test user configurations for different roles
const TEST_USERS = {
  admin: {
    id: 'admin-test-user-id',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    name: 'Test Admin User'
  },
  production: {
    id: 'production-test-user-id',
    email: 'production@test.com',
    role: UserRole.PRODUCTION,
    name: 'Test Production User'
  },
  sales: {
    id: 'sales-test-user-id',
    email: 'sales@test.com',
    role: UserRole.SALES_MANAGER,
    name: 'Test Sales Manager'
  },
  finance: {
    id: 'finance-test-user-id',
    email: 'finance@test.com',
    role: UserRole.FINANCE,
    name: 'Test Finance User'
  },
  viewer: {
    id: 'viewer-test-user-id',
    email: 'viewer@test.com',
    role: UserRole.VIEWER,
    name: 'Test Viewer User'
  }
};

// Role-based access matrix defining expected permissions
const ROLE_ACCESS_MATRIX = {
  [UserRole.ADMIN]: {
    user_profiles: { read: true, write: true },
    orders: { read: true, write: true },
    customers: { read: true, write: true },
    production_batches: { read: true, write: true },
    financial_ledger: { read: true, write: true },
    invoices: { read: true, write: true },
    suppliers: { read: true, write: true },
    raw_materials: { read: true, write: true }
  },
  [UserRole.PRODUCTION]: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: false },
    customers: { read: true, write: false },
    production_batches: { read: true, write: true },
    financial_ledger: { read: false, write: false },
    invoices: { read: true, write: false },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: true }
  },
  [UserRole.SALES_MANAGER]: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: true },
    customers: { read: true, write: true },
    production_batches: { read: true, write: false },
    financial_ledger: { read: false, write: false },
    invoices: { read: true, write: true },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  },
  [UserRole.FINANCE]: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: false },
    customers: { read: true, write: false },
    production_batches: { read: true, write: false },
    financial_ledger: { read: true, write: true },
    invoices: { read: true, write: true },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  },
  [UserRole.VIEWER]: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: false },
    customers: { read: true, write: false },
    production_batches: { read: true, write: false },
    financial_ledger: { read: false, write: false },
    invoices: { read: true, write: false },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  }
};

describe('Comprehensive RLS Policy Enforcement Tests', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import('../supabase');
    mockSupabase = supabase;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database-Level Security with Corrected Role Assignments', () => {
    it.each([
      ['admin', UserRole.ADMIN],
      ['production', UserRole.PRODUCTION],
      ['sales', UserRole.SALES_MANAGER],
      ['finance', UserRole.FINANCE],
      ['viewer', UserRole.VIEWER]
    ])('should verify %s users have correct database access', async (userType, role) => {
      const testUser = TEST_USERS[userType as keyof typeof TEST_USERS];
      
      // Mock user session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: testUser.id,
              email: testUser.email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      // Mock user profile
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: testUser.id,
                    email: testUser.email,
                    role: testUser.role,
                    name: testUser.name,
                    active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  },
                  error: null
                })
              })
            })
          } as any;
        }

        // For other tables, mock based on role access matrix
        const accessMatrix = ROLE_ACCESS_MATRIX[role];
        const tableAccess = accessMatrix[table as keyof typeof accessMatrix];
        
        if (!tableAccess) {
          // Default deny for unknown tables
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: table not accessible', code: 'PGRST301' }
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: table not accessible', code: 'PGRST301' }
                })
              })
            })
          } as any;
        }

        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: tableAccess.read ? [] : null,
              error: tableAccess.read ? null : { 
                message: `RLS policy violation: insufficient permissions for ${table}`, 
                code: 'PGRST301' 
              }
            })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: tableAccess.write ? { id: 'test-id' } : null,
                error: tableAccess.write ? null : { 
                  message: `RLS policy violation: insufficient permissions for ${table}`, 
                  code: 'PGRST301' 
                }
              })
            })
          })
        } as any;
      });

      // Mock RPC functions
      mockSupabase.rpc.mockImplementation((fn: string, params?: any) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: role, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: role === UserRole.ADMIN, error: null });
        if (fn === 'has_role') {
          return Promise.resolve({ 
            data: params?.required_role === role, 
            error: null 
          });
        }
        if (fn === 'has_any_role') {
          return Promise.resolve({ 
            data: params?.roles.includes(role), 
            error: null 
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      // Test database functions
      const userRole = await SupabaseAuthorizationService.getCurrentUserRole();
      expect(userRole).toBe(role);

      const isAdmin = await SupabaseAuthorizationService.isAdmin();
      expect(isAdmin).toBe(role === UserRole.ADMIN);

      const hasRole = await SupabaseAuthorizationService.hasRole(role);
      expect(hasRole).toBe(true);

      const hasAnyRole = await SupabaseAuthorizationService.hasAnyRole([role, UserRole.VIEWER]);
      expect(hasAnyRole).toBe(true);

      // Test table access based on role matrix
      for (const [table, permissions] of Object.entries(ROLE_ACCESS_MATRIX[role])) {
        // Test read access
        const readResult = await SupabaseAuthorizationService.testDatabasePermission(table, 'SELECT');
        expect(readResult.allowed).toBe(permissions.read);
        
        if (!permissions.read) {
          expect(readResult.error).toContain('RLS policy violation');
        }

        // Test write access with appropriate test data
        const testData = getTestDataForTable(table);
        const writeResult = await SupabaseAuthorizationService.testDatabasePermission(table, 'INSERT', testData);
        expect(writeResult.allowed).toBe(permissions.write);
        
        if (!permissions.write) {
          expect(writeResult.error).toContain('RLS policy violation');
        }
      }
    });
  });

  describe('Cross-Role Access Prevention', () => {
    it('should prevent production users from accessing financial data', async () => {
      // Setup production user
      const productionUser = TEST_USERS.production;
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: productionUser.id,
              email: productionUser.email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'financial_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { 
                  message: 'RLS policy violation: finance access required',
                  code: 'PGRST301'
                }
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any;
      });

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.PRODUCTION, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      const result = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('finance access required');
    });

    it('should prevent finance users from creating production batches', async () => {
      // Setup finance user
      const financeUser = TEST_USERS.finance;
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: financeUser.id,
              email: financeUser.email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'production_batches') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { 
                    message: 'RLS policy violation: production access required',
                    code: 'PGRST301'
                  }
                })
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any;
      });

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.FINANCE, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      const result = await SupabaseAuthorizationService.testDatabasePermission(
        'production_batches',
        'INSERT',
        { batch_number: 'TEST-001' }
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('production access required');
    });

    it('should prevent sales users from accessing financial ledger', async () => {
      // Setup sales user
      const salesUser = TEST_USERS.sales;
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: salesUser.id,
              email: salesUser.email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'financial_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { 
                  message: 'RLS policy violation: finance access required',
                  code: 'PGRST301'
                }
              })
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any;
      });

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.SALES_MANAGER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      const result = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('finance access required');
    });

    it('should prevent viewers from modifying any data', async () => {
      // Setup viewer user
      const viewerUser = TEST_USERS.viewer;
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: viewerUser.id,
              email: viewerUser.email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      mockSupabase.from.mockImplementation(() => {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { 
                  message: 'RLS policy violation: insufficient permissions',
                  code: 'PGRST301'
                }
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { 
                message: 'RLS policy violation: insufficient permissions',
                code: 'PGRST301'
              }
            })
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { 
                message: 'RLS policy violation: insufficient permissions',
                code: 'PGRST301'
              }
            })
          })
        } as any;
      });

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      const tables = ['orders', 'customers', 'production_batches', 'invoices'];
      
      for (const table of tables) {
        const insertResult = await SupabaseAuthorizationService.testDatabasePermission(
          table,
          'INSERT',
          { test: 'data' }
        );
        expect(insertResult.allowed).toBe(false);
        expect(insertResult.error).toContain('insufficient permissions');
      }
    });
  });

  describe('RLS Policy Compliance Validation', () => {
    it('should validate that RLS policies are functioning correctly', async () => {
      // Mock successful RLS validation
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-user', role: UserRole.VIEWER },
            error: null
          })
        })
      } as any);

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');
      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect RLS policy failures', async () => {
      // Mock profile access failure
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'permission denied for table user_profiles', code: 'PGRST301' }
          })
        })
      } as any);

      const { SupabaseAuthorizationService } = await import('../authorization');
      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Cannot access user profile');
    });

    it('should validate database functions are accessible', async () => {
      // Mock database functions
      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.ADMIN, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_role') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_any_role') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      expect(role).toBe(UserRole.ADMIN);

      const isAdmin = await SupabaseAuthorizationService.isAdmin();
      expect(isAdmin).toBe(true);

      const hasRole = await SupabaseAuthorizationService.hasRole(UserRole.ADMIN);
      expect(hasRole).toBe(true);

      const hasAnyRole = await SupabaseAuthorizationService.hasAnyRole([UserRole.ADMIN, UserRole.VIEWER]);
      expect(hasAnyRole).toBe(true);
    });
  });

  describe('Client-Database Permission Consistency', () => {
    it('should validate that client and database permissions are consistent', async () => {
      // Setup admin user
      const adminUser = {
        id: TEST_USERS.admin.id,
        email: TEST_USERS.admin.email,
        role: UserRole.ADMIN,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock all database operations as successful for admin
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
          })
        })
      } as any);

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.ADMIN, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_any_role') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { EnhancedAuthorizationService } = await import('../authorization');
      const validation = await EnhancedAuthorizationService.validateUserAccess(adminUser);

      expect(validation.valid).toBe(true);
      expect(validation.discrepancies).toHaveLength(0);
      expect(validation.clientPermissions.canViewOrders).toBe(true);
      expect(validation.databasePermissions.canViewOrders).toBe(true);
      expect(validation.clientPermissions.canCreateOrders).toBe(true);
      expect(validation.databasePermissions.canCreateOrders).toBe(true);
    });

    it('should detect discrepancies between client and database permissions', async () => {
      // Setup viewer user with incorrect database permissions
      const viewerUser = {
        id: TEST_USERS.viewer.id,
        email: TEST_USERS.viewer.email,
        role: UserRole.VIEWER,
        permissions: [],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock database allowing more than client should
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
          })
        })
      } as any);

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { EnhancedAuthorizationService } = await import('../authorization');
      const validation = await EnhancedAuthorizationService.validateUserAccess(viewerUser);

      // Should detect discrepancies where database allows more than client
      expect(validation.discrepancies.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Get test data for table insert operations
 */
function getTestDataForTable(table: string): Record<string, any> {
  const testData: Record<string, Record<string, any>> = {
    orders: {
      customer_id: '00000000-0000-0000-0000-000000000001',
      order_date: new Date().toISOString(),
      status: 'pending',
      total_amount: 100
    },
    customers: {
      name: 'Test Customer',
      email: `test${Date.now()}@example.com`,
      phone: '1234567890'
    },
    production_batches: {
      batch_number: `TEST-${Date.now()}`,
      start_date: new Date().toISOString(),
      status: 'in_progress'
    },
    invoices: {
      order_id: '00000000-0000-0000-0000-000000000001',
      invoice_number: `INV-${Date.now()}`,
      amount: 100,
      due_date: new Date().toISOString()
    },
    financial_ledger: {
      transaction_type: 'income',
      amount: 100,
      description: 'Test transaction',
      transaction_date: new Date().toISOString()
    },
    suppliers: {
      name: 'Test Supplier',
      contact_email: `supplier${Date.now()}@example.com`,
      phone: '1234567890'
    },
    raw_materials: {
      name: 'Test Material',
      unit: 'kg',
      cost_per_unit: 10.50
    },
    user_profiles: {
      email: `user${Date.now()}@example.com`,
      name: 'Test User',
      role: UserRole.VIEWER,
      active: true
    }
  };

  return testData[table] || { name: 'Test Item' };
}
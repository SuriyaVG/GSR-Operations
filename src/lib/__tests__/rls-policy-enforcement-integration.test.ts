import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserRole } from '../../Entities/User';
import { supabase } from '../supabase';

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

describe('RLS Policy Enforcement Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database-Level Security with Corrected Role Assignments', () => {
    it('should verify admin users have full database access', async () => {
      // Mock admin session and profile
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'admin-user-id',
              email: 'admin@test.com',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      // Mock database responses for admin - should have access to everything
      vi.mocked(supabase.from).mockImplementation((table) => {
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'admin-user-id', role: UserRole.ADMIN, email: 'admin@test.com' },
                error: null
              })
            })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
          })
        } as any;
      });

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.ADMIN, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_role') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_any_role') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      // Test critical tables that admin should have full access to
      const criticalTables = [
        'user_profiles', 'orders', 'customers', 'production_batches',
        'financial_ledger', 'invoices', 'suppliers', 'raw_materials'
      ];

      for (const table of criticalTables) {
        // Test read access
        const readResult = await SupabaseAuthorizationService.testDatabasePermission(table, 'SELECT');
        expect(readResult.allowed).toBe(true);

        // Test write access
        const writeResult = await SupabaseAuthorizationService.testDatabasePermission(
          table,
          'INSERT',
          { test_field: 'test_value' }
        );
        expect(writeResult.allowed).toBe(true);
      }

      // Verify admin role functions
      const isAdmin = await SupabaseAuthorizationService.isAdmin();
      expect(isAdmin).toBe(true);

      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should enforce production user access restrictions', async () => {
      // Mock production user session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'production-user-id',
              email: 'production@test.com',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      // Mock database responses based on production role restrictions
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'production-user-id', role: UserRole.PRODUCTION, email: 'production@test.com' },
                  error: null
                })
              })
            })
          } as any;
        }

        // Financial data should be blocked
        if (table === 'financial_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation: finance access required', code: 'PGRST301' }
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: finance access required', code: 'PGRST301' }
                })
              })
            })
          } as any;
        }

        // Production batches should be allowed
        if (table === 'production_batches') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'test-batch' }, error: null })
              })
            })
          } as any;
        }

        // Orders and customers - read only
        if (table === 'orders' || table === 'customers') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: sales access required', code: 'PGRST301' }
                })
              })
            })
          } as any;
        }

        // Default read access for other tables
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
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.PRODUCTION, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        if (fn === 'has_role') {
          const [, params] = vi.mocked(supabase.rpc).mock.calls.find(call => call[0] === 'has_role') || [];
          return Promise.resolve({ 
            data: params?.required_role === UserRole.PRODUCTION, 
            error: null 
          });
        }
        return Promise.resolve({ data: false, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      // Test production user specific restrictions
      const financialAccess = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
      expect(financialAccess.allowed).toBe(false);
      expect(financialAccess.error).toContain('finance access required');

      const orderCreation = await SupabaseAuthorizationService.testDatabasePermission(
        'orders',
        'INSERT',
        { customer_id: 'test', total_amount: 100 }
      );
      expect(orderCreation.allowed).toBe(false);
      expect(orderCreation.error).toContain('sales access required');

      // Production batches should be allowed
      const productionAccess = await SupabaseAuthorizationService.testDatabasePermission(
        'production_batches',
        'INSERT',
        { batch_number: 'TEST-001' }
      );
      expect(productionAccess.allowed).toBe(true);

      // Verify role functions
      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      expect(role).toBe(UserRole.PRODUCTION);

      const isAdmin = await SupabaseAuthorizationService.isAdmin();
      expect(isAdmin).toBe(false);
    });

    it('should enforce finance user access restrictions', async () => {
      // Mock finance user session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'finance-user-id',
              email: 'finance@test.com',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'finance-user-id', role: UserRole.FINANCE, email: 'finance@test.com' },
                  error: null
                })
              })
            })
          } as any;
        }

        // Finance user should have access to financial data
        if (table === 'financial_ledger' || table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'test-financial' }, error: null })
              })
            })
          } as any;
        }

        // Cannot create production batches
        if (table === 'production_batches') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: production access required', code: 'PGRST301' }
                })
              })
            })
          } as any;
        }

        // Cannot create orders/customers
        if (table === 'orders' || table === 'customers') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'RLS policy violation: sales access required', code: 'PGRST301' }
                })
              })
            })
          } as any;
        }

        // Default read access
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
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.FINANCE, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: false, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      // Finance user should have financial access
      const financialAccess = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
      expect(financialAccess.allowed).toBe(true);

      const invoiceCreation = await SupabaseAuthorizationService.testDatabasePermission(
        'invoices',
        'INSERT',
        { order_id: 'test', amount: 100 }
      );
      expect(invoiceCreation.allowed).toBe(true);

      // But not production access
      const productionCreation = await SupabaseAuthorizationService.testDatabasePermission(
        'production_batches',
        'INSERT',
        { batch_number: 'TEST-001' }
      );
      expect(productionCreation.allowed).toBe(false);
      expect(productionCreation.error).toContain('production access required');

      // Verify role
      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      expect(role).toBe(UserRole.FINANCE);
    });

    it('should enforce viewer user minimal access', async () => {
      // Mock viewer session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'viewer-user-id',
              email: 'viewer@test.com',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          }
        },
        error: null
      });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'viewer-user-id', role: UserRole.VIEWER, email: 'viewer@test.com' },
                  error: null
                })
              })
            })
          } as any;
        }

        // Viewer cannot access financial data
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

        // Viewer has read access to most tables but cannot create/modify
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
        return Promise.resolve({ data: false, error: null });
      });

      const { SupabaseAuthorizationService } = await import('../authorization');

      // Viewer should not be able to create anything
      const orderCreation = await SupabaseAuthorizationService.testDatabasePermission(
        'orders',
        'INSERT',
        { customer_id: 'test', total_amount: 100 }
      );
      expect(orderCreation.allowed).toBe(false);

      const customerCreation = await SupabaseAuthorizationService.testDatabasePermission(
        'customers',
        'INSERT',
        { name: 'Test Customer' }
      );
      expect(customerCreation.allowed).toBe(false);

      // Should not access financial data
      const financialAccess = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
      expect(financialAccess.allowed).toBe(false);

      // But should be able to read most other data
      const orderRead = await SupabaseAuthorizationService.testDatabasePermission('orders', 'SELECT');
      expect(orderRead.allowed).toBe(true);

      // Verify role
      const role = await SupabaseAuthorizationService.getCurrentUserRole();
      expect(role).toBe(UserRole.VIEWER);
    });
  });

  describe('RLS Policy Compliance Validation', () => {
    it('should validate that RLS policies are functioning correctly', async () => {
      // Mock successful RLS validation
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-user', role: UserRole.VIEWER },
            error: null
          })
        })
      } as any);

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
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
      vi.mocked(supabase.from).mockReturnValue({
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
      vi.mocked(supabase.rpc).mockImplementation((fn) => {
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

  describe('Cross-Role Access Prevention', () => {
    it('should prevent production users from accessing financial data', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
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

      const { SupabaseAuthorizationService } = await import('../authorization');

      const result = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('finance access required');
    });

    it('should prevent finance users from creating production batches', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
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

      const { SupabaseAuthorizationService } = await import('../authorization');

      const result = await SupabaseAuthorizationService.testDatabasePermission(
        'production_batches',
        'INSERT',
        { batch_number: 'TEST-001' }
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('production access required');
    });

    it('should prevent viewers from modifying any data', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
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
});
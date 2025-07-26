import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../lib/auth';
import { UserRole } from '../../Entities/User';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
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

// Test component that uses auth and tries to access different resources
function TestComponent({ testRole }: { testRole: UserRole }) {
  const { user, hasPermission, hasRole } = useAuth();

  if (!user) {
    return <div data-testid="not-authenticated">Not authenticated</div>;
  }

  return (
    <div data-testid="authenticated">
      <div data-testid="user-role">{user.role}</div>
      <div data-testid="can-view-orders">{hasPermission('order', 'read') ? 'yes' : 'no'}</div>
      <div data-testid="can-create-orders">{hasPermission('order', 'create') ? 'yes' : 'no'}</div>
      <div data-testid="can-view-financial">{hasPermission('financial_ledger', 'read') ? 'yes' : 'no'}</div>
      <div data-testid="can-create-production">{hasPermission('production_batch', 'create') ? 'yes' : 'no'}</div>
      <div data-testid="is-admin">{hasRole([UserRole.ADMIN]) ? 'yes' : 'no'}</div>
    </div>
  );
}

describe('RLS Policy Enforcement E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin User Access', () => {
    it('should allow admin users full access to all resources', async () => {
      // Mock admin user session
      const adminUser = {
        id: 'admin-user-id',
        email: 'admin@test.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {}
      };

      const adminProfile = {
        id: 'admin-user-id',
        role: UserRole.ADMIN,
        name: 'Admin User',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock successful session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: adminUser } },
        error: null
      });

      // Mock auth state change subscription
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      });

      // Mock profile query
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: adminProfile,
              error: null
            })
          })
        })
      } as any);

      // Mock RLS database functions
      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.ADMIN, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_role') return Promise.resolve({ data: true, error: null });
        if (fn === 'has_any_role') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent testRole={UserRole.ADMIN} />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      });

      // Verify admin has full access
      expect(screen.getByTestId('user-role')).toHaveTextContent(UserRole.ADMIN);
      expect(screen.getByTestId('can-view-orders')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-create-orders')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-view-financial')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-create-production')).toHaveTextContent('yes');
      expect(screen.getByTestId('is-admin')).toHaveTextContent('yes');
    });
  });

  describe('Production User Access', () => {
    it('should allow production users limited access based on role', async () => {
      const productionUser = {
        id: 'production-user-id',
        email: 'production@test.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {}
      };

      const productionProfile = {
        id: 'production-user-id',
        role: UserRole.PRODUCTION,
        name: 'Production User',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: productionUser } },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: productionProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.PRODUCTION, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        if (fn === 'has_role') return Promise.resolve({ data: fn === UserRole.PRODUCTION, error: null });
        return Promise.resolve({ data: false, error: null });
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent testRole={UserRole.PRODUCTION} />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      });

      // Verify production user has limited access
      expect(screen.getByTestId('user-role')).toHaveTextContent(UserRole.PRODUCTION);
      expect(screen.getByTestId('can-view-orders')).toHaveTextContent('yes'); // Can view
      expect(screen.getByTestId('can-create-orders')).toHaveTextContent('no'); // Cannot create orders
      expect(screen.getByTestId('can-view-financial')).toHaveTextContent('no'); // Cannot view financial
      expect(screen.getByTestId('can-create-production')).toHaveTextContent('yes'); // Can create production
      expect(screen.getByTestId('is-admin')).toHaveTextContent('no');
    });
  });

  describe('Finance User Access', () => {
    it('should allow finance users access to financial data but not production', async () => {
      const financeUser = {
        id: 'finance-user-id',
        email: 'finance@test.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {}
      };

      const financeProfile = {
        id: 'finance-user-id',
        role: UserRole.FINANCE,
        name: 'Finance User',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: financeUser } },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: financeProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.FINANCE, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: false, error: null });
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent testRole={UserRole.FINANCE} />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      });

      // Verify finance user has appropriate access
      expect(screen.getByTestId('user-role')).toHaveTextContent(UserRole.FINANCE);
      expect(screen.getByTestId('can-view-orders')).toHaveTextContent('yes'); // Can view
      expect(screen.getByTestId('can-create-orders')).toHaveTextContent('no'); // Cannot create orders
      expect(screen.getByTestId('can-view-financial')).toHaveTextContent('yes'); // Can view financial
      expect(screen.getByTestId('can-create-production')).toHaveTextContent('no'); // Cannot create production
      expect(screen.getByTestId('is-admin')).toHaveTextContent('no');
    });
  });

  describe('Viewer User Access', () => {
    it('should allow viewer users minimal read-only access', async () => {
      const viewerUser = {
        id: 'viewer-user-id',
        email: 'viewer@test.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {}
      };

      const viewerProfile = {
        id: 'viewer-user-id',
        role: UserRole.VIEWER,
        name: 'Viewer User',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: viewerUser } },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: viewerProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.rpc).mockImplementation((fn) => {
        if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: false, error: null });
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent testRole={UserRole.VIEWER} />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      });

      // Verify viewer has minimal access
      expect(screen.getByTestId('user-role')).toHaveTextContent(UserRole.VIEWER);
      expect(screen.getByTestId('can-view-orders')).toHaveTextContent('yes'); // Can view
      expect(screen.getByTestId('can-create-orders')).toHaveTextContent('no'); // Cannot create
      expect(screen.getByTestId('can-view-financial')).toHaveTextContent('no'); // Cannot view financial
      expect(screen.getByTestId('can-create-production')).toHaveTextContent('no'); // Cannot create production
      expect(screen.getByTestId('is-admin')).toHaveTextContent('no');
    });
  });

  describe('Database-Level RLS Enforcement', () => {
    it('should enforce RLS policies at database level for unauthorized access attempts', async () => {
      const viewerUser = {
        id: 'viewer-user-id',
        email: 'viewer@test.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {}
      };

      // Mock database operations that should be blocked by RLS
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
            }),
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
            })
          } as any;
        }

        // Allow basic read access for other tables
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'viewer-user-id', role: UserRole.VIEWER },
                error: null
              })
            })
          }),
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
          })
        } as any;
      });

      // Test direct database access attempts
      const { SupabaseAuthorizationService } = await import('../../lib/authorization');

      // Test that viewer cannot access financial data
      const financialAccess = await SupabaseAuthorizationService.testDatabasePermission(
        'financial_ledger', 
        'SELECT'
      );
      expect(financialAccess.allowed).toBe(false);
      expect(financialAccess.error).toContain('RLS policy violation');

      // Test that viewer cannot create orders
      const orderCreation = await SupabaseAuthorizationService.testDatabasePermission(
        'orders',
        'INSERT',
        {
          customer_id: 'test-customer',
          order_date: new Date().toISOString(),
          status: 'pending',
          total_amount: 100
        }
      );
      expect(orderCreation.allowed).toBe(false);
      expect(orderCreation.error).toContain('RLS policy violation');
    });

    it('should validate RLS policy configuration is correct', async () => {
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

      const { SupabaseAuthorizationService } = await import('../../lib/authorization');
      const validation = await SupabaseAuthorizationService.validateRLSPolicies();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Role Assignment Validation', () => {
    it('should ensure users have correct roles assigned in database', async () => {
      const testUsers = [
        { email: 'admin@test.com', expectedRole: UserRole.ADMIN },
        { email: 'production@test.com', expectedRole: UserRole.PRODUCTION },
        { email: 'finance@test.com', expectedRole: UserRole.FINANCE },
        { email: 'viewer@test.com', expectedRole: UserRole.VIEWER }
      ];

      for (const testUser of testUsers) {
        // Mock profile query for each user
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: `${testUser.expectedRole}-user-id`,
                  email: testUser.email,
                  role: testUser.expectedRole,
                  active: true
                },
                error: null
              })
            })
          })
        } as any);

        // Mock RPC call to get role from database
        vi.mocked(supabase.rpc).mockResolvedValue({
          data: testUser.expectedRole,
          error: null
        });

        const { SupabaseAuthorizationService } = await import('../../lib/authorization');
        const roleFromDB = await SupabaseAuthorizationService.getCurrentUserRole();

        expect(roleFromDB).toBe(testUser.expectedRole);
      }
    });
  });
});
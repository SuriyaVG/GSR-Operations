import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserRole } from '../../Entities/User';

// Mock Supabase
vi.mock('../supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn()
        },
        from: vi.fn(),
        rpc: vi.fn()
    }
}));

describe('RLS Policy Enforcement', () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        const { supabase } = await import('../supabase');
        mockSupabase = supabase;
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

        it('should handle database function errors gracefully', async () => {
            // Mock RPC error
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'Function not found', code: '42883' }
            });

            const { SupabaseAuthorizationService } = await import('../authorization');
            const role = await SupabaseAuthorizationService.getCurrentUserRole();

            expect(role).toBe(null);
        });
    });

    describe('Table Access Control Tests', () => {
        it('should allow authorized access to user profiles', async () => {
            // Mock successful profile query
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                        data: [{ id: 'test-user-id', role: UserRole.VIEWER }],
                        error: null
                    })
                })
            } as any);

            const { SupabaseAuthorizationService } = await import('../authorization');
            const result = await SupabaseAuthorizationService.testDatabasePermission('user_profiles', 'SELECT');

            expect(result.allowed).toBe(true);
        });

        it('should block unauthorized access with RLS policy violation', async () => {
            // Mock RLS policy blocking access
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'RLS policy violation: insufficient permissions', code: 'PGRST301' }
                    })
                })
            } as any);

            const { SupabaseAuthorizationService } = await import('../authorization');
            const result = await SupabaseAuthorizationService.testDatabasePermission('financial_ledger', 'SELECT');

            expect(result.allowed).toBe(false);
            expect(result.error).toContain('RLS policy violation');
        });

        it('should test INSERT operations with proper data validation', async () => {
            // Mock successful insert for authorized role
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { id: 'new-order-id' },
                            error: null
                        })
                    })
                })
            } as any);

            const { SupabaseAuthorizationService } = await import('../authorization');
            const testData = {
                customer_id: 'test-customer',
                order_date: new Date().toISOString(),
                status: 'pending',
                total_amount: 100
            };

            const result = await SupabaseAuthorizationService.testDatabasePermission('orders', 'INSERT', testData);

            expect(result.allowed).toBe(true);
        });

        it('should block unauthorized INSERT operations', async () => {
            // Mock RLS policy blocking insert
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'RLS policy violation: insufficient permissions', code: 'PGRST301' }
                        })
                    })
                })
            } as any);

            const { SupabaseAuthorizationService } = await import('../authorization');
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

    describe('Role-Based Permission Testing', () => {
        it('should validate admin user permissions comprehensively', async () => {
            const adminUser = {
                id: 'admin-user-id',
                email: 'admin@test.com',
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

            mockSupabase.rpc.mockImplementation((fn) => {
                if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.ADMIN, error: null });
                if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
                if (fn === 'has_any_role') return Promise.resolve({ data: true, error: null });
                return Promise.resolve({ data: null, error: null });
            });

            const { SupabaseAuthorizationService } = await import('../authorization');
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

        it('should validate viewer user has minimal permissions', async () => {
            const viewerUser = {
                id: 'viewer-user-id',
                email: 'viewer@test.com',
                role: UserRole.VIEWER,
                permissions: [],
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Mock database operations - viewer can only view, not create
            mockSupabase.from.mockImplementation((table) => {
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

            mockSupabase.rpc.mockImplementation((fn) => {
                if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.VIEWER, error: null });
                if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
                return Promise.resolve({ data: null, error: null });
            });

            const { SupabaseAuthorizationService } = await import('../authorization');
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
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: 'test-user', role: UserRole.VIEWER },
                        error: null
                    })
                })
            } as any);

            // Mock RPC functions
            mockSupabase.rpc.mockImplementation((fn) => {
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
            mockSupabase.from.mockImplementation((table) => {
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

            mockSupabase.rpc.mockImplementation((fn) => {
                if (fn === 'get_user_role') return Promise.resolve({ data: UserRole.SALES_MANAGER, error: null });
                if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
                return Promise.resolve({ data: null, error: null });
            });

            const { EnhancedAuthorizationService } = await import('../authorization');
            const validation = await EnhancedAuthorizationService.validateUserAccess(testUser);

            expect(validation.valid).toBe(true); // Should be valid if client and database agree
            expect(validation.discrepancies).toHaveLength(0);
            expect(validation.clientPermissions.canViewOrders).toBe(true);
            expect(validation.databasePermissions.canViewOrders).toBe(true);
            expect(validation.clientPermissions.canCreateOrders).toBe(true);
            expect(validation.databasePermissions.canCreateOrders).toBe(true);
        });
    });
});
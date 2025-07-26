import { supabase } from './supabase';
import { UserRole } from '../Entities/User';
import type { User } from '../Entities/User';

/**
 * Supabase-integrated authorization service
 * This service works with Row Level Security (RLS) policies in the database
 */
export class SupabaseAuthorizationService {
  
  /**
   * Test database-level permission enforcement
   * This function attempts to perform an operation and checks if RLS allows it
   */
  static async testDatabasePermission(
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    testData?: Record<string, any>
  ): Promise<{ allowed: boolean; error?: string }> {
    try {
      switch (operation) {
        case 'SELECT':
          const { error: selectError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          return { allowed: !selectError, error: selectError?.message };

        case 'INSERT':
          if (!testData) {
            throw new Error('Test data required for INSERT operation');
          }
          const { error: insertError } = await supabase
            .from(table)
            .insert(testData)
            .select()
            .single();
          return { allowed: !insertError, error: insertError?.message };

        case 'UPDATE':
          if (!testData) {
            throw new Error('Test data required for UPDATE operation');
          }
          const { error: updateError } = await supabase
            .from(table)
            .update(testData)
            .eq('id', 'test-id'); // This will likely fail, but we're testing RLS
          return { allowed: !updateError || !updateError.message.includes('RLS'), error: updateError?.message };

        case 'DELETE':
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('id', 'test-id'); // This will likely fail, but we're testing RLS
          return { allowed: !deleteError || !deleteError.message.includes('RLS'), error: deleteError?.message };

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return { 
        allowed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if current user has a specific role using database function
   */
  static async hasRole(role: UserRole): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_role', { required_role: role });
      
      if (error) {
        console.error('Error checking role:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error in hasRole:', error);
      return false;
    }
  }

  /**
   * Check if current user has any of the specified roles using database function
   */
  static async hasAnyRole(roles: UserRole[]): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_any_role', { roles });
      
      if (error) {
        console.error('Error checking roles:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error in hasAnyRole:', error);
      return false;
    }
  }

  /**
   * Get current user's role from database
   */
  static async getCurrentUserRole(): Promise<UserRole | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_role');
      
      if (error) {
        console.error('Error getting user role:', error);
        return null;
      }
      
      return data as UserRole;
    } catch (error) {
      console.error('Error in getCurrentUserRole:', error);
      return null;
    }
  }

  /**
   * Check if current user is admin using database function
   */
  static async isAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return false;
    }
  }

  /**
   * Test comprehensive permission enforcement for a user
   */
  static async testUserPermissions(user: User): Promise<{
    canViewOrders: boolean;
    canCreateOrders: boolean;
    canViewCustomers: boolean;
    canCreateCustomers: boolean;
    canViewFinancialData: boolean;
    canCreateInvoices: boolean;
    canViewProduction: boolean;
    canCreateProduction: boolean;
    roleFromDatabase: UserRole | null;
    isAdminFromDatabase: boolean;
  }> {
    const [
      canViewOrders,
      canCreateOrders,
      canViewCustomers,
      canCreateCustomers,
      canViewFinancialData,
      canCreateInvoices,
      canViewProduction,
      canCreateProduction,
      roleFromDatabase,
      isAdminFromDatabase
    ] = await Promise.all([
      this.testDatabasePermission('orders', 'SELECT'),
      this.testDatabasePermission('orders', 'INSERT', { 
        customer_id: 'test-customer',
        order_date: new Date().toISOString(),
        status: 'pending',
        total_amount: 100
      }),
      this.testDatabasePermission('customers', 'SELECT'),
      this.testDatabasePermission('customers', 'INSERT', {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890'
      }),
      this.testDatabasePermission('financial_ledger', 'SELECT'),
      this.testDatabasePermission('invoices', 'INSERT', {
        order_id: 'test-order',
        invoice_number: 'TEST-001',
        amount: 100,
        due_date: new Date().toISOString()
      }),
      this.testDatabasePermission('production_batches', 'SELECT'),
      this.testDatabasePermission('production_batches', 'INSERT', {
        batch_number: 'TEST-BATCH-001',
        start_date: new Date().toISOString(),
        status: 'in_progress'
      }),
      this.getCurrentUserRole(),
      this.isAdmin()
    ]);

    return {
      canViewOrders: canViewOrders.allowed,
      canCreateOrders: canCreateOrders.allowed,
      canViewCustomers: canViewCustomers.allowed,
      canCreateCustomers: canCreateCustomers.allowed,
      canViewFinancialData: canViewFinancialData.allowed,
      canCreateInvoices: canCreateInvoices.allowed,
      canViewProduction: canViewProduction.allowed,
      canCreateProduction: canCreateProduction.allowed,
      roleFromDatabase,
      isAdminFromDatabase
    };
  }

  /**
   * Validate that RLS policies are working correctly
   */
  static async validateRLSPolicies(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test that user can access their own profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .single();

      if (profileError) {
        errors.push(`Cannot access user profile: ${profileError.message}`);
      }

      // Test database functions exist and work
      const roleTest = await this.getCurrentUserRole();
      if (roleTest === null) {
        warnings.push('Could not retrieve user role from database function');
      }

      const adminTest = await this.isAdmin();
      if (typeof adminTest !== 'boolean') {
        warnings.push('Admin check function returned unexpected result');
      }

      // Test basic table access
      const tables = ['orders', 'customers', 'production_batches', 'invoices'];
      
      for (const table of tables) {
        const selectTest = await this.testDatabasePermission(table, 'SELECT');
        if (!selectTest.allowed && selectTest.error?.includes('permission denied')) {
          // This might be expected for some roles, so it's a warning not an error
          warnings.push(`No SELECT permission on ${table}: ${selectTest.error}`);
        }
      }

    } catch (error) {
      errors.push(`RLS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Enhanced authorization service that combines client-side and database-level checks
 */
export class EnhancedAuthorizationService {
  
  /**
   * Check permission with both client-side and database validation
   */
  static async hasPermission(
    user: User,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete',
    validateWithDatabase = false
  ): Promise<boolean> {
    // First check client-side permissions (fast)
    const { AuthorizationService } = await import('../Entities/User');
    const clientSideAllowed = AuthorizationService.hasPermission(user, resource, action);
    
    if (!clientSideAllowed) {
      return false;
    }

    // Optionally validate with database RLS (slower but more secure)
    if (validateWithDatabase) {
      const dbOperation = action === 'create' ? 'INSERT' : 
                         action === 'read' ? 'SELECT' :
                         action === 'update' ? 'UPDATE' : 'DELETE';
      
      const dbTest = await SupabaseAuthorizationService.testDatabasePermission(
        resource, 
        dbOperation
      );
      
      return dbTest.allowed;
    }

    return clientSideAllowed;
  }

  /**
   * Check role with database validation
   */
  static async hasRole(user: User, roles: UserRole[]): Promise<boolean> {
    // Check client-side first
    const { AuthorizationService } = await import('../Entities/User');
    const clientSideAllowed = AuthorizationService.hasRole(user, roles);
    
    if (!clientSideAllowed) {
      return false;
    }

    // Validate with database
    return await SupabaseAuthorizationService.hasAnyRole(roles);
  }

  /**
   * Comprehensive authorization check that validates both client and database
   */
  static async validateUserAccess(user: User): Promise<{
    valid: boolean;
    clientPermissions: Record<string, boolean>;
    databasePermissions: Record<string, boolean>;
    discrepancies: string[];
  }> {
    const { AuthorizationService } = await import('../Entities/User');
    
    // Test common permissions client-side
    const clientPermissions = {
      canViewOrders: AuthorizationService.hasPermission(user, 'order', 'read'),
      canCreateOrders: AuthorizationService.hasPermission(user, 'order', 'create'),
      canViewCustomers: AuthorizationService.hasPermission(user, 'customer', 'read'),
      canCreateCustomers: AuthorizationService.hasPermission(user, 'customer', 'create'),
      canViewFinancialData: AuthorizationService.canAccessFinancialData(user),
      canModifyInventory: AuthorizationService.canModifyInventory(user),
      canManageCustomers: AuthorizationService.canManageCustomers(user)
    };

    // Test same permissions database-side
    const dbPermissions = await SupabaseAuthorizationService.testUserPermissions(user);
    const databasePermissions = {
      canViewOrders: dbPermissions.canViewOrders,
      canCreateOrders: dbPermissions.canCreateOrders,
      canViewCustomers: dbPermissions.canViewCustomers,
      canCreateCustomers: dbPermissions.canCreateCustomers,
      canViewFinancialData: dbPermissions.canViewFinancialData,
      canModifyInventory: dbPermissions.canViewProduction, // Approximate mapping
      canManageCustomers: dbPermissions.canCreateCustomers
    };

    // Find discrepancies
    const discrepancies: string[] = [];
    for (const [permission, clientAllowed] of Object.entries(clientPermissions)) {
      const dbAllowed = databasePermissions[permission as keyof typeof databasePermissions];
      if (clientAllowed !== dbAllowed) {
        discrepancies.push(
          `${permission}: client=${clientAllowed}, database=${dbAllowed}`
        );
      }
    }

    return {
      valid: discrepancies.length === 0,
      clientPermissions,
      databasePermissions,
      discrepancies
    };
  }
}
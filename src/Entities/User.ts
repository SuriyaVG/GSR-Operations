// User roles enum
export enum UserRole {
  ADMIN = 'admin',
  PRODUCTION = 'production',
  SALES_MANAGER = 'sales_manager',
  FINANCE = 'finance',
  VIEWER = 'viewer'
}

// Permission interface
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  condition?: (user: User, resource?: any) => boolean;
}

// Enhanced User interface
export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  permissions?: Permission[];
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  active?: boolean;
}

// Permission definitions for each role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admin has all permissions
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' }
  ],
  
  [UserRole.PRODUCTION]: [
    // Production role permissions
    { resource: 'batch', action: 'create' },
    { resource: 'batch', action: 'read' },
    { resource: 'batch', action: 'update' },
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'update' },
    { resource: 'material_intake', action: 'create' },
    { resource: 'material_intake', action: 'read' },
    { resource: 'material_intake', action: 'update' },
    { resource: 'supplier', action: 'read' },
    { resource: 'raw_material', action: 'read' }
  ],
  
  [UserRole.SALES_MANAGER]: [
    // Sales Manager role permissions
    { resource: 'order', action: 'create' },
    { resource: 'order', action: 'read' },
    { resource: 'order', action: 'update' },
    { resource: 'customer', action: 'create' },
    { resource: 'customer', action: 'read' },
    { resource: 'customer', action: 'update' },
    { resource: 'pricing', action: 'read' },
    { resource: 'pricing', action: 'update' },
    { resource: 'interaction_log', action: 'create' },
    { resource: 'interaction_log', action: 'read' },
    { resource: 'interaction_log', action: 'update' },
    { resource: 'samples_log', action: 'create' },
    { resource: 'samples_log', action: 'read' },
    { resource: 'samples_log', action: 'update' },
    { resource: 'batch', action: 'read' },
    { resource: 'inventory', action: 'read' }
  ],
  
  [UserRole.FINANCE]: [
    // Finance role permissions
    { resource: 'invoice', action: 'create' },
    { resource: 'invoice', action: 'read' },
    { resource: 'invoice', action: 'update' },
    { resource: 'credit_note', action: 'create' },
    { resource: 'credit_note', action: 'read' },
    { resource: 'credit_note', action: 'update' },
    { resource: 'financial_ledger', action: 'create' },
    { resource: 'financial_ledger', action: 'read' },
    { resource: 'financial_ledger', action: 'update' },
    { resource: 'returns_log', action: 'create' },
    { resource: 'returns_log', action: 'read' },
    { resource: 'returns_log', action: 'update' },
    { resource: 'order', action: 'read' },
    { resource: 'customer', action: 'read' },
    { resource: 'pricing', action: 'read' }
  ],
  
  [UserRole.VIEWER]: [
    // Viewer role permissions (read-only)
    { resource: 'order', action: 'read' },
    { resource: 'customer', action: 'read' },
    { resource: 'batch', action: 'read' },
    { resource: 'inventory', action: 'read' },
    { resource: 'financial_ledger', action: 'read' },
    { resource: 'invoice', action: 'read' }
  ]
};

// Authorization service
export class AuthorizationService {
  // Check if user has permission for a specific resource and action
  static hasPermission(
    user: User, 
    resource: string, 
    action: 'create' | 'read' | 'update' | 'delete',
    resourceData?: any
  ): boolean {
    if (!user || !user.role) {
      return false;
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Check for wildcard permission (admin)
    const wildcardPermission = permissions.find(p => 
      p.resource === '*' && p.action === action
    );
    if (wildcardPermission) {
      return wildcardPermission.condition ? 
        wildcardPermission.condition(user, resourceData) : true;
    }

    // Check for specific resource permission
    const specificPermission = permissions.find(p => 
      p.resource === resource && p.action === action
    );
    if (specificPermission) {
      return specificPermission.condition ? 
        specificPermission.condition(user, resourceData) : true;
    }

    return false;
  }

  // Check if user has any of the specified roles
  static hasRole(user: User, roles: UserRole[]): boolean {
    return user && roles.includes(user.role);
  }

  // Check if user can perform price override
  static canOverridePrice(user: User, originalPrice: number, newPrice: number): boolean {
    if (!user) return false;

    const overridePercentage = Math.abs((newPrice - originalPrice) / originalPrice) * 100;
    
    switch (user.role) {
      case UserRole.ADMIN:
        return true; // No limit for admin
      case UserRole.SALES_MANAGER:
        return overridePercentage <= 20; // 20% override limit
      default:
        return false;
    }
  }

  // Get user permissions
  static getUserPermissions(user: User): Permission[] {
    if (!user || !user.role) {
      return [];
    }
    return ROLE_PERMISSIONS[user.role] || [];
  }

  // Check if user can access financial data
  static canAccessFinancialData(user: User): boolean {
    return this.hasRole(user, [UserRole.ADMIN, UserRole.FINANCE]);
  }

  // Check if user can modify inventory
  static canModifyInventory(user: User): boolean {
    return this.hasRole(user, [UserRole.ADMIN, UserRole.PRODUCTION]);
  }

  // Check if user can manage customers
  static canManageCustomers(user: User): boolean {
    return this.hasRole(user, [UserRole.ADMIN, UserRole.SALES_MANAGER]);
  }
}

// Authorization middleware function
export function requirePermission(
  resource: string, 
  action: 'create' | 'read' | 'update' | 'delete'
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const user = await User.me(); // Get current user
      
      if (!AuthorizationService.hasPermission(user, resource, action)) {
        throw new Error(`Access denied: Insufficient permissions for ${action} on ${resource}`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Enhanced User API with authentication
export const User = {
  // Get current user
  async me(): Promise<User> {
    // Mock implementation - replace with real API call
    const mockUser: User = {
      id: '1',
      email: 'admin@gsroperations.com',
      role: UserRole.ADMIN,
      name: 'System Administrator',
      active: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
    
    // Add permissions based on role
    mockUser.permissions = AuthorizationService.getUserPermissions(mockUser);
    
    return mockUser;
  },

  // Login user
  async login(email: string, password: string): Promise<User> {
    // Mock implementation - replace with real authentication
    if (email && password) {
      // Mock different users based on email
      let mockUser: User;
      
      if (email.includes('admin')) {
        mockUser = {
          id: '1',
          email: email,
          role: UserRole.ADMIN,
          name: 'System Administrator',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
      } else if (email.includes('production')) {
        mockUser = {
          id: '2',
          email: email,
          role: UserRole.PRODUCTION,
          name: 'Production Manager',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
      } else if (email.includes('sales')) {
        mockUser = {
          id: '3',
          email: email,
          role: UserRole.SALES_MANAGER,
          name: 'Sales Manager',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
      } else if (email.includes('finance')) {
        mockUser = {
          id: '4',
          email: email,
          role: UserRole.FINANCE,
          name: 'Finance Manager',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
      } else {
        mockUser = {
          id: '5',
          email: email,
          role: UserRole.VIEWER,
          name: 'Viewer User',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
      }
      
      // Add permissions based on role
      mockUser.permissions = AuthorizationService.getUserPermissions(mockUser);
      
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      return mockUser;
    }
    throw new Error('Invalid credentials');
  },

  // Logout user
  async logout(): Promise<boolean> {
    localStorage.removeItem('auth_user');
    return true;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return localStorage.getItem('auth_user') !== null;
  },

  // Get user from storage
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('auth_user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const updatedUser = { ...currentUser, ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  // Change user role (admin only)
  async changeUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !AuthorizationService.hasRole(currentUser, [UserRole.ADMIN])) {
      throw new Error('Access denied: Admin role required');
    }

    // Mock implementation - replace with real API call
    console.log(`Changing user ${userId} role to ${newRole}`);
    return true;
  }
}; 
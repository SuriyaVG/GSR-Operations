import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User, UserRole, AuthorizationService } from '../Entities/User';

// Authentication context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: 'create' | 'read' | 'update' | 'delete', resourceData?: any) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canOverridePrice: (originalPrice: number, newPrice: number) => boolean;
  canAccessFinancialData: () => boolean;
  canModifyInventory: () => boolean;
  canManageCustomers: () => boolean;
}

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (User.isAuthenticated()) {
          const currentUser = User.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const loggedInUser = await User.login(email, password);
      setUser(loggedInUser);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      await User.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Permission checking functions
  const hasPermission = (
    resource: string, 
    action: 'create' | 'read' | 'update' | 'delete',
    resourceData?: any
  ): boolean => {
    if (!user) return false;
    return AuthorizationService.hasPermission(user, resource, action, resourceData);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return AuthorizationService.hasRole(user, roles);
  };

  const canOverridePrice = (originalPrice: number, newPrice: number): boolean => {
    if (!user) return false;
    return AuthorizationService.canOverridePrice(user, originalPrice, newPrice);
  };

  const canAccessFinancialData = (): boolean => {
    if (!user) return false;
    return AuthorizationService.canAccessFinancialData(user);
  };

  const canModifyInventory = (): boolean => {
    if (!user) return false;
    return AuthorizationService.canModifyInventory(user);
  };

  const canManageCustomers = (): boolean => {
    if (!user) return false;
    return AuthorizationService.canManageCustomers(user);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    canOverridePrice,
    canAccessFinancialData,
    canModifyInventory,
    canManageCustomers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use authentication context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protecting routes
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  requiredPermission?: {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
  };
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  requiredPermission, 
  fallback 
}: ProtectedRouteProps) {
  const { user, loading, hasRole, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRoles && !hasRole(requiredRoles)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(
    requiredPermission.resource, 
    requiredPermission.action
  )) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to {requiredPermission.action} {requiredPermission.resource}.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Component for conditionally rendering content based on permissions
interface PermissionGateProps {
  children: ReactNode;
  roles?: UserRole[];
  permission?: {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
  };
  fallback?: ReactNode;
}

export function PermissionGate({ 
  children, 
  roles, 
  permission, 
  fallback = null 
}: PermissionGateProps) {
  const { user, hasRole, hasPermission } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (roles && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  // Check permission-based access
  if (permission && !hasPermission(permission.resource, permission.action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Hook for checking permissions
export function usePermissions() {
  const { hasPermission, hasRole, user } = useAuth();

  return {
    hasPermission,
    hasRole,
    user,
    // Convenience methods for common permission checks
    canCreate: (resource: string) => hasPermission(resource, 'create'),
    canRead: (resource: string) => hasPermission(resource, 'read'),
    canUpdate: (resource: string) => hasPermission(resource, 'update'),
    canDelete: (resource: string) => hasPermission(resource, 'delete'),
    // Role-specific checks
    isAdmin: () => hasRole([UserRole.ADMIN]),
    isProduction: () => hasRole([UserRole.PRODUCTION]),
    isSalesManager: () => hasRole([UserRole.SALES_MANAGER]),
    isFinance: () => hasRole([UserRole.FINANCE]),
    isViewer: () => hasRole([UserRole.VIEWER])
  };
}
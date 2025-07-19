import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { User, UserRole, AuthorizationService } from '../Entities/User';
import { supabase } from './supabase';

// Authentication context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
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
  const [initialized, setInitialized] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      if (!mounted) return;

      try {
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.debug('Auth state change:', event);
            
            if (!mounted) return;

            if (session?.user) {
              try {
                const currentUser = await User.me();
                if (mounted) {
                  setUser(currentUser);
                  setLoading(false);
                }
              } catch (error) {
                console.error('Error getting user:', error);
                if (mounted) {
                  setUser(null);
                  setLoading(false);
                }
              }
            } else {
              if (mounted) {
                setUser(null);
                setLoading(false);
              }
            }
          }
        );
        
        authSubscription = subscription;

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Session error:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        // Handle initial session
        if (session?.user) {
          try {
            const currentUser = await User.me();
            if (mounted) {
              setUser(currentUser);
            }
          } catch (error) {
            console.error('Error getting initial user:', error);
            if (mounted) {
              setUser(null);
            }
          }
        } else {
          if (mounted) {
            setUser(null);
          }
        }

        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.debug('Auth initialization timeout - setting loading to false');
        setLoading(false);
        setInitialized(true);
      }
    }, 3000);

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []); // Remove initialized dependency to prevent loops

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(`Login failed: ${error.message}`);
      }

      // Don't set user here - auth state change will handle it
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Register function
  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0]
          }
        }
      });

      if (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }

      // Don't set user here - auth state change will handle it
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(`Logout failed: ${error.message}`);
      }
      // Auth state change will handle setting user to null
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(`Password reset failed: ${error.message}`);
      }
    } catch (error) {
      throw error;
    }
  };

  // Update password function
  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(`Password update failed: ${error.message}`);
      }
    } catch (error) {
      throw error;
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
    register,
    logout,
    resetPassword,
    updatePassword,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" data-testid="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to authentication page instead of showing error message
    return <Navigate to="/auth" replace />;
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
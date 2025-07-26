import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { User, UserRole, AuthorizationService, type Permission } from '../Entities/User';
import { supabase } from './supabase';
import { SecurityAuditService } from './services/securityAuditService';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// AuthService for database-driven authentication
export class AuthService {
  // Get current user with proper database-driven role assignment
  static async getCurrentUser(): Promise<User | null> {
    try {
      console.log('[getCurrentUser] called');
      let sessionResult, sessionError;
      let sessionTimedOut = false;
      const sessionPromise = supabase.auth.getSession().then(({ data, error }) => {
        sessionResult = data;
        sessionError = error;
        return { data, error };
      });
      // Timeout after 5 seconds
      await Promise.race([
        sessionPromise,
        new Promise((_, reject) => setTimeout(() => {
          sessionTimedOut = true;
          reject(new Error('getSession timeout'));
        }, 5000))
      ]);
      if (sessionTimedOut) {
        console.error('[getCurrentUser] getSession timed out');
        return null;
      }
      console.log('[getCurrentUser] session:', sessionResult?.session);
      if (sessionError) {
        console.error('[getCurrentUser] Session error:', sessionError);
        return null;
      }
      if (!sessionResult?.session?.user) {
        console.log('[getCurrentUser] No session user');
        return null;
      }
      // Query user profile from database for role assignment
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', sessionResult.session.user.id)
        .single();
      console.log('[getCurrentUser] profile:', profile, 'profileError:', profileError);
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found - create default profile
          console.log('[getCurrentUser] No profile found, creating default profile for user:', sessionResult.session.user.email);
          const defaultProfile = await this.createDefaultProfile(sessionResult.session.user);
          return this.mapSupabaseUserToUser(sessionResult.session.user, defaultProfile);
        }
        console.error('[getCurrentUser] Profile query error:', profileError);
        return null;
      }
      const user = this.mapSupabaseUserToUser(sessionResult.session.user, profile);
      console.log('[getCurrentUser] returning user:', user);
      return user;
    } catch (error) {
      console.error('[getCurrentUser] Error getting current user:', error);
      return null;
    }
  }

  // Create default profile for new users
  private static async createDefaultProfile(supabaseUser: SupabaseUser): Promise<any> {
    // Determine role based on email (temporary logic until proper role assignment)
    let defaultRole = UserRole.VIEWER;
    
    // Admin assignment for specific email
    if (supabaseUser.email === 'suriyavg834@gmail.com') {
      defaultRole = UserRole.ADMIN;
    }

    const profileData = {
      id: supabaseUser.id,
      role: defaultRole,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || null,
      active: true
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Error creating default profile:', error);
      // Return a fallback profile
      return {
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return data;
  }

  // Map Supabase user to application User with database profile
  private static mapSupabaseUserToUser(supabaseUser: SupabaseUser, profile: any): User {
    const user: User = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      role: profile.role,
      name: profile.name || undefined,
      designation: profile.designation || undefined,
      active: profile.active,
      created_at: supabaseUser.created_at,
      updated_at: profile.updated_at,
      last_login: supabaseUser.last_sign_in_at || undefined,
      last_profile_update: profile.last_profile_update || undefined,
      updated_by: profile.updated_by || undefined,
      email_confirmed_at: supabaseUser.email_confirmed_at || undefined,
      phone: supabaseUser.phone || undefined,
      phone_confirmed_at: supabaseUser.phone_confirmed_at || undefined,
      app_metadata: supabaseUser.app_metadata,
      user_metadata: supabaseUser.user_metadata,
      custom_settings: profile.custom_settings || undefined
    };

    // Add permissions based on role from database
    user.permissions = AuthorizationService.getUserPermissions(user);

    return user;
  }

  // Update user role in database
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  // Get user permissions from database role
  static getUserPermissions(user: User): Permission[] {
    if (!user || !user.role) {
      return [];
    }
    return AuthorizationService.getUserPermissions(user);
  }
}

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

  // Log user and loading state changes
  useEffect(() => {
    console.log('[AuthProvider] user:', user);
  }, [user]);
  useEffect(() => {
    console.log('[AuthProvider] loading:', loading);
  }, [loading]);

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
                const currentUser = await AuthService.getCurrentUser();
                if (mounted) {
                  setUser(currentUser);
                  setLoading(false);
                  // Log successful login/session establishment
                  if (currentUser && event === 'SIGNED_IN') {
                    await SecurityAuditService.logLoginSuccess(currentUser.id, currentUser.email);
                  }
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
                // Log logout if this was a sign out event
                if (event === 'SIGNED_OUT' && user) {
                  await SecurityAuditService.logLogout(user.id, user.email);
                }
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
            const currentUser = await AuthService.getCurrentUser();
            if (mounted) {
              setUser(currentUser);
              // Log successful login for existing session
              if (currentUser) {
                await SecurityAuditService.logLoginSuccess(currentUser.id, currentUser.email);
              }
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
      // Check if account is locked out
      if (SecurityAuditService.isLockedOut(email)) {
        const remainingTime = SecurityAuditService.getRemainingLockoutTime(email);
        const minutes = Math.ceil(remainingTime / (1000 * 60));
        await SecurityAuditService.logLoginFailure(
          email, 
          `Account locked due to multiple failed attempts. Try again in ${minutes} minutes.`
        );
        throw new Error(`Account temporarily locked. Please try again in ${minutes} minutes.`);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Log failed login attempt
        await SecurityAuditService.logLoginFailure(email, error.message);
        throw new Error(`Login failed: ${error.message}`);
      }

      // Log successful login (will be handled in auth state change)
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
      // Log logout before signing out
      if (user) {
        await SecurityAuditService.logLogout(user.id, user.email);
      }
      
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
      // Log password reset request
      await SecurityAuditService.logPasswordResetRequest(email);
      
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

      // Log password change
      if (user) {
        await SecurityAuditService.logPasswordChange(user.id, user.email);
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Log returned values
  console.log('[useAuth] returned:', { user: context.user, loading: context.loading });
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
    // Log unauthorized access attempt
    SecurityAuditService.logUnauthorizedAccess(
      user.id,
      'page_access',
      'read',
      user.role,
      requiredRoles.join(' or ')
    ).catch(err => console.error('Failed to log unauthorized access:', err));
    
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
    // Log permission denied
    SecurityAuditService.logPermissionDenied(
      user.id,
      requiredPermission.resource,
      requiredPermission.action,
      `User lacks ${requiredPermission.action} permission for ${requiredPermission.resource}`
    ).catch(err => console.error('Failed to log permission denied:', err));
    
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
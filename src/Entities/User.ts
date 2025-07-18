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

// Enhanced User interface compatible with Supabase Auth
export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  designation?: string; // Custom designation (e.g., "CEO", "Manager", "Supervisor")
  permissions?: Permission[];
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  active?: boolean;
  // Enhanced profile data
  custom_settings?: {
    display_name?: string;
    title?: string;
    department?: string;
    special_permissions?: string[];
  };
  last_profile_update?: string;
  updated_by?: string;
  // Supabase Auth specific fields
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

// User profile interface for database storage
export interface UserProfile {
  id: string;
  role: UserRole;
  name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Enhanced User Profile with custom designations and profile data
export interface EnhancedUserProfile extends UserProfile {
  designation?: string;
  custom_settings?: {
    display_name?: string;
    title?: string;
    department?: string;
    special_permissions?: string[];
  };
  last_profile_update?: string;
  updated_by?: string;
}

// Audit log entry for tracking profile changes
export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: 'profile_update' | 'role_change' | 'permission_change' | 'designation_change';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  performed_by: string;
  timestamp: string;
  ip_address?: string;
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

// Import Supabase client
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// JWT token management utilities
export class TokenManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // Check if token needs refresh
  static shouldRefreshToken(expiresAt?: number): boolean {
    if (!expiresAt) return true;
    const now = Date.now();
    const expirationTime = expiresAt * 1000; // Convert to milliseconds
    return (expirationTime - now) < this.TOKEN_REFRESH_THRESHOLD;
  }

  // Get current session with automatic refresh
  static async getValidSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Session error: ${error.message}`);
    }

    if (!session) {
      return null;
    }

    // Check if token needs refresh
    if (this.shouldRefreshToken(session.expires_at)) {
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError) {
        throw new Error(`Token refresh failed: ${refreshError.message}`);
      }
      
      return refreshedSession;
    }

    return session;
  }
}

// User profile management functions
export class UserProfileManager {
  // Get user profile from database
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    return data;
  }

  // Get enhanced user profile from database
  static async getEnhancedUserProfile(userId: string): Promise<EnhancedUserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw new Error(`Failed to fetch enhanced user profile: ${error.message}`);
    }

    return data as EnhancedUserProfile;
  }

  // Create user profile
  static async createUserProfile(profile: Omit<UserProfile, 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return data;
  }

  // Create enhanced user profile
  static async createEnhancedUserProfile(profile: Omit<EnhancedUserProfile, 'created_at' | 'updated_at'>): Promise<EnhancedUserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_profile_update: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create enhanced user profile: ${error.message}`);
    }

    return data as EnhancedUserProfile;
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return data;
  }

  // Update enhanced user profile
  static async updateEnhancedUserProfile(
    userId: string, 
    updates: Partial<EnhancedUserProfile>,
    updatedBy?: string
  ): Promise<EnhancedUserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        last_profile_update: new Date().toISOString(),
        updated_by: updatedBy || userId
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update enhanced user profile: ${error.message}`);
    }

    return data as EnhancedUserProfile;
  }

  // Get or create user profile
  static async getOrCreateUserProfile(supabaseUser: SupabaseUser): Promise<UserProfile> {
    let profile = await this.getUserProfile(supabaseUser.id);
    
    if (!profile) {
      // Create default profile for new user
      const defaultRole = UserRole.VIEWER; // Default role for new users
      profile = await this.createUserProfile({
        id: supabaseUser.id,
        role: defaultRole,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || null,
        active: true
      });
    }

    return profile;
  }

  // Get or create enhanced user profile with special user configuration
  static async getOrCreateEnhancedUserProfile(supabaseUser: SupabaseUser): Promise<EnhancedUserProfile> {
    let profile = await this.getEnhancedUserProfile(supabaseUser.id);
    
    if (!profile) {
      // Import special user configuration service
      const { SpecialUserConfigService } = await import('@/lib/config/specialUsers');
      
      // Check if this is a special user
      const specialConfig = SpecialUserConfigService.getConfigurationByEmail(supabaseUser.email || '');
      
      if (specialConfig) {
        // Create profile with special configuration
        profile = await this.createEnhancedUserProfile({
          id: supabaseUser.id,
          role: specialConfig.auto_settings.role,
          name: specialConfig.auto_settings.name,
          designation: specialConfig.auto_settings.designation,
          custom_settings: {
            special_permissions: specialConfig.auto_settings.custom_permissions
          },
          active: true,
          updated_by: 'system'
        });
      } else {
        // Create default enhanced profile for new user
        profile = await this.createEnhancedUserProfile({
          id: supabaseUser.id,
          role: UserRole.VIEWER,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || null,
          active: true,
          updated_by: supabaseUser.id
        });
      }
    }

    return profile;
  }
}

// Convert Supabase user to application User
function mapSupabaseUserToUser(supabaseUser: SupabaseUser, profile: UserProfile): User {
  const user: User = {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    role: profile.role,
    name: profile.name || undefined,
    active: profile.active,
    created_at: supabaseUser.created_at,
    updated_at: profile.updated_at,
    last_login: supabaseUser.last_sign_in_at || undefined,
    email_confirmed_at: supabaseUser.email_confirmed_at || undefined,
    phone: supabaseUser.phone || undefined,
    phone_confirmed_at: supabaseUser.phone_confirmed_at || undefined,
    app_metadata: supabaseUser.app_metadata,
    user_metadata: supabaseUser.user_metadata
  };

  // Add permissions based on role
  user.permissions = AuthorizationService.getUserPermissions(user);

  return user;
}

// Convert Supabase user to application User with enhanced profile data
function mapSupabaseUserToEnhancedUser(supabaseUser: SupabaseUser, profile: EnhancedUserProfile): User {
  const user: User = {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    role: profile.role,
    name: profile.name || undefined,
    designation: profile.designation,
    custom_settings: profile.custom_settings,
    last_profile_update: profile.last_profile_update,
    updated_by: profile.updated_by,
    active: profile.active,
    created_at: supabaseUser.created_at,
    updated_at: profile.updated_at,
    last_login: supabaseUser.last_sign_in_at || undefined,
    email_confirmed_at: supabaseUser.email_confirmed_at || undefined,
    phone: supabaseUser.phone || undefined,
    phone_confirmed_at: supabaseUser.phone_confirmed_at || undefined,
    app_metadata: supabaseUser.app_metadata,
    user_metadata: supabaseUser.user_metadata
  };

  // Add permissions based on role
  user.permissions = AuthorizationService.getUserPermissions(user);

  return user;
}

// Enhanced User API with Supabase Auth
export const User = {
  // Get current user with enhanced profile
  async me(): Promise<User> {
    const session = await TokenManager.getValidSession();
    
    if (!session?.user) {
      throw new Error('User not authenticated');
    }

    const profile = await UserProfileManager.getOrCreateEnhancedUserProfile(session.user);
    return mapSupabaseUserToEnhancedUser(session.user, profile);
  },

  // Login user with enhanced profile and special user configuration
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Login failed: No user returned');
    }

    const profile = await UserProfileManager.getOrCreateEnhancedUserProfile(data.user);
    return mapSupabaseUserToEnhancedUser(data.user, profile);
  },

  // Register new user with enhanced profile
  async register(email: string, password: string, name?: string): Promise<User> {
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

    if (!data.user) {
      throw new Error('Registration failed: No user returned');
    }

    // Create enhanced user profile with special user configuration check
    const profile = await UserProfileManager.getOrCreateEnhancedUserProfile(data.user);
    return mapSupabaseUserToEnhancedUser(data.user, profile);
  },

  // Logout user
  async logout(): Promise<boolean> {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }

    return true;
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await TokenManager.getValidSession();
      return !!session?.user;
    } catch {
      return false;
    }
  },

  // Get current user synchronously (from session cache)
  getCurrentUser(): User | null {
    // This method is kept for backward compatibility but should be avoided
    // Use me() instead for proper async handling
    console.warn('getCurrentUser() is deprecated. Use me() instead.');
    return null;
  },

  // Update user profile with enhanced profile support
  async updateProfile(updates: Partial<User>): Promise<User> {
    const session = await TokenManager.getValidSession();
    
    if (!session?.user) {
      throw new Error('User not authenticated');
    }

    // Update Supabase user metadata if needed
    if (updates.name || updates.user_metadata) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: updates.name,
          ...updates.user_metadata
        }
      });

      if (updateError) {
        throw new Error(`Failed to update user metadata: ${updateError.message}`);
      }
    }

    // Update enhanced user profile in database
    const profileUpdates: Partial<EnhancedUserProfile> = {};
    if (updates.name !== undefined) profileUpdates.name = updates.name;
    if (updates.role !== undefined) profileUpdates.role = updates.role;
    if (updates.active !== undefined) profileUpdates.active = updates.active;
    if (updates.designation !== undefined) profileUpdates.designation = updates.designation;
    if (updates.custom_settings !== undefined) profileUpdates.custom_settings = updates.custom_settings;

    if (Object.keys(profileUpdates).length > 0) {
      await UserProfileManager.updateEnhancedUserProfile(session.user.id, profileUpdates, session.user.id);
    }

    // Return updated user
    return this.me();
  },

  // Change user role (admin only)
  async changeUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    const currentUser = await this.me();
    
    if (!AuthorizationService.hasRole(currentUser, [UserRole.ADMIN])) {
      throw new Error('Access denied: Admin role required');
    }

    await UserProfileManager.updateUserProfile(userId, { role: newRole });
    return true;
  },

  // Reset password
  async resetPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }

    return true;
  },

  // Update password
  async updatePassword(newPassword: string): Promise<boolean> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(`Password update failed: ${error.message}`);
    }

    return true;
  },

  // Listen to auth state changes with enhanced profile support
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const profile = await UserProfileManager.getOrCreateEnhancedUserProfile(session.user);
          const user = mapSupabaseUserToEnhancedUser(session.user, profile);
          callback(user);
        } catch (error) {
          console.error('Error handling auth state change:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }
}; 
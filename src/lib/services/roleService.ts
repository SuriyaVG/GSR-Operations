import { supabase } from '@/lib/supabase';
import { 
  User, 
  UserRole, 
  AuthorizationService
} from '@/Entities/User';
import type { 
  AuditLogEntry,
  UserManagementData,
  Permission
} from '@/Entities/User';
import { toast } from '@/lib/toast';
import { AuditService } from '@/lib/services/auditService';
import { ErrorHandlingService } from '@/lib/services/errorHandlingService';

/**
 * Interface for role change request
 */
export interface RoleChangeRequest {
  userId: string;
  role: UserRole;
  reason?: string;
}

/**
 * Interface for bulk role change request
 */
export interface BulkRoleChangeRequest {
  users: RoleChangeRequest[];
  notifyUsers?: boolean;
}

/**
 * Interface for permission management
 */
export interface PermissionManagementRequest {
  userId: string;
  permissions: Permission[];
  operation: 'add' | 'remove' | 'replace';
}

/**
 * Role Service for administrative role management
 * Handles role assignment, permission management, validation, and audit logging
 */
export class RoleService {
  
  /**
   * Change a user's role with validation and audit logging
   * 
   * @param userId - ID of user whose role is being changed
   * @param newRole - New role to assign
   * @param adminId - ID of admin performing the change
   * @returns Promise<boolean> - Success status
   */
  static async changeUserRole(
    userId: string, 
    newRole: UserRole, 
    adminId: string
  ): Promise<boolean> {
    try {
      // Validate that the admin has permission to change roles
      const admin = await this.getCurrentUser(adminId);
      if (!AuthorizationService.hasRole(admin, [UserRole.ADMIN])) {
        throw new Error('Access denied: Admin role required to change user roles');
      }

      // Get current user profile to capture old values
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
      }

      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      // Validate the role change
      const isValidChange = await this.validateRoleChange(userId, newRole, currentProfile.role);
      if (!isValidChange) {
        throw new Error('Invalid role change: Role transition not allowed');
      }

      // Update the user's role
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
          updated_by: adminId
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update user role: ${updateError.message}`);
      }

      // Create audit log entry
      await AuditService.createAuditLog(
        userId,
        'role_change',
        { role: currentProfile.role },
        { role: newRole },
        adminId
      );

      // Notify user of role change (if they have an active session)
      await this.notifyUserOfRoleChange(userId, currentProfile.role, newRole);

      return true;
    } catch (error) {
      console.error('Error changing user role:', error);
      
      // Use error handling service for standardized error handling
      const recoverableError = ErrorHandlingService.handleRoleChangeError(error, {
        userId,
        entityId: adminId
      });
      
      // Ensure we have a valid error message
      const errorMessage = recoverableError?.message || 'Role change failed due to an unknown error';
      
      // Throw the error with enhanced context
      throw new Error(errorMessage);
    }
  }

  /**
   * Perform bulk role updates for multiple users
   * 
   * @param request - Bulk role change request object
   * @param adminId - ID of admin performing the changes
   * @returns Promise<{success: boolean, results: {userId: string, success: boolean, message?: string}[]}>
   */
  static async bulkRoleUpdate(
    request: BulkRoleChangeRequest | Array<{ userId: string; role: UserRole }>,
    adminId: string
  ): Promise<{
    success: boolean;
    results: Array<{
      userId: string;
      success: boolean;
      message?: string;
    }>;
  }> {
    try {
      // Handle legacy format for backward compatibility
      const updates = Array.isArray(request) 
        ? request.map(update => ({ userId: update.userId, role: update.role }))
        : request.users;
      
      const notifyUsers = !Array.isArray(request) && request.notifyUsers !== false;

      // Validate admin permissions
      const admin = await this.getCurrentUser(adminId);
      if (!AuthorizationService.hasRole(admin, [UserRole.ADMIN])) {
        throw new Error('Access denied: Admin role required for bulk role updates');
      }

      // Get current profiles for all users in a single query for efficiency
      const userIds = updates.map(update => update.userId);
      const { data: currentProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .in('id', userIds);

      if (profilesError) {
        throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
      }

      // Create a map of user IDs to current roles for quick lookup
      const userRoleMap = new Map<string, UserRole>();
      currentProfiles?.forEach(profile => {
        userRoleMap.set(profile.id, profile.role);
      });

      // Validate all role changes first
      const validationResults = await Promise.all(
        updates.map(async update => {
          try {
            const currentRole = userRoleMap.get(update.userId);
            
            if (!currentRole) {
              return {
                userId: update.userId,
                valid: false,
                message: `User profile not found for user: ${update.userId}`
              };
            }

            const isValid = await this.validateRoleChange(
              update.userId, 
              update.role, 
              currentRole
            );
            
            return {
              userId: update.userId,
              valid: isValid,
              message: isValid ? undefined : `Invalid role change: ${currentRole} -> ${update.role}`
            };
          } catch (error) {
            return {
              userId: update.userId,
              valid: false,
              message: error instanceof Error ? error.message : 'Unknown validation error'
            };
          }
        })
      );

      // Filter out invalid changes
      const invalidChanges = validationResults.filter(result => !result.valid);
      if (invalidChanges.length > 0) {
        console.warn('Some role changes are invalid:', invalidChanges);
      }

      // Only proceed with valid changes
      const validUpdates = updates.filter((_, index) => validationResults[index].valid);
      
      if (validUpdates.length === 0) {
        return {
          success: false,
          results: validationResults.map(result => ({
            userId: result.userId,
            success: false,
            message: result.message
          }))
        };
      }

      // Prepare batch update for efficiency
      const now = new Date().toISOString();
      const updateData = validUpdates.map(update => ({
        id: update.userId,
        role: update.role,
        updated_at: now,
        updated_by: adminId
      }));

      // Perform batch update
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert(updateData, { onConflict: 'id' });

      if (updateError) {
        throw new Error(`Bulk role update failed: ${updateError.message}`);
      }

      // Create audit log entries in batch
      await Promise.allSettled(
        validUpdates.map(update => 
          AuditService.createAuditLog(
            update.userId,
            'role_change',
            { role: userRoleMap.get(update.userId) },
            { role: update.role, reason: update.reason },
            adminId
          )
        )
      );

      // Notify users if requested
      if (notifyUsers) {
        await Promise.allSettled(
          validUpdates.map(update => 
            this.notifyUserOfRoleChange(
              update.userId, 
              userRoleMap.get(update.userId) as UserRole, 
              update.role
            )
          )
        );
      }

      // Prepare results
      const results = validationResults.map(result => ({
        userId: result.userId,
        success: result.valid,
        message: result.valid ? 'Role updated successfully' : result.message
      }));

      const allSuccessful = results.every(result => result.success);
      
      return {
        success: allSuccessful,
        results
      };
    } catch (error) {
      console.error('Error in bulk role update:', error);
      
      // Use error handling service for standardized error handling
      const recoverableError = ErrorHandlingService.handleRoleChangeError(error, {
        entityId: adminId,
        formData: { bulkUpdate: Array.isArray(request) ? request : request.users }
      });
      
      // Ensure we have a valid error message
      const errorMessage = recoverableError?.message || 'Bulk role update failed due to an unknown error';
      
      // Throw the error with enhanced context
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate if a role change is allowed
   * 
   * @param userId - User ID
   * @param newRole - Proposed new role
   * @param currentRole - Current role
   * @returns Promise<boolean> - Whether the change is valid
   */
  static async validateRoleChange(
    userId: string, 
    newRole: UserRole, 
    currentRole?: UserRole
  ): Promise<boolean> {
    try {
      // Basic validation: role must be different
      if (currentRole === newRole) {
        return false;
      }

      // Check if the new role is valid
      if (!Object.values(UserRole).includes(newRole)) {
        return false;
      }

      // Business rule: Cannot demote the last admin
      if (currentRole === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
        try {
          const adminCount = await this.getAdminCount();
          if (adminCount <= 1) {
            console.warn('Cannot demote the last admin user');
            return false;
          }
        } catch (err) {
          console.error('Error checking admin count:', err);
          return false;
        }
      }

      // Business rule: Rate limiting - check recent role changes for this user
      try {
        const recentChanges = await this.getRecentRoleChanges(userId, 24); // Last 24 hours
        if (recentChanges.length >= 3) {
          console.warn('Too many role changes in the last 24 hours');
          return false;
        }
      } catch (err) {
        console.error('Error checking recent role changes:', err);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating role change:', error);
      return false;
    }
  }

  /**
   * Get all users with their management data for admin interface
   * 
   * @param adminId - ID of admin requesting the data
   * @returns Promise<UserManagementData[]> - Array of user management data
   */
  static async getAllUsersForManagement(adminId: string): Promise<UserManagementData[]> {
    try {
      // Validate admin permissions
      const admin = await this.getCurrentUser(adminId);
      if (!AuthorizationService.hasRole(admin, [UserRole.ADMIN])) {
        throw new Error('Access denied: Admin role required to view user management data');
      }

      // Get all user profiles with auth data
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          role,
          name,
          designation,
          active,
          created_at,
          updated_at,
          custom_settings,
          auth.users!inner(email, last_sign_in_at)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user management data: ${error.message}`);
      }

      // Transform the data to match UserManagementData interface
      const managementData: UserManagementData[] = profiles.map(profile => ({
        id: profile.id,
        email: profile.auth?.users?.email || '',
        name: profile.name,
        role: profile.role,
        designation: profile.designation,
        active: profile.active,
        last_login: profile.auth?.users?.last_sign_in_at,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        custom_settings: profile.custom_settings
      }));

      return managementData;
    } catch (error) {
      console.error('Error fetching user management data:', error);
      throw error;
    }
  }

  /**
   * Get role change history for a user
   * 
   * @param userId - User ID to get history for
   * @param limit - Maximum number of entries to return
   * @returns Promise<AuditLogEntry[]> - Array of role change audit entries
   */
  static async getRoleChangeHistory(userId: string, limit: number = 20): Promise<AuditLogEntry[]> {
    try {
      const filter = {
        userId,
        action: 'role_change',
        limit
      };
      
      // Get current user for admin check
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Authentication required');
      }
      
      // Use AuditService to get filtered logs
      const logs = await AuditService.getAuditLogs(filter, currentUser.user.id);
      return logs.logs;
    } catch (error) {
      console.error('Error fetching role change history:', error);
      throw error;
    }
  }

  /**
   * Get count of users by role
   * 
   * @returns Promise<Record<UserRole, number>> - Count of users per role
   */
  static async getUserCountByRole(): Promise<Record<UserRole, number>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('active', true);

      if (error) {
        throw new Error(`Failed to fetch user role counts: ${error.message}`);
      }

      // Initialize counts for all roles
      const counts: Record<UserRole, number> = {
        [UserRole.ADMIN]: 0,
        [UserRole.PRODUCTION]: 0,
        [UserRole.SALES_MANAGER]: 0,
        [UserRole.FINANCE]: 0,
        [UserRole.VIEWER]: 0
      };

      // Count users by role
      data?.forEach(profile => {
        if (profile.role in counts) {
          counts[profile.role as UserRole]++;
        }
      });

      return counts;
    } catch (error) {
      console.error('Error getting user count by role:', error);
      throw error;
    }
  }

  /**
   * Manage custom permissions for a user
   * 
   * @param request - Permission management request
   * @param adminId - ID of admin performing the change
   * @returns Promise<boolean> - Success status
   */
  static async manageUserPermissions(
    request: PermissionManagementRequest,
    adminId: string
  ): Promise<boolean> {
    try {
      // Validate admin permissions
      const admin = await this.getCurrentUser(adminId);
      if (!AuthorizationService.hasRole(admin, [UserRole.ADMIN])) {
        throw new Error('Access denied: Admin role required to manage permissions');
      }

      // Get current user profile
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', request.userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
      }

      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      // Get current custom settings or initialize if not present
      const currentSettings = currentProfile.custom_settings || {};
      const currentPermissions = currentSettings.special_permissions || [];

      // Prepare new permissions based on operation
      let newPermissions: string[] = [];
      
      switch (request.operation) {
        case 'add':
          // Add new permissions without duplicates
          newPermissions = [
            ...currentPermissions,
            ...request.permissions.map(p => `${p.resource}:${p.action}`)
          ].filter((value, index, self) => self.indexOf(value) === index);
          break;
          
        case 'remove':
          // Remove specified permissions
          const permissionsToRemove = request.permissions.map(p => `${p.resource}:${p.action}`);
          newPermissions = currentPermissions.filter(p => !permissionsToRemove.includes(p));
          break;
          
        case 'replace':
          // Replace all permissions
          newPermissions = request.permissions.map(p => `${p.resource}:${p.action}`);
          break;
      }

      // Update custom settings with new permissions
      const updatedSettings = {
        ...currentSettings,
        special_permissions: newPermissions
      };

      // Update the user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          custom_settings: updatedSettings,
          updated_at: new Date().toISOString(),
          updated_by: adminId
        })
        .eq('id', request.userId);

      if (updateError) {
        throw new Error(`Failed to update user permissions: ${updateError.message}`);
      }

      // Create audit log entry
      await AuditService.createAuditLog(
        request.userId,
        'permission_change',
        { special_permissions: currentPermissions },
        { special_permissions: newPermissions },
        adminId
      );

      return true;
    } catch (error) {
      console.error('Error managing user permissions:', error);
      
      // Use error handling service for standardized error handling
      const recoverableError = ErrorHandlingService.handlePermissionError(error, {
        userId: request.userId,
        entityId: adminId,
        formData: { permissions: request.permissions, operation: request.operation }
      });
      
      // Ensure we have a valid error message
      const errorMessage = recoverableError?.message || 'Permission management failed due to an unknown error';
      
      // Throw the error with enhanced context
      throw new Error(errorMessage);
    }
  }

  /**
   * Get available permissions for a role
   * 
   * @param role - User role
   * @returns Permission[] - Array of permissions for the role
   */
  static getPermissionsForRole(role: UserRole): Permission[] {
    return AuthorizationService.getUserPermissions({ role } as User);
  }

  /**
   * Get custom permissions for a user
   * 
   * @param userId - User ID
   * @returns Promise<string[]> - Array of custom permission strings
   */
  static async getUserCustomPermissions(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('custom_settings')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch user custom permissions: ${error.message}`);
      }

      return data?.custom_settings?.special_permissions || [];
    } catch (error) {
      console.error('Error fetching user custom permissions:', error);
      return [];
    }
  }

  /**
   * Check if a user has a specific custom permission
   * 
   * @param userId - User ID
   * @param resource - Resource to check
   * @param action - Action to check
   * @returns Promise<boolean> - Whether the user has the permission
   */
  static async hasCustomPermission(
    userId: string,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
  ): Promise<boolean> {
    try {
      const customPermissions = await this.getUserCustomPermissions(userId);
      
      // Check for wildcard permissions
      if (customPermissions.includes('*') || 
          customPermissions.includes(`${resource}:*`) ||
          customPermissions.includes(`*:${action}`)) {
        return true;
      }

      // Check for specific permission
      return customPermissions.includes(`${resource}:${action}`);
    } catch (error) {
      console.error('Error checking custom permission:', error);
      return false;
    }
  }

  // Private helper methods

  /**
   * Get current user by ID
   */
  private static async getCurrentUser(userId: string): Promise<User> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('User not found');
    }

    // Get auth user data
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser.user) {
      throw new Error('Auth user not found');
    }

    return {
      id: profile.id,
      email: authUser.user.email!,
      role: profile.role,
      name: profile.name || undefined,
      designation: profile.designation,
      custom_settings: profile.custom_settings,
      active: profile.active,
      created_at: authUser.user.created_at,
      updated_at: profile.updated_at,
      last_login: authUser.user.last_sign_in_at || undefined
    };
  }

  /**
   * Get count of admin users
   */
  private static async getAdminCount(): Promise<number> {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', UserRole.ADMIN)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to count admin users: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get recent role changes for a user
   */
  private static async getRecentRoleChanges(userId: string, hoursBack: number): Promise<AuditLogEntry[]> {
    const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString();

    try {
      // Get current user for admin check
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return [];
      }
      
      const filter = {
        userId,
        action: 'role_change',
        fromDate: cutoffTime
      };
      
      const logs = await AuditService.getAuditLogs(filter, currentUser.user.id);
      return logs.logs;
    } catch (error) {
      console.error('Error fetching recent role changes:', error);
      return [];
    }
  }

  // Audit logging is now handled by AuditService

  /**
   * Notify user of role change through in-app notification and real-time update
   * 
   * @param userId - User ID
   * @param oldRole - Previous role
   * @param newRole - New role
   * @returns Promise<void>
   */
  private static async notifyUserOfRoleChange(
    userId: string, 
    oldRole: UserRole, 
    newRole: UserRole
  ): Promise<void> {
    try {
      // Create in-app notification
      const notification = {
        user_id: userId,
        type: 'role_change',
        title: 'Role Updated',
        message: `Your role has been changed from ${oldRole} to ${newRole}`,
        read: false,
        created_at: new Date().toISOString()
      };

      // Store notification in database
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notification);

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      // Send real-time update to user's active sessions
      const { error: broadcastError } = await supabase
        .from('role_updates')
        .insert({
          user_id: userId,
          old_role: oldRole,
          new_role: newRole,
          timestamp: new Date().toISOString()
        });

      if (broadcastError) {
        console.error('Failed to broadcast role update:', broadcastError);
      }

      // Log the notification
      console.log(`User ${userId} notified of role change from ${oldRole} to ${newRole}`);
    } catch (error) {
      console.error('Error notifying user of role change:', error);
      // Don't throw error as notification failure shouldn't block role change
    }
  }
  
  /**
   * Get all role-based permissions in the system
   * 
   * @returns Record<UserRole, Permission[]> - Map of roles to their permissions
   */
  static getAllRolePermissions(): Record<UserRole, Permission[]> {
    const allRoles = Object.values(UserRole);
    const permissionMap: Partial<Record<UserRole, Permission[]>> = {};
    
    allRoles.forEach(role => {
      permissionMap[role] = this.getPermissionsForRole(role);
    });
    
    return permissionMap as Record<UserRole, Permission[]>;
  }
}
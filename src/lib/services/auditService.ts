import { supabase } from '@/lib/supabase';
import type { AuditLogEntry } from '@/Entities/User';
import { UserRole, AuthorizationService } from '@/Entities/User';

/**
 * Filter options for audit log queries
 */
export interface AuditLogFilter {
  userId?: string;
  action?: AuditLogEntry['action'] | AuditLogEntry['action'][];
  performedBy?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit log entry with additional view data
 */
export interface AuditLogEntryWithNames extends AuditLogEntry {
  user_name?: string;
  performed_by_name?: string;
}

/**
 * Paginated audit log response
 */
export interface PaginatedAuditLog {
  logs: AuditLogEntryWithNames[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * AuditService - Handles audit logging operations
 * 
 * This service provides methods for:
 * - Creating audit log entries
 * - Retrieving and filtering audit logs
 * - Analyzing audit data
 */
export class AuditService {
  /**
   * Create an audit log entry
   * 
   * @param userId - User ID the action is performed on
   * @param action - Type of action
   * @param oldValues - Previous values
   * @param newValues - New values
   * @param performedBy - ID of user who performed the action
   * @param metadata - Additional metadata
   * @returns Promise<AuditLogEntry>
   */
  static async createAuditLog(
    userId: string,
    action: AuditLogEntry['action'],
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    performedBy: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    try {
      // Get client IP and user agent if available
      let ipAddress: string | undefined;
      let userAgent: string | undefined;
      
      if (typeof window !== 'undefined') {
        // In browser context
        userAgent = window.navigator.userAgent;
      }

      const auditEntry: Omit<AuditLogEntry, 'id'> & {
        ip_address?: string;
        user_agent?: string;
        metadata?: Record<string, any>;
      } = {
        user_id: userId,
        action,
        old_values: oldValues,
        new_values: newValues,
        performed_by: performedBy,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditEntry)
        .select()
        .single();

      if (error) {
        console.error('Failed to create audit log entry:', error);
        // Don't throw error here as audit logging shouldn't block the main operation
        return {
          id: 'temp-id',
          user_id: userId,
          action,
          old_values: oldValues,
          new_values: newValues,
          performed_by: performedBy,
          timestamp: new Date().toISOString()
        };
      }

      return data;
    } catch (error) {
      console.error('Error creating audit log entry:', error);
      // Return a temporary object in case of error
      return {
        id: 'temp-id',
        user_id: userId,
        action,
        old_values: oldValues,
        new_values: newValues,
        performed_by: performedBy,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get audit logs with filtering options
   * 
   * @param filter - Filter options
   * @param adminId - ID of admin requesting the logs
   * @returns Promise<PaginatedAuditLog>
   */
  static async getAuditLogs(
    filter: AuditLogFilter,
    adminId: string
  ): Promise<PaginatedAuditLog> {
    try {
      // Validate admin permissions
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', adminId)
        .single();

      if (adminError || !adminProfile || adminProfile.role !== UserRole.ADMIN) {
        throw new Error('Access denied: Admin role required to view audit logs');
      }

      // Set default pagination values
      const limit = filter.limit || 20;
      const offset = filter.offset || 0;
      const page = Math.floor(offset / limit) + 1;

      // Build query
      let query = supabase
        .from('vw_audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.action) {
        if (Array.isArray(filter.action)) {
          query = query.in('action', filter.action);
        } else {
          query = query.eq('action', filter.action);
        }
      }

      if (filter.performedBy) {
        query = query.eq('performed_by', filter.performedBy);
      }

      if (filter.fromDate) {
        query = query.gte('timestamp', filter.fromDate);
      }

      if (filter.toDate) {
        query = query.lte('timestamp', filter.toDate);
      }

      // Apply pagination
      query = query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      // Calculate total pages
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        logs: data || [],
        total,
        page,
        pageSize: limit,
        totalPages
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   * 
   * @param userId - User ID to get logs for
   * @param limit - Maximum number of logs to return
   * @returns Promise<AuditLogEntry[]>
   */
  static async getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      // Users can view their own audit logs, or admins can view any user's logs
      const { data: currentUserProfile, error: profileError } = await supabase.auth.getUser();
      
      if (profileError || !currentUserProfile.user) {
        throw new Error('Authentication required');
      }

      const currentUserId = currentUserProfile.user.id;
      
      // Check if current user is the requested user or an admin
      if (currentUserId !== userId) {
        const { data: adminCheck, error: adminError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', currentUserId)
          .single();

        if (adminError || !adminCheck || adminCheck.role !== UserRole.ADMIN) {
          throw new Error('Access denied: You can only view your own audit logs');
        }
      }

      // Fetch audit logs
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch user audit logs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      throw error;
    }
  }

  /**
   * Get recent activity for a user
   * 
   * @param userId - User ID to get activity for
   * @param limit - Maximum number of activities to return
   * @returns Promise<AuditLogEntry[]>
   */
  static async getUserRecentActivity(userId: string, limit: number = 10): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`user_id.eq.${userId},performed_by.eq.${userId}`)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch user activity: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  /**
   * Get audit log statistics
   * 
   * @param adminId - ID of admin requesting the stats
   * @returns Promise<Record<string, any>>
   */
  static async getAuditStats(adminId: string): Promise<Record<string, any>> {
    try {
      // Validate admin permissions
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', adminId)
        .single();

      if (adminError || !adminProfile || adminProfile.role !== UserRole.ADMIN) {
        throw new Error('Access denied: Admin role required to view audit statistics');
      }

      // Get action counts
      const { data: actionCounts, error: actionError } = await supabase
        .rpc('get_audit_action_counts');

      if (actionError) {
        throw new Error(`Failed to fetch audit action counts: ${actionError.message}`);
      }

      // Get recent activity count
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentCount, error: recentError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', thirtyDaysAgo.toISOString());

      if (recentError) {
        throw new Error(`Failed to fetch recent audit count: ${recentError.message}`);
      }

      // Get top users with most changes
      const { data: topUsers, error: topUsersError } = await supabase
        .from('vw_audit_logs')
        .select('performed_by, performed_by_name, count')
        .order('count', { ascending: false })
        .limit(5);

      if (topUsersError) {
        throw new Error(`Failed to fetch top users: ${topUsersError.message}`);
      }

      return {
        actionCounts: actionCounts || [],
        recentActivityCount: recentCount || 0,
        topUsers: topUsers || []
      };
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
      throw error;
    }
  }

  /**
   * Format audit log entry for display
   * 
   * @param entry - Audit log entry
   * @returns string
   */
  static formatAuditLogEntry(entry: AuditLogEntryWithNames): string {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const userName = entry.user_name || 'Unknown User';
    const performedByName = entry.performed_by_name || 'Unknown User';
    
    let actionDescription = '';
    switch (entry.action) {
      case 'profile_update':
        actionDescription = 'updated profile information';
        break;
      case 'role_change':
        const oldRole = entry.old_values.role;
        const newRole = entry.new_values.role;
        actionDescription = `changed role from ${oldRole} to ${newRole}`;
        break;
      case 'permission_change':
        actionDescription = 'modified permissions';
        break;
      case 'designation_change':
        const oldDesignation = entry.old_values.designation || 'none';
        const newDesignation = entry.new_values.designation || 'none';
        actionDescription = `changed designation from "${oldDesignation}" to "${newDesignation}"`;
        break;
      default:
        actionDescription = entry.action.replace('_', ' ');
    }

    return `${timestamp}: ${performedByName} ${actionDescription} for ${userName}`;
  }

  /**
   * Get detailed changes from audit log entry
   * 
   * @param entry - Audit log entry
   * @returns Array<{field: string, oldValue: any, newValue: any}>
   */
  static getDetailedChanges(entry: AuditLogEntry): Array<{field: string, oldValue: any, newValue: any}> {
    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
    
    // Combine all keys from both old and new values
    const allKeys = new Set([
      ...Object.keys(entry.old_values),
      ...Object.keys(entry.new_values)
    ]);
    
    allKeys.forEach(key => {
      const oldValue = entry.old_values[key];
      const newValue = entry.new_values[key];
      
      // Only add if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue
        });
      }
    });
    
    return changes;
  }
}

// Create stored procedure for audit action counts
export async function createAuditActionCountsFunction() {
  try {
    const { error } = await supabase.rpc('create_audit_functions', {});
    
    if (error) {
      console.error('Error creating audit functions:', error);
    }
  } catch (error) {
    console.error('Failed to create audit functions:', error);
  }
}

// SQL function to create (to be run once during setup)
/*
CREATE OR REPLACE FUNCTION get_audit_action_counts()
RETURNS TABLE (action text, count bigint) AS $
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.action::text,
    COUNT(*)::bigint
  FROM 
    audit_logs
  GROUP BY 
    audit_logs.action
  ORDER BY 
    count DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_audit_functions()
RETURNS void AS $
BEGIN
  -- Function already created in migration
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
*/
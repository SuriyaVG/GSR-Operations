import { supabase } from '@/lib/supabase';
import { AuditService } from './auditService';

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_ESCALATION_ATTEMPT = 'role_escalation_attempt',
  ROLE_ASSIGNMENT_CHANGE = 'role_assignment_change',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_CHANGE = 'password_change',
  SESSION_EXPIRED = 'session_expired',
  MULTIPLE_LOGIN_ATTEMPTS = 'multiple_login_attempts',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt'
}

/**
 * Security event details interface
 */
export interface SecurityEventDetails {
  eventType: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  attemptedRole?: string;
  userRole?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Failed login attempt tracking
 */
interface FailedLoginAttempt {
  email: string;
  ipAddress?: string;
  timestamp: Date;
  attempts: number;
}

/**
 * SecurityAuditService - Handles security-related audit logging
 * 
 * This service provides methods for:
 * - Logging authentication events (success/failure)
 * - Tracking unauthorized access attempts
 * - Monitoring suspicious activities
 * - Creating security audit trails
 */
export class SecurityAuditService {
  private static failedLoginAttempts: Map<string, FailedLoginAttempt> = new Map();
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Log a security event
   * 
   * @param details - Security event details
   * @returns Promise<void>
   */
  static async logSecurityEvent(details: SecurityEventDetails): Promise<void> {
    try {
      // Get client information if available
      const clientInfo = this.getClientInfo();
      
      const eventData = {
        event_type: details.eventType,
        user_id: details.userId || null,
        email: details.email || null,
        ip_address: details.ipAddress || clientInfo.ipAddress,
        user_agent: details.userAgent || clientInfo.userAgent,
        resource: details.resource || null,
        action: details.action || null,
        attempted_role: details.attemptedRole || null,
        user_role: details.userRole || null,
        error_message: details.errorMessage || null,
        metadata: details.metadata || {},
        timestamp: new Date().toISOString()
      };

      // Insert into security_audit_logs table
      const { error } = await supabase
        .from('security_audit_logs')
        .insert(eventData);

      if (error) {
        console.error('Failed to log security event:', error);
        // Don't throw error as security logging shouldn't block operations
      }

      // For critical security events, also create a regular audit log entry
      if (this.isCriticalSecurityEvent(details.eventType)) {
        await this.createCriticalSecurityAuditLog(details);
      }

    } catch (error) {
      console.error('Error logging security event:', error);
      // Security logging failures should not block the main operation
    }
  }

  /**
   * Log successful login
   * 
   * @param userId - User ID
   * @param email - User email
   * @returns Promise<void>
   */
  static async logLoginSuccess(userId: string, email: string): Promise<void> {
    // Clear any failed login attempts for this email
    this.clearFailedLoginAttempts(email);

    await this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      userId,
      email,
      metadata: {
        loginTime: new Date().toISOString()
      }
    });
  }

  /**
   * Log failed login attempt
   * 
   * @param email - Email used in failed attempt
   * @param errorMessage - Error message
   * @param ipAddress - IP address (optional)
   * @returns Promise<void>
   */
  static async logLoginFailure(email: string, errorMessage: string, ipAddress?: string): Promise<void> {
    // Track failed attempts
    const attemptKey = `${email}:${ipAddress || 'unknown'}`;
    const existingAttempt = this.failedLoginAttempts.get(attemptKey);
    
    if (existingAttempt) {
      existingAttempt.attempts += 1;
      existingAttempt.timestamp = new Date();
    } else {
      this.failedLoginAttempts.set(attemptKey, {
        email,
        ipAddress,
        timestamp: new Date(),
        attempts: 1
      });
    }

    const currentAttempts = this.failedLoginAttempts.get(attemptKey)!.attempts;

    await this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_FAILED,
      email,
      ipAddress,
      errorMessage,
      metadata: {
        attemptNumber: currentAttempts,
        isLocked: currentAttempts >= this.MAX_LOGIN_ATTEMPTS
      }
    });

    // Log multiple failed attempts as suspicious activity
    if (currentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      await this.logSecurityEvent({
        eventType: SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS,
        email,
        ipAddress,
        errorMessage: `Account locked after ${currentAttempts} failed attempts`,
        metadata: {
          totalAttempts: currentAttempts,
          lockoutDuration: this.LOCKOUT_DURATION
        }
      });
    }
  }

  /**
   * Log logout event
   * 
   * @param userId - User ID
   * @param email - User email
   * @returns Promise<void>
   */
  static async logLogout(userId: string, email: string): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.LOGOUT,
      userId,
      email,
      metadata: {
        logoutTime: new Date().toISOString()
      }
    });
  }

  /**
   * Log unauthorized access attempt
   * 
   * @param userId - User ID attempting access
   * @param resource - Resource being accessed
   * @param action - Action being attempted
   * @param userRole - User's current role
   * @param requiredRole - Required role for access
   * @returns Promise<void>
   */
  static async logUnauthorizedAccess(
    userId: string,
    resource: string,
    action: string,
    userRole?: string,
    requiredRole?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      userId,
      resource,
      action,
      userRole,
      attemptedRole: requiredRole,
      metadata: {
        accessDeniedReason: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log permission denied event
   * 
   * @param userId - User ID
   * @param resource - Resource being accessed
   * @param action - Action being attempted
   * @param reason - Reason for denial
   * @returns Promise<void>
   */
  static async logPermissionDenied(
    userId: string,
    resource: string,
    action: string,
    reason: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.PERMISSION_DENIED,
      userId,
      resource,
      action,
      errorMessage: reason,
      metadata: {
        denialReason: reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log role escalation attempt
   * 
   * @param userId - User ID attempting escalation
   * @param userRole - Current role
   * @param attemptedRole - Role being attempted
   * @param resource - Resource context
   * @returns Promise<void>
   */
  static async logRoleEscalationAttempt(
    userId: string,
    userRole: string,
    attemptedRole: string,
    resource?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.ROLE_ESCALATION_ATTEMPT,
      userId,
      userRole,
      attemptedRole,
      resource,
      metadata: {
        escalationAttempt: true,
        severity: 'HIGH',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log password reset request
   * 
   * @param email - Email requesting reset
   * @returns Promise<void>
   */
  static async logPasswordResetRequest(email: string): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
      email,
      metadata: {
        requestTime: new Date().toISOString()
      }
    });
  }

  /**
   * Log password change
   * 
   * @param userId - User ID
   * @param email - User email
   * @returns Promise<void>
   */
  static async logPasswordChange(userId: string, email: string): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_CHANGE,
      userId,
      email,
      metadata: {
        changeTime: new Date().toISOString()
      }
    });
  }

  /**
   * Log role assignment change
   * 
   * @param adminId - Admin performing the change
   * @param targetUserId - User whose role is being changed
   * @param oldRole - Previous role
   * @param newRole - New role
   * @param reason - Optional reason for change
   * @returns Promise<void>
   */
  static async logRoleAssignmentChange(
    adminId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    reason?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.ROLE_ASSIGNMENT_CHANGE,
      userId: adminId,
      resource: 'user_role',
      action: 'update',
      metadata: {
        targetUserId,
        oldRole,
        newRole,
        reason,
        changeTime: new Date().toISOString(),
        severity: 'HIGH'
      }
    });
  }

  /**
   * Log authentication failure (general)
   * 
   * @param email - Email used in failed attempt
   * @param reason - Reason for failure
   * @param ipAddress - IP address (optional)
   * @returns Promise<void>
   */
  static async logAuthenticationFailure(
    email: string,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.AUTHENTICATION_FAILURE,
      email,
      ipAddress,
      errorMessage: reason,
      metadata: {
        failureReason: reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log session expired event
   * 
   * @param userId - User ID
   * @param email - User email
   * @param reason - Reason for expiration
   * @returns Promise<void>
   */
  static async logSessionExpired(
    userId: string,
    email: string,
    reason: string = 'Session timeout'
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SESSION_EXPIRED,
      userId,
      email,
      metadata: {
        expirationReason: reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log suspicious activity
   * 
   * @param userId - User ID (if known)
   * @param activity - Description of suspicious activity
   * @param ipAddress - IP address
   * @param metadata - Additional metadata
   * @returns Promise<void>
   */
  static async logSuspiciousActivity(
    userId: string | undefined,
    activity: string,
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ipAddress,
      errorMessage: activity,
      metadata: {
        activity,
        severity: 'HIGH',
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Log potential session hijack attempt
   * 
   * @param userId - User ID
   * @param suspiciousIp - Suspicious IP address
   * @param userAgent - User agent string
   * @param reason - Reason for suspicion
   * @returns Promise<void>
   */
  static async logSessionHijackAttempt(
    userId: string,
    suspiciousIp: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SESSION_HIJACK_ATTEMPT,
      userId,
      ipAddress: suspiciousIp,
      userAgent,
      errorMessage: reason || 'Potential session hijack detected',
      metadata: {
        suspiciousIp,
        reason,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log brute force attempt
   * 
   * @param email - Target email
   * @param ipAddress - Source IP address
   * @param attemptCount - Number of attempts
   * @returns Promise<void>
   */
  static async logBruteForceAttempt(
    email: string,
    ipAddress: string,
    attemptCount: number
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      email,
      ipAddress,
      errorMessage: `Brute force attack detected: ${attemptCount} attempts`,
      metadata: {
        attemptCount,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Check if an email/IP combination is locked out
   * 
   * @param email - Email to check
   * @param ipAddress - IP address to check
   * @returns boolean
   */
  static isLockedOut(email: string, ipAddress?: string): boolean {
    const attemptKey = `${email}:${ipAddress || 'unknown'}`;
    const attempt = this.failedLoginAttempts.get(attemptKey);
    
    if (!attempt || attempt.attempts < this.MAX_LOGIN_ATTEMPTS) {
      return false;
    }

    // Check if lockout period has expired
    const timeSinceLastAttempt = Date.now() - attempt.timestamp.getTime();
    if (timeSinceLastAttempt > this.LOCKOUT_DURATION) {
      this.failedLoginAttempts.delete(attemptKey);
      return false;
    }

    return true;
  }

  /**
   * Get remaining lockout time
   * 
   * @param email - Email to check
   * @param ipAddress - IP address to check
   * @returns number (milliseconds remaining)
   */
  static getRemainingLockoutTime(email: string, ipAddress?: string): number {
    const attemptKey = `${email}:${ipAddress || 'unknown'}`;
    const attempt = this.failedLoginAttempts.get(attemptKey);
    
    if (!attempt || attempt.attempts < this.MAX_LOGIN_ATTEMPTS) {
      return 0;
    }

    const timeSinceLastAttempt = Date.now() - attempt.timestamp.getTime();
    const remainingTime = this.LOCKOUT_DURATION - timeSinceLastAttempt;
    
    return Math.max(0, remainingTime);
  }

  /**
   * Clear failed login attempts for an email
   * 
   * @param email - Email to clear attempts for
   */
  private static clearFailedLoginAttempts(email: string): void {
    // Remove all attempts for this email (regardless of IP)
    const keysToDelete = Array.from(this.failedLoginAttempts.keys())
      .filter(key => key.startsWith(`${email}:`));
    
    keysToDelete.forEach(key => {
      this.failedLoginAttempts.delete(key);
    });
  }

  /**
   * Get client information (IP, User Agent)
   * 
   * @returns Object with client info
   */
  private static getClientInfo(): { ipAddress?: string; userAgent?: string } {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    
    if (typeof window !== 'undefined') {
      userAgent = window.navigator.userAgent;
      // Note: Getting real IP address requires server-side implementation
      // For now, we'll rely on the caller to provide it
    }

    return { ipAddress, userAgent };
  }

  /**
   * Check if a security event is critical
   * 
   * @param eventType - Security event type
   * @returns boolean
   */
  private static isCriticalSecurityEvent(eventType: SecurityEventType): boolean {
    const criticalEvents = [
      SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      SecurityEventType.ROLE_ESCALATION_ATTEMPT,
      SecurityEventType.ROLE_ASSIGNMENT_CHANGE,
      SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.SESSION_HIJACK_ATTEMPT,
      SecurityEventType.BRUTE_FORCE_ATTEMPT
    ];
    
    return criticalEvents.includes(eventType);
  }

  /**
   * Create a critical security audit log entry
   * 
   * @param details - Security event details
   * @returns Promise<void>
   */
  private static async createCriticalSecurityAuditLog(details: SecurityEventDetails): Promise<void> {
    if (!details.userId) return;

    try {
      await AuditService.createAuditLog(
        details.userId,
        'security_event' as any, // Extend audit log actions if needed
        {},
        {
          eventType: details.eventType,
          resource: details.resource,
          action: details.action,
          severity: 'CRITICAL'
        },
        details.userId, // Self-performed for security events
        details.metadata
      );
    } catch (error) {
      console.error('Failed to create critical security audit log:', error);
    }
  }

  /**
   * Get security event statistics
   * 
   * @param adminId - Admin user ID requesting stats
   * @param timeRange - Time range in hours (default: 24)
   * @returns Promise<Record<string, any>>
   */
  static async getSecurityStats(adminId: string, timeRange: number = 24): Promise<Record<string, any>> {
    try {
      // Validate admin permissions
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', adminId)
        .single();

      if (adminError || !adminProfile || adminProfile.role !== 'admin') {
        throw new Error('Access denied: Admin role required to view security statistics');
      }

      const timeThreshold = new Date();
      timeThreshold.setHours(timeThreshold.getHours() - timeRange);

      // Get event counts by type
      const { data: eventCounts, error: eventError } = await supabase
        .from('security_audit_logs')
        .select('event_type')
        .gte('timestamp', timeThreshold.toISOString());

      if (eventError) {
        throw new Error(`Failed to fetch security events: ${eventError.message}`);
      }

      // Count events by type
      const eventStats = (eventCounts || []).reduce((acc: Record<string, number>, event: any) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {});

      // Get failed login attempts
      const failedLogins = eventStats[SecurityEventType.LOGIN_FAILED] || 0;
      const successfulLogins = eventStats[SecurityEventType.LOGIN_SUCCESS] || 0;
      const unauthorizedAttempts = eventStats[SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT] || 0;

      return {
        timeRange: `${timeRange} hours`,
        totalEvents: eventCounts?.length || 0,
        eventBreakdown: eventStats,
        securityMetrics: {
          failedLogins,
          successfulLogins,
          loginSuccessRate: successfulLogins > 0 ? 
            ((successfulLogins / (successfulLogins + failedLogins)) * 100).toFixed(2) + '%' : 
            '0%',
          unauthorizedAttempts,
          criticalEvents: (eventStats[SecurityEventType.ROLE_ESCALATION_ATTEMPT] || 0) +
                         (eventStats[SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS] || 0) +
                         unauthorizedAttempts
        },
        currentLockouts: this.failedLoginAttempts.size
      };
    } catch (error) {
      console.error('Error fetching security statistics:', error);
      throw error;
    }
  }
}
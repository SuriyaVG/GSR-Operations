import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityAuditService, SecurityEventType } from '../securityAuditService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('SecurityAuditService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup
    mockSupabaseFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-log-id' },
            error: null
          })
        })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null
          })
        }),
        gte: vi.fn().mockResolvedValue({
          data: [{ event_type: 'login_success' }],
          error: null
        })
      })
    } as any);
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const eventDetails = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'test-user-id',
        email: 'test@example.com',
        metadata: { test: true }
      };

      await SecurityAuditService.logSecurityEvent(eventDetails);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });

    it('should handle logging errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      } as any);

      const eventDetails = {
        eventType: SecurityEventType.LOGIN_FAILED,
        email: 'test@example.com'
      };

      // Should not throw error
      await expect(SecurityAuditService.logSecurityEvent(eventDetails)).resolves.not.toThrow();
    });
  });

  describe('logLoginSuccess', () => {
    it('should log successful login', async () => {
      await SecurityAuditService.logLoginSuccess('user-id', 'user@example.com');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logLoginFailure', () => {
    it('should log failed login attempt', async () => {
      await SecurityAuditService.logLoginFailure('user@example.com', 'Invalid credentials', '192.168.1.1');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });

    it('should track multiple failed attempts', async () => {
      // First attempt
      await SecurityAuditService.logLoginFailure('user@example.com', 'Invalid credentials', '192.168.1.1');
      
      // Second attempt
      await SecurityAuditService.logLoginFailure('user@example.com', 'Invalid credentials', '192.168.1.1');

      expect(mockSupabaseFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe('logUnauthorizedAccess', () => {
    it('should log unauthorized access attempt', async () => {
      await SecurityAuditService.logUnauthorizedAccess(
        'user-id',
        'admin_panel',
        'read',
        'viewer',
        'admin'
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logPermissionDenied', () => {
    it('should log permission denied event', async () => {
      await SecurityAuditService.logPermissionDenied(
        'user-id',
        'financial_data',
        'read',
        'Insufficient permissions'
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logRoleEscalationAttempt', () => {
    it('should log role escalation attempt', async () => {
      await SecurityAuditService.logRoleEscalationAttempt(
        'user-id',
        'viewer',
        'admin',
        'user_management'
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logRoleAssignmentChange', () => {
    it('should log role assignment change', async () => {
      await SecurityAuditService.logRoleAssignmentChange(
        'admin-id',
        'target-user-id',
        'viewer',
        'production',
        'Promotion to production role'
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logPasswordResetRequest', () => {
    it('should log password reset request', async () => {
      await SecurityAuditService.logPasswordResetRequest('user@example.com');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logPasswordChange', () => {
    it('should log password change', async () => {
      await SecurityAuditService.logPasswordChange('user-id', 'user@example.com');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity', async () => {
      await SecurityAuditService.logSuspiciousActivity(
        'user-id',
        'Multiple rapid login attempts',
        '192.168.1.1',
        { severity: 'HIGH' }
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_audit_logs');
    });
  });

  describe('isLockedOut', () => {
    it('should return false for users with no failed attempts', () => {
      const isLocked = SecurityAuditService.isLockedOut('user@example.com');
      expect(isLocked).toBe(false);
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics for admin users', async () => {
      const stats = await SecurityAuditService.getSecurityStats('admin-id', 24);

      expect(stats).toHaveProperty('timeRange');
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('eventBreakdown');
      expect(stats).toHaveProperty('securityMetrics');
    });

    it('should throw error for non-admin users', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'viewer' },
              error: null
            })
          })
        })
      } as any);

      await expect(SecurityAuditService.getSecurityStats('user-id', 24))
        .rejects.toThrow('Access denied: Admin role required');
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../auditService';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/Entities/User';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      // Mock successful response
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'audit-1',
                user_id: 'user-1',
                action: 'profile_update',
                old_values: { name: 'Old Name' },
                new_values: { name: 'New Name' },
                performed_by: 'admin-1',
                timestamp: '2025-01-01T12:00:00Z'
              },
              error: null
            })
          })
        })
      });

      const result = await AuditService.createAuditLog(
        'user-1',
        'profile_update',
        { name: 'Old Name' },
        { name: 'New Name' },
        'admin-1'
      );

      expect(supabase.from).toHaveBeenCalledWith('audit_logs');
      expect(result).toEqual({
        id: 'audit-1',
        user_id: 'user-1',
        action: 'profile_update',
        old_values: { name: 'Old Name' },
        new_values: { name: 'New Name' },
        performed_by: 'admin-1',
        timestamp: '2025-01-01T12:00:00Z'
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock error response
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await AuditService.createAuditLog(
        'user-1',
        'profile_update',
        { name: 'Old Name' },
        { name: 'New Name' },
        'admin-1'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create audit log entry:',
        { message: 'Database error' }
      );
      
      expect(result).toEqual({
        id: 'temp-id',
        user_id: 'user-1',
        action: 'profile_update',
        old_values: { name: 'Old Name' },
        new_values: { name: 'New Name' },
        performed_by: 'admin-1',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should fetch audit logs with filtering', async () => {
      // Mock admin check
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: UserRole.ADMIN },
              error: null
            })
          })
        })
      });

      // Mock audit logs query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'audit-1',
                    user_id: 'user-1',
                    user_name: 'Test User',
                    action: 'profile_update',
                    old_values: { name: 'Old Name' },
                    new_values: { name: 'New Name' },
                    performed_by: 'admin-1',
                    performed_by_name: 'Admin User',
                    timestamp: '2025-01-01T12:00:00Z'
                  }
                ],
                error: null,
                count: 1
              })
            })
          })
        })
      });

      const result = await AuditService.getAuditLogs(
        { userId: 'user-1', limit: 10, offset: 0 },
        'admin-1'
      );

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(supabase.from).toHaveBeenCalledWith('vw_audit_logs');
      expect(result).toEqual({
        logs: [
          {
            id: 'audit-1',
            user_id: 'user-1',
            user_name: 'Test User',
            action: 'profile_update',
            old_values: { name: 'Old Name' },
            new_values: { name: 'New Name' },
            performed_by: 'admin-1',
            performed_by_name: 'Admin User',
            timestamp: '2025-01-01T12:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      });
    });

    it('should reject non-admin users', async () => {
      // Mock non-admin check
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: UserRole.VIEWER },
              error: null
            })
          })
        })
      });

      await expect(
        AuditService.getAuditLogs({ limit: 10, offset: 0 }, 'viewer-1')
      ).rejects.toThrow('Access denied: Admin role required to view audit logs');
    });
  });

  describe('getUserAuditLogs', () => {
    it('should fetch audit logs for a specific user', async () => {
      // Mock auth check
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      });

      // Mock audit logs query
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'audit-1',
                    user_id: 'user-1',
                    action: 'profile_update',
                    old_values: { name: 'Old Name' },
                    new_values: { name: 'New Name' },
                    performed_by: 'user-1',
                    timestamp: '2025-01-01T12:00:00Z'
                  }
                ],
                error: null
              })
            })
          })
        })
      });

      const result = await AuditService.getUserAuditLogs('user-1');

      expect(supabase.from).toHaveBeenCalledWith('audit_logs');
      expect(result).toEqual([
        {
          id: 'audit-1',
          user_id: 'user-1',
          action: 'profile_update',
          old_values: { name: 'Old Name' },
          new_values: { name: 'New Name' },
          performed_by: 'user-1',
          timestamp: '2025-01-01T12:00:00Z'
        }
      ]);
    });
  });

  describe('formatAuditLogEntry', () => {
    it('should format profile update entry', () => {
      const entry = {
        id: 'audit-1',
        user_id: 'user-1',
        user_name: 'Test User',
        action: 'profile_update',
        old_values: { name: 'Old Name' },
        new_values: { name: 'New Name' },
        performed_by: 'admin-1',
        performed_by_name: 'Admin User',
        timestamp: '2025-01-01T12:00:00Z'
      };

      const result = AuditService.formatAuditLogEntry(entry);
      expect(result).toContain('Admin User updated profile information for Test User');
    });

    it('should format role change entry', () => {
      const entry = {
        id: 'audit-1',
        user_id: 'user-1',
        user_name: 'Test User',
        action: 'role_change',
        old_values: { role: 'viewer' },
        new_values: { role: 'admin' },
        performed_by: 'admin-1',
        performed_by_name: 'Admin User',
        timestamp: '2025-01-01T12:00:00Z'
      };

      const result = AuditService.formatAuditLogEntry(entry);
      expect(result).toContain('Admin User changed role from viewer to admin for Test User');
    });
  });

  describe('getDetailedChanges', () => {
    it('should extract changes from audit log entry', () => {
      const entry = {
        id: 'audit-1',
        user_id: 'user-1',
        action: 'profile_update',
        old_values: { 
          name: 'Old Name',
          designation: 'Old Designation',
          active: true
        },
        new_values: { 
          name: 'New Name',
          designation: 'New Designation',
          active: true
        },
        performed_by: 'admin-1',
        timestamp: '2025-01-01T12:00:00Z'
      };

      const changes = AuditService.getDetailedChanges(entry);
      
      expect(changes).toEqual([
        { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
        { field: 'designation', oldValue: 'Old Designation', newValue: 'New Designation' }
      ]);
      
      // Should not include fields that didn't change
      expect(changes.find(c => c.field === 'active')).toBeUndefined();
    });
  });
});
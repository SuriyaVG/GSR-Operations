import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../auditService';
import { UserProfileService } from '../userProfileService';
import { RoleService } from '../roleService';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/Entities/User';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
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

// Mock toast
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Audit Logging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UserProfileService integration', () => {
    it('should create audit logs when updating user profile', async () => {
      // Mock AuditService.createAuditLog
      const createAuditLogSpy = vi.spyOn(AuditService, 'createAuditLog').mockResolvedValue({
        id: 'audit-1',
        user_id: 'user-1',
        action: 'profile_update',
        old_values: { name: 'Old Name' },
        new_values: { name: 'New Name' },
        performed_by: 'admin-1',
        timestamp: '2025-01-01T12:00:00Z'
      });

      // Mock UserProfileManager.getEnhancedUserProfile
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-1',
                name: 'Old Name',
                role: UserRole.VIEWER,
                active: true
              },
              error: null
            })
          })
        })
      });

      // Mock UserProfileManager.updateEnhancedUserProfile
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-1',
                  name: 'New Name',
                  role: UserRole.VIEWER,
                  active: true
                },
                error: null
              })
            })
          })
        })
      });

      // Mock supabase.auth.getUser
      (supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com'
          }
        },
        error: null
      });

      // Call updateProfile
      await UserProfileService.updateProfile('user-1', { name: 'New Name' }, 'admin-1');

      // Verify audit log was created
      expect(createAuditLogSpy).toHaveBeenCalledWith(
        'user-1',
        'profile_update',
        expect.objectContaining({ name: 'Old Name' }),
        expect.objectContaining({ name: 'New Name' }),
        'admin-1'
      );
    });
  });

  describe('RoleService integration', () => {
    it('should create audit logs when changing user role', async () => {
      // Mock AuditService.createAuditLog
      const createAuditLogSpy = vi.spyOn(AuditService, 'createAuditLog').mockResolvedValue({
        id: 'audit-1',
        user_id: 'user-1',
        action: 'role_change',
        old_values: { role: UserRole.VIEWER },
        new_values: { role: UserRole.FINANCE },
        performed_by: 'admin-1',
        timestamp: '2025-01-01T12:00:00Z'
      });

      // Mock getCurrentUser
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'admin-1',
                role: UserRole.ADMIN
              },
              error: null
            })
          })
        })
      });

      // Mock auth.admin.getUserById
      (supabase.auth as any).admin = {
        getUserById: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'admin-1',
              email: 'admin@example.com'
            }
          },
          error: null
        })
      };

      // Mock get current user profile
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-1',
                role: UserRole.VIEWER
              },
              error: null
            })
          })
        })
      });

      // Mock validateRoleChange
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              head: vi.fn().mockResolvedValue({
                count: 2,
                error: null
              })
            })
          })
        })
      });

      // Mock update user role
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-1',
                  role: UserRole.FINANCE
                },
                error: null
              })
            })
          })
        })
      });

      // Mock notifyUserOfRoleChange
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          error: null
        })
      });

      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          error: null
        })
      });

      // Call changeUserRole
      await RoleService.changeUserRole('user-1', UserRole.FINANCE, 'admin-1');

      // Verify audit log was created
      expect(createAuditLogSpy).toHaveBeenCalledWith(
        'user-1',
        'role_change',
        { role: UserRole.VIEWER },
        { role: UserRole.FINANCE },
        'admin-1'
      );
    });
  });

  describe('AuditService', () => {
    it('should format audit log entries correctly', () => {
      const entry = {
        id: 'audit-1',
        user_id: 'user-1',
        user_name: 'Test User',
        action: 'role_change',
        old_values: { role: UserRole.VIEWER },
        new_values: { role: UserRole.FINANCE },
        performed_by: 'admin-1',
        performed_by_name: 'Admin User',
        timestamp: '2025-01-01T12:00:00Z'
      };

      const formatted = AuditService.formatAuditLogEntry(entry);
      expect(formatted).toContain('Admin User changed role from viewer to finance for Test User');
    });

    it('should extract detailed changes correctly', () => {
      const entry = {
        id: 'audit-1',
        user_id: 'user-1',
        action: 'profile_update',
        old_values: {
          name: 'Old Name',
          designation: 'Old Designation',
          custom_settings: {
            display_name: 'Old Display'
          }
        },
        new_values: {
          name: 'New Name',
          designation: 'New Designation',
          custom_settings: {
            display_name: 'New Display'
          }
        },
        performed_by: 'admin-1',
        timestamp: '2025-01-01T12:00:00Z'
      };

      const changes = AuditService.getDetailedChanges(entry);
      
      expect(changes).toHaveLength(3);
      expect(changes).toContainEqual({
        field: 'name',
        oldValue: 'Old Name',
        newValue: 'New Name'
      });
      expect(changes).toContainEqual({
        field: 'designation',
        oldValue: 'Old Designation',
        newValue: 'New Designation'
      });
      expect(changes).toContainEqual({
        field: 'custom_settings',
        oldValue: { display_name: 'Old Display' },
        newValue: { display_name: 'New Display' }
      });
    });
  });
});
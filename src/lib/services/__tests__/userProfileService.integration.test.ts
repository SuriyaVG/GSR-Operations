import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserProfileService } from '../userProfileService';
import { UserRole, UserProfileManager } from '@/Entities/User';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn()
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock toast
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('UserProfileService Integration Tests', () => {
  const mockUserId = 'test-user-id';
  const mockCurrentProfile = {
    id: mockUserId,
    role: UserRole.VIEWER,
    name: 'John Doe',
    designation: 'Employee',
    custom_settings: {
      display_name: 'Johnny',
      title: 'Junior Employee',
      department: 'Operations'
    },
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_profile_update: '2024-01-01T00:00:00Z',
    updated_by: mockUserId
  };

  const mockSupabaseUser = {
    id: mockUserId,
    email: 'john.doe@example.com',
    created_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-01T12:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    phone: null,
    phone_confirmed_at: null,
    app_metadata: {},
    user_metadata: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock UserProfileManager methods
    vi.spyOn(UserProfileManager, 'getEnhancedUserProfile').mockResolvedValue(mockCurrentProfile);
    vi.spyOn(UserProfileManager, 'updateEnhancedUserProfile').mockImplementation(
      async (userId, updates) => ({
        ...mockCurrentProfile,
        ...updates,
        updated_at: new Date().toISOString(),
        last_profile_update: new Date().toISOString()
      })
    );
    vi.spyOn(UserProfileManager, 'createEnhancedUserProfile').mockImplementation(
      async (profile) => ({
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_profile_update: new Date().toISOString()
      })
    );

    // Mock Supabase auth
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null
    });

    // Mock Supabase audit log insertion
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'audit-log-id',
              user_id: mockUserId,
              action: 'profile_update',
              old_values: {},
              new_values: {},
              performed_by: mockUserId,
              timestamp: new Date().toISOString()
            },
            error: null
          })
        })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateProfile', () => {
    it('should successfully update user profile with valid data', async () => {
      const updates = {
        name: 'John Smith',
        designation: 'Senior Employee',
        custom_settings: {
          display_name: 'Johnny Smith',
          title: 'Senior Operations Specialist',
          department: 'Operations'
        }
      };

      const result = await UserProfileService.updateProfile(mockUserId, updates);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.name).toBe('John Smith');
      expect(result.user?.designation).toBe('Senior Employee');
      expect(result.message).toBe('Profile updated successfully');

      // Verify UserProfileManager was called correctly
      expect(UserProfileManager.getEnhancedUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(UserProfileManager.updateEnhancedUserProfile).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          name: 'John Smith',
          designation: 'Senior Employee',
          custom_settings: expect.objectContaining({
            display_name: 'Johnny Smith',
            title: 'Senior Operations Specialist',
            department: 'Operations'
          })
        }),
        mockUserId
      );
    });

    it('should handle validation errors', async () => {
      const updates = {
        name: 'A' // Too short
      };

      const result = await UserProfileService.updateProfile(mockUserId, updates);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].field).toBe('name');
      expect(result.message).toBe('Profile validation failed');

      // Verify UserProfileManager was not called for update
      expect(UserProfileManager.updateEnhancedUserProfile).not.toHaveBeenCalled();
    });

    it('should handle missing user profile', async () => {
      vi.spyOn(UserProfileManager, 'getEnhancedUserProfile').mockResolvedValue(null);

      const updates = {
        name: 'John Smith'
      };

      const result = await UserProfileService.updateProfile(mockUserId, updates);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User profile not found');
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(UserProfileManager, 'updateEnhancedUserProfile').mockRejectedValue(
        new Error('Database connection failed')
      );

      const updates = {
        name: 'John Smith'
      };

      const result = await UserProfileService.updateProfile(mockUserId, updates);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network connection issue');
    });
  });

  describe('createEnhancedProfileWithSpecialConfig', () => {
    it('should create profile with special configuration for special user', async () => {
      const specialEmail = 'suriyavg834@gmail.com';
      
      const result = await UserProfileService.createEnhancedProfileWithSpecialConfig(
        mockUserId,
        specialEmail,
        'Default Name'
      );

      expect(result).toBeDefined();
      expect(UserProfileManager.createEnhancedUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUserId,
          role: UserRole.ADMIN,
          name: 'Suriya',
          designation: 'CEO',
          custom_settings: {
            special_permissions: ['*']
          },
          active: true,
          updated_by: 'system'
        })
      );
    });

    it('should create default profile for regular user', async () => {
      const regularEmail = 'regular@example.com';
      
      const result = await UserProfileService.createEnhancedProfileWithSpecialConfig(
        mockUserId,
        regularEmail,
        'Default Name'
      );

      expect(result).toBeDefined();
      expect(UserProfileManager.createEnhancedUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUserId,
          role: UserRole.VIEWER,
          name: 'Default Name',
          active: true,
          updated_by: mockUserId
        })
      );
    });

    it('should use email prefix as default name when no default name provided', async () => {
      const regularEmail = 'testuser@example.com';
      
      await UserProfileService.createEnhancedProfileWithSpecialConfig(
        mockUserId,
        regularEmail
      );

      expect(UserProfileManager.createEnhancedUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testuser'
        })
      );
    });
  });

  describe('getProfileHistory', () => {
    it('should fetch profile history successfully', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          user_id: mockUserId,
          action: 'profile_update' as const,
          old_values: { name: 'Old Name' },
          new_values: { name: 'New Name' },
          performed_by: mockUserId,
          timestamp: '2024-01-01T12:00:00Z'
        }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockAuditLogs,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const history = await UserProfileService.getProfileHistory(mockUserId);

      expect(history).toEqual(mockAuditLogs);
      expect(history).toHaveLength(1);
    });

    it('should handle database errors when fetching history', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      } as any);

      const history = await UserProfileService.getProfileHistory(mockUserId);

      expect(history).toEqual([]);
    });
  });
});
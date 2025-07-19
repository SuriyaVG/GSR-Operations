import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User, UserRole, UserProfileManager } from '../User';
import { UserProfileService } from '@/lib/services/userProfileService';
import { SpecialUserConfigService } from '@/lib/config/specialUsers';
import { supabase } from '@/lib/supabase';
import { AuditService } from '@/lib/services/auditService';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn()
    }
  }
}));

vi.mock('@/lib/services/auditService', () => ({
  AuditService: {
    createAuditLog: vi.fn(),
    getUserAuditLogs: vi.fn()
  }
}));

vi.mock('@/lib/config/specialUsers', () => ({
  SpecialUserConfigService: {
    getConfigurationByEmail: vi.fn(),
    isSpecialUser: vi.fn()
  }
}));

vi.mock('@/lib/services/userProfileService', () => ({
  UserProfileService: {
    createEnhancedProfileWithSpecialConfig: vi.fn(),
    applySpecialConfiguration: vi.fn()
  }
}));

describe('Enhanced User Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration with Enhanced Profile', () => {
    it('creates enhanced profile for new users', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const name = 'New User';
      
      // Mock supabase signUp
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: 'new-user-123',
            email,
            created_at: '2025-01-01T00:00:00Z'
          },
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_at: 1000
          }
        },
        error: null
      } as any);
      
      // Mock profile creation
      vi.mocked(UserProfileService.createEnhancedProfileWithSpecialConfig).mockResolvedValue({
        id: 'new-user-123',
        name,
        role: UserRole.VIEWER,
        active: true,
        updated_by: 'new-user-123',
        updated_at: '2025-01-01T00:00:00Z'
      });
      
      // Call register
      const result = await User.register(email, password, name);
      
      // Check if supabase signUp was called
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: expect.any(Object)
      });
      
      // Check if enhanced profile was created
      expect(UserProfileService.createEnhancedProfileWithSpecialConfig).toHaveBeenCalledWith(
        'new-user-123',
        email,
        name
      );
      
      // Check returned user
      expect(result).toEqual(expect.objectContaining({
        id: 'new-user-123',
        email,
        name,
        role: UserRole.VIEWER
      }));
    });

    it('applies special configuration for special users during registration', async () => {
      const email = 'special@example.com';
      const password = 'password123';
      
      // Mock supabase signUp
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: 'special-user-123',
            email,
            created_at: '2025-01-01T00:00:00Z'
          },
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_at: 1000
          }
        },
        error: null
      } as any);
      
      // Mock special user detection
      vi.mocked(SpecialUserConfigService.isSpecialUser).mockReturnValue(true);
      
      // Mock special configuration
      const specialConfig = {
        email,
        auto_settings: {
          name: 'Special User',
          designation: 'CEO',
          role: UserRole.ADMIN,
          custom_permissions: ['*']
        }
      };
      vi.mocked(SpecialUserConfigService.getConfigurationByEmail).mockReturnValue(specialConfig);
      
      // Mock profile creation
      vi.mocked(UserProfileService.createEnhancedProfileWithSpecialConfig).mockResolvedValue({
        id: 'special-user-123',
        name: 'Special User',
        role: UserRole.ADMIN,
        designation: 'CEO',
        custom_settings: {
          special_permissions: ['*']
        },
        active: true,
        updated_by: 'system',
        updated_at: '2025-01-01T00:00:00Z'
      });
      
      // Call register
      const result = await User.register(email, password);
      
      // Check if supabase signUp was called
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: expect.any(Object)
      });
      
      // Check if special user was detected
      expect(SpecialUserConfigService.isSpecialUser).toHaveBeenCalledWith(email);
      
      // Check if enhanced profile was created with special config
      expect(UserProfileService.createEnhancedProfileWithSpecialConfig).toHaveBeenCalledWith(
        'special-user-123',
        email,
        undefined
      );
      
      // Check returned user
      expect(result).toEqual(expect.objectContaining({
        id: 'special-user-123',
        email,
        name: 'Special User',
        role: UserRole.ADMIN,
        designation: 'CEO'
      }));
    });
  });

  describe('User Login with Enhanced Profile', () => {
    it('applies special configuration for special users during login', async () => {
      const email = 'special@example.com';
      const password = 'password123';
      
      // Mock supabase signInWithPassword
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: {
            id: 'special-user-123',
            email,
            created_at: '2025-01-01T00:00:00Z'
          },
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_at: 1000
          }
        },
        error: null
      } as any);
      
      // Mock special user detection
      vi.mocked(SpecialUserConfigService.isSpecialUser).mockReturnValue(true);
      
      // Mock special configuration
      const specialConfig = {
        email,
        auto_settings: {
          name: 'Special User',
          designation: 'CEO',
          role: UserRole.ADMIN,
          custom_permissions: ['*']
        }
      };
      vi.mocked(UserProfileService.applySpecialConfiguration).mockResolvedValue(specialConfig);
      
      // Mock profile fetch
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'special-user-123',
                name: 'Special User',
                role: UserRole.ADMIN,
                designation: 'CEO',
                custom_settings: {
                  special_permissions: ['*']
                },
                active: true,
                updated_by: 'system',
                updated_at: '2025-01-01T00:00:00Z'
              },
              error: null
            })
          })
        })
      } as any));
      
      // Call login
      const result = await User.login(email, password);
      
      // Check if supabase signInWithPassword was called
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password
      });
      
      // Check if special user was detected
      expect(SpecialUserConfigService.isSpecialUser).toHaveBeenCalledWith(email);
      
      // Check if special configuration was applied
      expect(UserProfileService.applySpecialConfiguration).toHaveBeenCalledWith(email);
      
      // Check returned user
      expect(result).toEqual(expect.objectContaining({
        id: 'special-user-123',
        email,
        name: 'Special User',
        role: UserRole.ADMIN,
        designation: 'CEO'
      }));
    });

    it('handles regular user login without special configuration', async () => {
      const email = 'regular@example.com';
      const password = 'password123';
      
      // Mock supabase signInWithPassword
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: {
            id: 'regular-user-123',
            email,
            created_at: '2025-01-01T00:00:00Z'
          },
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_at: 1000
          }
        },
        error: null
      } as any);
      
      // Mock special user detection (not special)
      vi.mocked(SpecialUserConfigService.isSpecialUser).mockReturnValue(false);
      
      // Mock profile fetch
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'regular-user-123',
                name: 'Regular User',
                role: UserRole.VIEWER,
                active: true,
                updated_by: 'regular-user-123',
                updated_at: '2025-01-01T00:00:00Z'
              },
              error: null
            })
          })
        })
      } as any));
      
      // Call login
      const result = await User.login(email, password);
      
      // Check if supabase signInWithPassword was called
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password
      });
      
      // Check if special user was detected
      expect(SpecialUserConfigService.isSpecialUser).toHaveBeenCalledWith(email);
      
      // Check if special configuration was not applied
      expect(UserProfileService.applySpecialConfiguration).not.toHaveBeenCalled();
      
      // Check returned user
      expect(result).toEqual(expect.objectContaining({
        id: 'regular-user-123',
        email,
        name: 'Regular User',
        role: UserRole.VIEWER
      }));
    });
  });

  describe('UserProfileManager', () => {
    it('creates enhanced user profile', async () => {
      const profileData = {
        id: 'user-123',
        name: 'Test User',
        role: UserRole.VIEWER,
        active: true,
        updated_by: 'user-123'
      };
      
      // Mock profile creation
      vi.mocked(supabase.from).mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...profileData,
                updated_at: '2025-01-01T00:00:00Z'
              },
              error: null
            })
          })
        })
      } as any));
      
      // Call createEnhancedUserProfile
      const result = await UserProfileManager.createEnhancedUserProfile(profileData);
      
      // Check if supabase insert was called
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      
      // Check returned profile
      expect(result).toEqual(expect.objectContaining({
        ...profileData,
        updated_at: '2025-01-01T00:00:00Z'
      }));
    });

    it('updates enhanced user profile', async () => {
      const userId = 'user-123';
      const updates = {
        name: 'Updated Name',
        designation: 'New Designation'
      };
      const updatedBy = 'admin-456';
      
      // Mock profile update
      vi.mocked(supabase.from).mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: userId,
                  ...updates,
                  role: UserRole.VIEWER,
                  active: true,
                  updated_by: updatedBy,
                  updated_at: '2025-01-01T01:00:00Z'
                },
                error: null
              })
            })
          })
        })
      } as any));
      
      // Call updateEnhancedUserProfile
      const result = await UserProfileManager.updateEnhancedUserProfile(userId, updates, updatedBy);
      
      // Check if supabase update was called
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      
      // Check returned profile
      expect(result).toEqual(expect.objectContaining({
        id: userId,
        ...updates,
        role: UserRole.VIEWER,
        updated_by: updatedBy,
        updated_at: '2025-01-01T01:00:00Z'
      }));
    });

    it('gets enhanced user profile', async () => {
      const userId = 'user-123';
      const profile = {
        id: userId,
        name: 'Test User',
        role: UserRole.VIEWER,
        designation: 'Viewer',
        custom_settings: {
          display_name: 'Tester'
        },
        active: true,
        updated_by: userId,
        updated_at: '2025-01-01T00:00:00Z'
      };
      
      // Mock profile fetch
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile,
              error: null
            })
          })
        })
      } as any));
      
      // Call getEnhancedUserProfile
      const result = await UserProfileManager.getEnhancedUserProfile(userId);
      
      // Check if supabase select was called
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      
      // Check returned profile
      expect(result).toEqual(profile);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProfileService } from '../userProfileService';
import { supabase } from '@/lib/supabase';
import { UserProfileManager } from '@/Entities/User';
import { AuditService } from '../auditService';
import { SpecialUserConfigService } from '@/lib/config/specialUsers';
import { toast } from '@/lib/toast';
import { ErrorHandlingService } from '../errorHandlingService';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

vi.mock('@/Entities/User', () => ({
  UserProfileManager: {
    getEnhancedUserProfile: vi.fn(),
    updateEnhancedUserProfile: vi.fn(),
    createEnhancedUserProfile: vi.fn()
  },
  UserRole: {
    ADMIN: 'admin',
    PRODUCTION: 'production',
    SALES_MANAGER: 'sales_manager',
    FINANCE: 'finance',
    VIEWER: 'viewer'
  }
}));

vi.mock('../auditService', () => ({
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

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn()
  }
}));

vi.mock('../errorHandlingService', () => ({
  ErrorHandlingService: {
    handleProfileUpdateError: vi.fn()
  },
  UserManagementErrorType: {
    VALIDATION_ERROR: 'validation_error',
    DATABASE_ERROR: 'database_error',
    PERMISSION_ERROR: 'permission_error'
  }
}));

describe('UserProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    const userId = 'user-123';
    const updatedBy = 'admin-456';
    const currentProfile = {
      id: userId,
      name: 'Old Name',
      designation: 'Old Designation',
      role: 'viewer',
      custom_settings: {
        display_name: 'Old Display',
        title: 'Old Title',
        department: 'Old Department'
      },
      active: true,
      updated_at: '2025-01-01T00:00:00Z'
    };

    const updates = {
      name: 'New Name',
      designation: 'New Designation',
      custom_settings: {
        display_name: 'New Display',
        title: 'New Title',
        department: 'New Department'
      }
    };

    it('should successfully update a user profile', async () => {
      // Mock dependencies
      vi.mocked(UserProfileManager.getEnhancedUserProfile).mockResolvedValue(currentProfile);
      vi.mocked(UserProfileManager.updateEnhancedUserProfile).mockResolvedValue({
        ...currentProfile,
        ...updates,
        updated_at: '2025-01-01T01:00:00Z'
      });
      vi.mocked(AuditService.createAuditLog).mockResolvedValue({
        id: 'audit-123',
        user_id: userId,
        action: 'profile_update',
        old_values: {},
        new_values: {},
        performed_by: updatedBy,
        timestamp: '2025-01-01T01:00:00Z'
      });
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: 'test@example.com',
            created_at: '2025-01-01T00:00:00Z',
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      } as any);

      const result = await UserProfileService.updateProfile(userId, updates, updatedBy);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.name).toBe('New Name');
      expect(result.user?.designation).toBe('New Designation');
      expect(result.user?.custom_settings?.display_name).toBe('New Display');

      // Verify the dependencies were called correctly
      expect(UserProfileManager.getEnhancedUserProfile).toHaveBeenCalledWith(userId);
      expect(UserProfileManager.updateEnhancedUserProfile).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          name: 'New Name',
          designation: 'New Designation',
          custom_settings: expect.objectContaining({
            display_name: 'New Display',
            title: 'New Title',
            department: 'New Department'
          })
        }),
        updatedBy
      );
      expect(AuditService.createAuditLog).toHaveBeenCalledWith(
        userId,
        'profile_update',
        expect.any(Object),
        expect.any(Object),
        updatedBy
      );
    });

    it('should handle validation errors', async () => {
      const invalidUpdates = {
        name: '', // Empty name should fail validation
        designation: 'Valid Designation'
      };

      const result = await UserProfileService.updateProfile(userId, invalidUpdates, updatedBy);

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.field === 'name')).toBe(true);
      
      // Verify no update was attempted
      expect(UserProfileManager.updateEnhancedUserProfile).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock dependencies to simulate a database error
      vi.mocked(UserProfileManager.getEnhancedUserProfile).mockResolvedValue(currentProfile);
      vi.mocked(UserProfileManager.updateEnhancedUserProfile).mockRejectedValue(new Error('Database error'));
      vi.mocked(ErrorHandlingService.handleProfileUpdateError).mockReturnValue({
        type: 'database_error',
        message: 'Failed to update profile due to a database error',
        recoveryActions: []
      });

      const result = await UserProfileService.updateProfile(userId, updates, updatedBy);

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update profile');
      
      // Verify error handling was called
      expect(ErrorHandlingService.handleProfileUpdateError).toHaveBeenCalled();
    });

    it('should handle missing user profile', async () => {
      // Mock dependencies to simulate a missing user profile
      vi.mocked(UserProfileManager.getEnhancedUserProfile).mockResolvedValue(null);

      const result = await UserProfileService.updateProfile(userId, updates, updatedBy);

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.message).toBe('User profile not found');
    });
  });

  describe('validateProfileUpdate', () => {
    it('should validate name correctly', () => {
      // Valid name
      let result = UserProfileService.validateProfileUpdate({ name: 'John Doe' });
      expect(result.isValid).toBe(true);
      
      // Invalid name (too short)
      result = UserProfileService.validateProfileUpdate({ name: 'J' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('name');
      
      // Invalid name (invalid characters)
      result = UserProfileService.validateProfileUpdate({ name: 'John123' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('name');
    });

    it('should validate designation correctly', () => {
      // Valid designation
      let result = UserProfileService.validateProfileUpdate({ designation: 'Senior Manager' });
      expect(result.isValid).toBe(true);
      
      // Invalid designation (too long)
      const longDesignation = 'A'.repeat(51);
      result = UserProfileService.validateProfileUpdate({ designation: longDesignation });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('designation');
      
      // Invalid designation (invalid characters)
      result = UserProfileService.validateProfileUpdate({ designation: 'Manager123' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('designation');
    });

    it('should validate custom settings correctly', () => {
      // Valid custom settings
      let result = UserProfileService.validateProfileUpdate({
        custom_settings: {
          display_name: 'Johnny',
          title: 'Senior Developer',
          department: 'Engineering'
        }
      });
      expect(result.isValid).toBe(true);
      
      // Invalid display name (too long)
      const longDisplayName = 'A'.repeat(101);
      result = UserProfileService.validateProfileUpdate({
        custom_settings: { display_name: longDisplayName }
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('custom_settings.display_name');
    });

    it('should validate multiple fields together', () => {
      // Multiple invalid fields
      const result = UserProfileService.validateProfileUpdate({
        name: 'J', // Too short
        designation: 'Manager123', // Invalid characters
        custom_settings: {
          title: 'A'.repeat(51) // Too long
        }
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(result.errors.some(e => e.field === 'designation')).toBe(true);
      expect(result.errors.some(e => e.field === 'custom_settings.title')).toBe(true);
    });
  });

  describe('applySpecialConfiguration', () => {
    it('should apply special configuration for a special user', async () => {
      const email = 'special@example.com';
      const specialConfig = {
        email,
        auto_settings: {
          name: 'Special User',
          designation: 'CEO',
          role: 'admin',
          custom_permissions: ['*']
        }
      };
      
      vi.mocked(SpecialUserConfigService.getConfigurationByEmail).mockReturnValue(specialConfig);
      
      const result = await UserProfileService.applySpecialConfiguration(email);
      
      expect(result).toEqual(specialConfig);
      expect(SpecialUserConfigService.getConfigurationByEmail).toHaveBeenCalledWith(email);
    });

    it('should return null for non-special users', async () => {
      const email = 'regular@example.com';
      
      vi.mocked(SpecialUserConfigService.getConfigurationByEmail).mockReturnValue(null);
      
      const result = await UserProfileService.applySpecialConfiguration(email);
      
      expect(result).toBeNull();
      expect(SpecialUserConfigService.getConfigurationByEmail).toHaveBeenCalledWith(email);
    });

    it('should handle errors gracefully', async () => {
      const email = 'error@example.com';
      
      vi.mocked(SpecialUserConfigService.getConfigurationByEmail).mockImplementation(() => {
        throw new Error('Configuration error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await UserProfileService.applySpecialConfiguration(email);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error applying special configuration:', expect.any(Error));
    });
  });

  describe('createEnhancedProfileWithSpecialConfig', () => {
    const userId = 'user-123';
    const email = 'test@example.com';
    
    it('should create profile with special configuration when available', async () => {
      const specialConfig = {
        email,
        auto_settings: {
          name: 'Special User',
          designation: 'CEO',
          role: 'admin',
          custom_permissions: ['*']
        }
      };
      
      const createdProfile = {
        id: userId,
        name: 'Special User',
        designation: 'CEO',
        role: 'admin',
        custom_settings: {
          special_permissions: ['*']
        },
        active: true,
        updated_by: 'system',
        updated_at: '2025-01-01T00:00:00Z'
      };
      
      vi.spyOn(UserProfileService, 'applySpecialConfiguration').mockResolvedValue(specialConfig);
      vi.spyOn(UserProfileManager, 'createEnhancedUserProfile').mockResolvedValue(createdProfile);
      vi.spyOn(AuditService, 'createAuditLog').mockResolvedValue({} as any);
      
      const result = await UserProfileService.createEnhancedProfileWithSpecialConfig(userId, email);
      
      expect(result).toEqual(createdProfile);
      expect(UserProfileManager.createEnhancedUserProfile).toHaveBeenCalledWith(expect.objectContaining({
        id: userId,
        role: 'admin',
        name: 'Special User',
        designation: 'CEO'
      }));
      expect(toast.success).toHaveBeenCalled();
    });

    it('should create default profile when no special configuration exists', async () => {
      const defaultProfile = {
        id: userId,
        name: 'test',
        role: 'viewer',
        active: true,
        updated_by: userId,
        updated_at: '2025-01-01T00:00:00Z'
      };
      
      vi.spyOn(UserProfileService, 'applySpecialConfiguration').mockResolvedValue(null);
      vi.spyOn(UserProfileManager, 'createEnhancedUserProfile').mockResolvedValue(defaultProfile);
      
      const result = await UserProfileService.createEnhancedProfileWithSpecialConfig(userId, email);
      
      expect(result).toEqual(defaultProfile);
      expect(UserProfileManager.createEnhancedUserProfile).toHaveBeenCalledWith(expect.objectContaining({
        id: userId,
        role: 'viewer',
        name: 'test'
      }));
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('getProfileHistory', () => {
    it('should fetch profile history for a user', async () => {
      const userId = 'user-123';
      const auditLogs = [
        {
          id: 'audit-1',
          user_id: userId,
          action: 'profile_update',
          old_values: { name: 'Old Name' },
          new_values: { name: 'New Name' },
          performed_by: userId,
          timestamp: '2025-01-01T00:00:00Z'
        }
      ];
      
      vi.mocked(AuditService.getUserAuditLogs).mockResolvedValue(auditLogs);
      
      const result = await UserProfileService.getProfileHistory(userId);
      
      expect(result).toEqual(auditLogs);
      expect(AuditService.getUserAuditLogs).toHaveBeenCalledWith(userId, 50);
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';
      
      vi.mocked(AuditService.getUserAuditLogs).mockRejectedValue(new Error('Database error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await UserProfileService.getProfileHistory(userId);
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching profile history:', expect.any(Error));
    });
  });

  describe('sanitizeProfileUpdate', () => {
    it('should sanitize profile update input', () => {
      const input = {
        name: '  John Doe  ',
        designation: '  Manager  ',
        custom_settings: {
          display_name: '  Johnny  ',
          title: '  Senior Manager  ',
          department: '  Engineering  '
        }
      };
      
      const result = UserProfileService.sanitizeProfileUpdate(input);
      
      expect(result).toEqual({
        name: 'John Doe',
        designation: 'Manager',
        custom_settings: {
          display_name: 'Johnny',
          title: 'Senior Manager',
          department: 'Engineering'
        }
      });
    });

    it('should handle missing fields', () => {
      const input = {
        name: 'John Doe'
        // Missing designation and custom_settings
      };
      
      const result = UserProfileService.sanitizeProfileUpdate(input);
      
      expect(result).toEqual({
        name: 'John Doe'
      });
    });

    it('should handle invalid input types', () => {
      const input = {
        name: 123, // Not a string
        designation: null,
        custom_settings: 'not an object'
      };
      
      const result = UserProfileService.sanitizeProfileUpdate(input as any);
      
      expect(result).toEqual({
        name: '',
        designation: ''
      });
    });
  });

  describe('getUpdateSummary', () => {
    it('should generate summary for name changes', () => {
      const oldProfile = { name: 'Old Name' };
      const newProfile = { name: 'New Name' };
      
      const result = UserProfileService.getUpdateSummary(oldProfile, newProfile);
      
      expect(result).toBe('Profile updated: name updated to "New Name"');
    });

    it('should generate summary for designation changes', () => {
      const oldProfile = { designation: 'Old Designation' };
      const newProfile = { designation: 'New Designation' };
      
      const result = UserProfileService.getUpdateSummary(oldProfile, newProfile);
      
      expect(result).toBe('Profile updated: designation set to "New Designation"');
    });

    it('should generate summary for designation removal', () => {
      const oldProfile = { designation: 'Old Designation' };
      const newProfile = { designation: undefined };
      
      const result = UserProfileService.getUpdateSummary(oldProfile, newProfile);
      
      expect(result).toBe('Profile updated: designation removed');
    });

    it('should generate summary for multiple changes', () => {
      const oldProfile = { name: 'Old Name', designation: 'Old Designation' };
      const newProfile = { name: 'New Name', designation: 'New Designation' };
      
      const result = UserProfileService.getUpdateSummary(oldProfile, newProfile);
      
      expect(result).toBe('Profile updated: name updated to "New Name", designation set to "New Designation"');
    });

    it('should handle no changes', () => {
      const oldProfile = { name: 'Same Name', designation: 'Same Designation' };
      const newProfile = { name: 'Same Name', designation: 'Same Designation' };
      
      const result = UserProfileService.getUpdateSummary(oldProfile, newProfile);
      
      expect(result).toBe('Profile updated');
    });
  });
});
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { User, UserRole, EnhancedUserProfile, UserProfileManager } from '@/Entities/User';
import { SpecialUserConfigService } from '@/lib/config/specialUsers';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('Enhanced User Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Special User Configuration Integration', () => {
    it('should apply special configuration for CEO email', () => {
      const specialEmail = 'suriyavg834@gmail.com';
      const config = SpecialUserConfigService.getConfigurationByEmail(specialEmail);
      
      expect(config).toBeDefined();
      expect(config?.auto_settings.name).toBe('Suriya');
      expect(config?.auto_settings.designation).toBe('CEO');
      expect(config?.auto_settings.role).toBe(UserRole.ADMIN);
    });

    it('should handle regular users without special configuration', () => {
      const regularEmail = 'employee@company.com';
      const config = SpecialUserConfigService.getConfigurationByEmail(regularEmail);
      
      expect(config).toBeNull();
    });
  });

  describe('Enhanced User Profile Data Model', () => {
    it('should support all enhanced profile fields', () => {
      const enhancedProfile: EnhancedUserProfile = {
        id: 'user-123',
        role: UserRole.ADMIN,
        name: 'Test User',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        designation: 'Chief Technology Officer',
        custom_settings: {
          display_name: 'CTO',
          title: 'Chief Technology Officer',
          department: 'Technology',
          special_permissions: ['system_admin', 'user_management']
        },
        last_profile_update: '2024-01-01T12:00:00Z',
        updated_by: 'admin-456'
      };

      // Verify all enhanced fields are properly typed and accessible
      expect(enhancedProfile.designation).toBe('Chief Technology Officer');
      expect(enhancedProfile.custom_settings?.display_name).toBe('CTO');
      expect(enhancedProfile.custom_settings?.title).toBe('Chief Technology Officer');
      expect(enhancedProfile.custom_settings?.department).toBe('Technology');
      expect(enhancedProfile.custom_settings?.special_permissions).toEqual(['system_admin', 'user_management']);
      expect(enhancedProfile.last_profile_update).toBe('2024-01-01T12:00:00Z');
      expect(enhancedProfile.updated_by).toBe('admin-456');
    });

    it('should extend base UserProfile interface correctly', () => {
      const enhancedProfile: EnhancedUserProfile = {
        // Base UserProfile fields
        id: 'user-123',
        role: UserRole.SALES_MANAGER,
        name: 'Sales Manager',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        // Enhanced fields
        designation: 'Regional Sales Manager'
      };

      // Should have all base fields
      expect(enhancedProfile.id).toBe('user-123');
      expect(enhancedProfile.role).toBe(UserRole.SALES_MANAGER);
      expect(enhancedProfile.name).toBe('Sales Manager');
      expect(enhancedProfile.active).toBe(true);
      
      // Should have enhanced fields
      expect(enhancedProfile.designation).toBe('Regional Sales Manager');
    });
  });

  describe('User Interface Enhancement', () => {
    it('should support enhanced User interface with designation and custom settings', () => {
      const enhancedUser: User = {
        id: 'user-123',
        email: 'manager@company.com',
        role: UserRole.SALES_MANAGER,
        name: 'John Manager',
        designation: 'Regional Sales Manager',
        custom_settings: {
          display_name: 'John M.',
          title: 'Regional Sales Manager',
          department: 'Sales',
          special_permissions: ['customer_management', 'pricing_override']
        },
        last_profile_update: '2024-01-01T12:00:00Z',
        updated_by: 'admin-456',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Verify enhanced User interface fields
      expect(enhancedUser.designation).toBe('Regional Sales Manager');
      expect(enhancedUser.custom_settings?.display_name).toBe('John M.');
      expect(enhancedUser.custom_settings?.department).toBe('Sales');
      expect(enhancedUser.last_profile_update).toBe('2024-01-01T12:00:00Z');
      expect(enhancedUser.updated_by).toBe('admin-456');
    });
  });

  describe('Configuration Application', () => {
    it('should correctly apply special user configuration to user data', () => {
      const baseUserData = {
        id: 'user-123',
        email: 'suriyavg834@gmail.com',
        name: 'Default Name',
        role: UserRole.VIEWER
      };

      const enhancedData = SpecialUserConfigService.applyConfiguration(
        'suriyavg834@gmail.com',
        baseUserData
      );

      expect(enhancedData.name).toBe('Suriya');
      expect(enhancedData.designation).toBe('CEO');
      expect(enhancedData.role).toBe(UserRole.ADMIN);
      expect(enhancedData.custom_permissions).toEqual(['*']);
      
      // Original fields should be preserved
      expect(enhancedData.id).toBe('user-123');
      expect(enhancedData.email).toBe('suriyavg834@gmail.com');
    });

    it('should not modify data for non-special users', () => {
      const regularUserData = {
        id: 'user-456',
        email: 'regular@company.com',
        name: 'Regular User',
        role: UserRole.PRODUCTION
      };

      const result = SpecialUserConfigService.applyConfiguration(
        'regular@company.com',
        regularUserData
      );

      expect(result).toEqual(regularUserData);
    });
  });

  describe('Role and Permission Integration', () => {
    it('should maintain role-based permissions with enhanced profiles', () => {
      const adminUser: User = {
        id: 'admin-123',
        email: 'admin@company.com',
        role: UserRole.ADMIN,
        name: 'Admin User',
        designation: 'System Administrator',
        custom_settings: {
          special_permissions: ['*']
        }
      };

      const productionUser: User = {
        id: 'prod-123',
        email: 'production@company.com',
        role: UserRole.PRODUCTION,
        name: 'Production User',
        designation: 'Production Manager'
      };

      // Verify role assignments work with enhanced profiles
      expect(adminUser.role).toBe(UserRole.ADMIN);
      expect(adminUser.designation).toBe('System Administrator');
      expect(productionUser.role).toBe(UserRole.PRODUCTION);
      expect(productionUser.designation).toBe('Production Manager');
    });
  });
});
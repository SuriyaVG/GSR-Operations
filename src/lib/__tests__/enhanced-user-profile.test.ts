import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  UserRole, 
  EnhancedUserProfile, 
  ProfileUpdateRequest, 
  UserManagementData,
  AuditLogEntry 
} from '@/Entities/User';
import { 
  SpecialUserConfigService, 
  UserConfiguration, 
  SPECIAL_USER_CONFIGS 
} from '@/lib/config/specialUsers';

describe('Enhanced User Profile Data Models', () => {
  describe('EnhancedUserProfile Interface', () => {
    it('should extend UserProfile with additional fields', () => {
      const enhancedProfile: EnhancedUserProfile = {
        id: 'user-123',
        role: UserRole.ADMIN,
        name: 'Test User',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        designation: 'CEO',
        custom_settings: {
          display_name: 'Chief Executive',
          title: 'CEO',
          department: 'Executive',
          special_permissions: ['*']
        },
        last_profile_update: '2024-01-01T00:00:00Z',
        updated_by: 'system'
      };

      expect(enhancedProfile.designation).toBe('CEO');
      expect(enhancedProfile.custom_settings?.display_name).toBe('Chief Executive');
      expect(enhancedProfile.custom_settings?.special_permissions).toContain('*');
      expect(enhancedProfile.last_profile_update).toBeDefined();
      expect(enhancedProfile.updated_by).toBe('system');
    });
  });

  describe('ProfileUpdateRequest Interface', () => {
    it('should allow partial profile updates', () => {
      const updateRequest: ProfileUpdateRequest = {
        name: 'Updated Name',
        designation: 'Manager',
        custom_settings: {
          display_name: 'Senior Manager',
          department: 'Operations'
        }
      };

      expect(updateRequest.name).toBe('Updated Name');
      expect(updateRequest.designation).toBe('Manager');
      expect(updateRequest.custom_settings?.display_name).toBe('Senior Manager');
    });

    it('should allow empty update requests', () => {
      const emptyUpdate: ProfileUpdateRequest = {};
      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });
  });

  describe('UserManagementData Interface', () => {
    it('should contain all required fields for user management', () => {
      const userData: UserManagementData = {
        id: 'user-456',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.SALES_MANAGER,
        designation: 'Sales Lead',
        active: true,
        last_login: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        custom_settings: {
          display_name: 'Sales Team Lead',
          title: 'Lead',
          department: 'Sales',
          special_permissions: ['sales_override']
        }
      };

      expect(userData.id).toBe('user-456');
      expect(userData.email).toBe('test@example.com');
      expect(userData.role).toBe(UserRole.SALES_MANAGER);
      expect(userData.designation).toBe('Sales Lead');
      expect(userData.custom_settings?.department).toBe('Sales');
    });
  });

  describe('AuditLogEntry Interface', () => {
    it('should track profile changes with all required fields', () => {
      const auditEntry: AuditLogEntry = {
        id: 'audit-123',
        user_id: 'user-789',
        action: 'profile_update',
        old_values: { name: 'Old Name' },
        new_values: { name: 'New Name' },
        performed_by: 'admin-user',
        timestamp: '2024-01-01T10:00:00Z',
        ip_address: '192.168.1.1'
      };

      expect(auditEntry.action).toBe('profile_update');
      expect(auditEntry.old_values.name).toBe('Old Name');
      expect(auditEntry.new_values.name).toBe('New Name');
      expect(auditEntry.performed_by).toBe('admin-user');
      expect(auditEntry.ip_address).toBe('192.168.1.1');
    });

    it('should support different action types', () => {
      const actions: AuditLogEntry['action'][] = [
        'profile_update',
        'role_change',
        'permission_change',
        'designation_change'
      ];

      actions.forEach(action => {
        const entry: AuditLogEntry = {
          id: `audit-${action}`,
          user_id: 'user-123',
          action,
          old_values: {},
          new_values: {},
          performed_by: 'admin',
          timestamp: new Date().toISOString()
        };

        expect(entry.action).toBe(action);
      });
    });
  });
});

describe('Special User Configuration System', () => {
  beforeEach(() => {
    // Reset any modifications to the configuration
    vi.clearAllMocks();
  });

  describe('UserConfiguration Interface', () => {
    it('should define special user configuration structure', () => {
      const config: UserConfiguration = {
        email: 'special@example.com',
        auto_settings: {
          name: 'Special User',
          designation: 'CEO',
          role: UserRole.ADMIN,
          custom_permissions: ['*']
        }
      };

      expect(config.email).toBe('special@example.com');
      expect(config.auto_settings.name).toBe('Special User');
      expect(config.auto_settings.designation).toBe('CEO');
      expect(config.auto_settings.role).toBe(UserRole.ADMIN);
      expect(config.auto_settings.custom_permissions).toContain('*');
    });
  });

  describe('SpecialUserConfigService', () => {
    describe('getConfigurationByEmail', () => {
      it('should return configuration for special user', () => {
        const config = SpecialUserConfigService.getConfigurationByEmail('suriyavg834@gmail.com');
        
        expect(config).toBeDefined();
        expect(config?.email).toBe('suriyavg834@gmail.com');
        expect(config?.auto_settings.name).toBe('Suriya');
        expect(config?.auto_settings.designation).toBe('CEO');
        expect(config?.auto_settings.role).toBe(UserRole.ADMIN);
      });

      it('should return null for non-special user', () => {
        const config = SpecialUserConfigService.getConfigurationByEmail('regular@example.com');
        expect(config).toBeNull();
      });

      it('should handle email case insensitivity', () => {
        const config = SpecialUserConfigService.getConfigurationByEmail('SURIYAVG834@GMAIL.COM');
        expect(config).toBeDefined();
        expect(config?.auto_settings.name).toBe('Suriya');
      });

      it('should handle email with extra whitespace', () => {
        const config = SpecialUserConfigService.getConfigurationByEmail('  suriyavg834@gmail.com  ');
        expect(config).toBeDefined();
        expect(config?.auto_settings.name).toBe('Suriya');
      });
    });

    describe('isSpecialUser', () => {
      it('should return true for special user', () => {
        const isSpecial = SpecialUserConfigService.isSpecialUser('suriyavg834@gmail.com');
        expect(isSpecial).toBe(true);
      });

      it('should return false for regular user', () => {
        const isSpecial = SpecialUserConfigService.isSpecialUser('regular@example.com');
        expect(isSpecial).toBe(false);
      });

      it('should handle case insensitivity', () => {
        const isSpecial = SpecialUserConfigService.isSpecialUser('SURIYAVG834@GMAIL.COM');
        expect(isSpecial).toBe(true);
      });
    });

    describe('getAllConfigurations', () => {
      it('should return all special user configurations', () => {
        const configs = SpecialUserConfigService.getAllConfigurations();
        
        expect(configs).toBeInstanceOf(Array);
        expect(configs.length).toBeGreaterThan(0);
        
        const suriyaConfig = configs.find(c => c.email === 'suriyavg834@gmail.com');
        expect(suriyaConfig).toBeDefined();
        expect(suriyaConfig?.auto_settings.name).toBe('Suriya');
      });
    });

    describe('getSpecialUserEmails', () => {
      it('should return array of special user emails', () => {
        const emails = SpecialUserConfigService.getSpecialUserEmails();
        
        expect(emails).toBeInstanceOf(Array);
        expect(emails).toContain('suriyavg834@gmail.com');
      });
    });

    describe('applySpecialConfiguration', () => {
      it('should apply special configuration to user data', () => {
        const userData = {
          id: 'user-123',
          email: 'suriyavg834@gmail.com',
          name: 'Default Name',
          role: UserRole.VIEWER
        };

        const result = SpecialUserConfigService.applySpecialConfiguration(
          'suriyavg834@gmail.com',
          userData
        );

        expect(result.name).toBe('Suriya');
        expect(result.designation).toBe('CEO');
        expect(result.role).toBe(UserRole.ADMIN);
        expect(result.custom_settings?.special_permissions).toContain('*');
      });

      it('should return unchanged data for non-special user', () => {
        const userData = {
          id: 'user-123',
          email: 'regular@example.com',
          name: 'Regular User',
          role: UserRole.VIEWER
        };

        const result = SpecialUserConfigService.applySpecialConfiguration(
          'regular@example.com',
          userData
        );

        expect(result).toEqual(userData);
      });

      it('should preserve existing custom_settings', () => {
        const userData = {
          id: 'user-123',
          email: 'suriyavg834@gmail.com',
          custom_settings: {
            display_name: 'Existing Display Name',
            department: 'Existing Department'
          }
        };

        const result = SpecialUserConfigService.applySpecialConfiguration(
          'suriyavg834@gmail.com',
          userData
        );

        expect(result.custom_settings.display_name).toBe('Existing Display Name');
        expect(result.custom_settings.department).toBe('Existing Department');
        expect(result.custom_settings.special_permissions).toContain('*');
      });
    });

    describe('validateConfiguration', () => {
      it('should validate correct configuration', () => {
        const validConfig: UserConfiguration = {
          email: 'test@example.com',
          auto_settings: {
            name: 'Test User',
            designation: 'Manager',
            role: UserRole.ADMIN
          }
        };

        const isValid = SpecialUserConfigService.validateConfiguration(validConfig);
        expect(isValid).toBe(true);
      });

      it('should reject configuration without email', () => {
        const invalidConfig = {
          auto_settings: {
            name: 'Test User',
            designation: 'Manager',
            role: UserRole.ADMIN
          }
        } as UserConfiguration;

        const isValid = SpecialUserConfigService.validateConfiguration(invalidConfig);
        expect(isValid).toBe(false);
      });

      it('should reject configuration without auto_settings', () => {
        const invalidConfig = {
          email: 'test@example.com'
        } as UserConfiguration;

        const isValid = SpecialUserConfigService.validateConfiguration(invalidConfig);
        expect(isValid).toBe(false);
      });

      it('should reject configuration with invalid role', () => {
        const invalidConfig = {
          email: 'test@example.com',
          auto_settings: {
            name: 'Test User',
            designation: 'Manager',
            role: 'invalid_role' as UserRole
          }
        };

        const isValid = SpecialUserConfigService.validateConfiguration(invalidConfig);
        expect(isValid).toBe(false);
      });
    });

    describe('addConfiguration', () => {
      it('should add valid configuration', () => {
        const newConfig: UserConfiguration = {
          email: 'newuser@example.com',
          auto_settings: {
            name: 'New User',
            designation: 'Director',
            role: UserRole.ADMIN
          }
        };

        const result = SpecialUserConfigService.addConfiguration(newConfig);
        expect(result).toBe(true);

        const retrievedConfig = SpecialUserConfigService.getConfigurationByEmail('newuser@example.com');
        expect(retrievedConfig).toBeDefined();
        expect(retrievedConfig?.auto_settings.name).toBe('New User');
      });

      it('should throw error for invalid configuration', () => {
        const invalidConfig = {
          email: 'invalid@example.com'
        } as UserConfiguration;

        expect(() => {
          SpecialUserConfigService.addConfiguration(invalidConfig);
        }).toThrow('Invalid user configuration');
      });

      it('should normalize email when adding', () => {
        const newConfig: UserConfiguration = {
          email: '  NEWUSER2@EXAMPLE.COM  ',
          auto_settings: {
            name: 'New User 2',
            designation: 'Manager',
            role: UserRole.SALES_MANAGER
          }
        };

        SpecialUserConfigService.addConfiguration(newConfig);
        
        const retrievedConfig = SpecialUserConfigService.getConfigurationByEmail('newuser2@example.com');
        expect(retrievedConfig).toBeDefined();
        expect(retrievedConfig?.email).toBe('newuser2@example.com');
      });
    });

    describe('removeConfiguration', () => {
      it('should remove existing configuration', () => {
        // First add a configuration
        const testConfig: UserConfiguration = {
          email: 'toremove@example.com',
          auto_settings: {
            name: 'To Remove',
            designation: 'Temp',
            role: UserRole.VIEWER
          }
        };

        SpecialUserConfigService.addConfiguration(testConfig);
        expect(SpecialUserConfigService.isSpecialUser('toremove@example.com')).toBe(true);

        // Then remove it
        const result = SpecialUserConfigService.removeConfiguration('toremove@example.com');
        expect(result).toBe(true);
        expect(SpecialUserConfigService.isSpecialUser('toremove@example.com')).toBe(false);
      });

      it('should return false for non-existent configuration', () => {
        const result = SpecialUserConfigService.removeConfiguration('nonexistent@example.com');
        expect(result).toBe(false);
      });

      it('should handle case insensitive removal', () => {
        // Add configuration
        const testConfig: UserConfiguration = {
          email: 'casetest@example.com',
          auto_settings: {
            name: 'Case Test',
            designation: 'Tester',
            role: UserRole.VIEWER
          }
        };

        SpecialUserConfigService.addConfiguration(testConfig);
        
        // Remove with different case
        const result = SpecialUserConfigService.removeConfiguration('CASETEST@EXAMPLE.COM');
        expect(result).toBe(true);
        expect(SpecialUserConfigService.isSpecialUser('casetest@example.com')).toBe(false);
      });
    });
  });

  describe('SPECIAL_USER_CONFIGS constant', () => {
    it('should contain predefined special user', () => {
      expect(SPECIAL_USER_CONFIGS['suriyavg834@gmail.com']).toBeDefined();
      expect(SPECIAL_USER_CONFIGS['suriyavg834@gmail.com'].auto_settings.name).toBe('Suriya');
      expect(SPECIAL_USER_CONFIGS['suriyavg834@gmail.com'].auto_settings.designation).toBe('CEO');
      expect(SPECIAL_USER_CONFIGS['suriyavg834@gmail.com'].auto_settings.role).toBe(UserRole.ADMIN);
    });
  });
});
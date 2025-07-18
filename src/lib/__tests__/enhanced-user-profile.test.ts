import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpecialUserConfigService } from '@/lib/config/specialUsers';
import { UserRole, EnhancedUserProfile, AuditLogEntry } from '@/Entities/User';

describe('Enhanced User Profile System', () => {
  describe('SpecialUserConfigService', () => {
    it('should return configuration for special user email', () => {
      const config = SpecialUserConfigService.getConfigurationByEmail('suriyavg834@gmail.com');
      
      expect(config).toBeDefined();
      expect(config?.email).toBe('suriyavg834@gmail.com');
      expect(config?.auto_settings.name).toBe('Suriya');
      expect(config?.auto_settings.designation).toBe('CEO');
      expect(config?.auto_settings.role).toBe(UserRole.ADMIN);
      expect(config?.auto_settings.custom_permissions).toEqual(['*']);
    });

    it('should return null for non-special user email', () => {
      const config = SpecialUserConfigService.getConfigurationByEmail('regular@example.com');
      expect(config).toBeNull();
    });

    it('should handle case insensitive email lookup', () => {
      const config = SpecialUserConfigService.getConfigurationByEmail('SURIYAVG834@GMAIL.COM');
      expect(config).toBeDefined();
      expect(config?.email).toBe('suriyavg834@gmail.com');
    });

    it('should check if email has special configuration', () => {
      expect(SpecialUserConfigService.hasSpecialConfiguration('suriyavg834@gmail.com')).toBe(true);
      expect(SpecialUserConfigService.hasSpecialConfiguration('regular@example.com')).toBe(false);
    });

    it('should get all configured emails', () => {
      const emails = SpecialUserConfigService.getConfiguredEmails();
      expect(emails).toContain('suriyavg834@gmail.com');
      expect(emails.length).toBeGreaterThan(0);
    });

    it('should apply special configuration to user data', () => {
      const userData = {
        id: '123',
        email: 'suriyavg834@gmail.com',
        name: 'Default Name',
        role: UserRole.VIEWER
      };

      const enhanced = SpecialUserConfigService.applyConfiguration('suriyavg834@gmail.com', userData);
      
      expect(enhanced.name).toBe('Suriya');
      expect(enhanced.designation).toBe('CEO');
      expect(enhanced.role).toBe(UserRole.ADMIN);
      expect(enhanced.custom_permissions).toEqual(['*']);
    });

    it('should return unchanged data for non-special users', () => {
      const userData = {
        id: '123',
        email: 'regular@example.com',
        name: 'Regular User',
        role: UserRole.VIEWER
      };

      const result = SpecialUserConfigService.applyConfiguration('regular@example.com', userData);
      expect(result).toEqual(userData);
    });
  });

  describe('Enhanced User Profile Interface', () => {
    it('should extend UserProfile with enhanced fields', () => {
      const enhancedProfile: EnhancedUserProfile = {
        id: '123',
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
      expect(enhancedProfile.last_profile_update).toBeDefined();
      expect(enhancedProfile.updated_by).toBe('system');
    });
  });

  describe('Audit Log Entry Interface', () => {
    it('should support all required audit actions', () => {
      const auditEntry: AuditLogEntry = {
        id: 'audit-123',
        user_id: 'user-123',
        action: 'designation_change',
        old_values: { designation: 'Manager' },
        new_values: { designation: 'CEO' },
        performed_by: 'admin-456',
        timestamp: '2024-01-01T00:00:00Z',
        ip_address: '192.168.1.1'
      };

      expect(auditEntry.action).toBe('designation_change');
      expect(auditEntry.old_values).toEqual({ designation: 'Manager' });
      expect(auditEntry.new_values).toEqual({ designation: 'CEO' });
    });

    it('should support all audit action types', () => {
      const actions: AuditLogEntry['action'][] = [
        'profile_update',
        'role_change', 
        'permission_change',
        'designation_change'
      ];

      actions.forEach(action => {
        const entry: AuditLogEntry = {
          id: 'test',
          user_id: 'test',
          action,
          old_values: {},
          new_values: {},
          performed_by: 'test',
          timestamp: '2024-01-01T00:00:00Z'
        };
        expect(entry.action).toBe(action);
      });
    });
  });
});
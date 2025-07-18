import { UserRole } from '@/Entities/User';

// User configuration interface for special users
export interface UserConfiguration {
  email: string;
  auto_settings: {
    name: string;
    designation: string;
    role: UserRole;
    custom_permissions?: string[];
  };
}

// Special user configurations - predefined settings for specific emails
export const SPECIAL_USER_CONFIGS: Record<string, UserConfiguration> = {
  'suriyavg834@gmail.com': {
    email: 'suriyavg834@gmail.com',
    auto_settings: {
      name: 'Suriya',
      designation: 'CEO',
      role: UserRole.ADMIN,
      custom_permissions: ['*'] // Full access
    }
  }
  // Additional special users can be added here
};

// Service class for managing special user configurations
export class SpecialUserConfigService {
  /**
   * Get special configuration for a user by email
   */
  static getConfigurationByEmail(email: string): UserConfiguration | null {
    return SPECIAL_USER_CONFIGS[email.toLowerCase()] || null;
  }

  /**
   * Check if an email has special configuration
   */
  static hasSpecialConfiguration(email: string): boolean {
    return email.toLowerCase() in SPECIAL_USER_CONFIGS;
  }

  /**
   * Get all configured special user emails
   */
  static getConfiguredEmails(): string[] {
    return Object.keys(SPECIAL_USER_CONFIGS);
  }

  /**
   * Apply special configuration to user data
   */
  static applyConfiguration(email: string, userData: any): any {
    const config = this.getConfigurationByEmail(email);
    if (!config) {
      return userData;
    }

    return {
      ...userData,
      name: config.auto_settings.name,
      role: config.auto_settings.role,
      designation: config.auto_settings.designation,
      custom_permissions: config.auto_settings.custom_permissions
    };
  }
}
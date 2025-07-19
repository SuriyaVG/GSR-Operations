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

// Special user configurations with predefined settings
const SPECIAL_USER_CONFIGS: Record<string, UserConfiguration> = {
  'suriyavg834@gmail.com': {
    email: 'suriyavg834@gmail.com',
    auto_settings: {
      name: 'Suriya',
      designation: 'CEO',
      role: UserRole.ADMIN,
      custom_permissions: ['*'] // All permissions
    }
  }
  // Additional special users can be added here
};

// Service class for managing special user configurations
export class SpecialUserConfigService {
  /**
   * Get configuration for a specific email
   */
  static getConfigurationByEmail(email: string): UserConfiguration | null {
    const normalizedEmail = email.toLowerCase().trim();
    return SPECIAL_USER_CONFIGS[normalizedEmail] || null;
  }

  /**
   * Check if an email has special configuration
   */
  static isSpecialUser(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    return normalizedEmail in SPECIAL_USER_CONFIGS;
  }

  /**
   * Get all special user configurations
   */
  static getAllConfigurations(): UserConfiguration[] {
    return Object.values(SPECIAL_USER_CONFIGS);
  }

  /**
   * Get special user emails
   */
  static getSpecialUserEmails(): string[] {
    return Object.keys(SPECIAL_USER_CONFIGS);
  }

  /**
   * Apply special configuration to user data
   */
  static applySpecialConfiguration(email: string, userData: any): any {
    const config = this.getConfigurationByEmail(email);
    
    if (!config) {
      return userData;
    }

    return {
      ...userData,
      name: config.auto_settings.name,
      designation: config.auto_settings.designation,
      role: config.auto_settings.role,
      custom_settings: {
        ...userData.custom_settings,
        special_permissions: config.auto_settings.custom_permissions
      }
    };
  }

  /**
   * Validate special user configuration
   */
  static validateConfiguration(config: UserConfiguration): boolean {
    if (!config.email || !config.auto_settings) {
      return false;
    }

    const { name, designation, role } = config.auto_settings;
    
    if (!name || !designation || !role) {
      return false;
    }

    // Validate role is a valid UserRole
    if (!Object.values(UserRole).includes(role)) {
      return false;
    }

    return true;
  }

  /**
   * Add or update special user configuration (for admin use)
   */
  static addConfiguration(config: UserConfiguration): boolean {
    if (!this.validateConfiguration(config)) {
      throw new Error('Invalid user configuration');
    }

    const normalizedEmail = config.email.toLowerCase().trim();
    SPECIAL_USER_CONFIGS[normalizedEmail] = {
      ...config,
      email: normalizedEmail
    };

    return true;
  }

  /**
   * Remove special user configuration (for admin use)
   */
  static removeConfiguration(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!(normalizedEmail in SPECIAL_USER_CONFIGS)) {
      return false;
    }

    delete SPECIAL_USER_CONFIGS[normalizedEmail];
    return true;
  }
}

// Export the configurations for external access if needed
export { SPECIAL_USER_CONFIGS };
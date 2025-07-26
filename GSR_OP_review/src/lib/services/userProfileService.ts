import { 
  User, 
  UserRole,
  UserProfileManager 
} from '@/Entities/User';
import type { 
  UserProfile, 
  EnhancedUserProfile, 
  ProfileUpdateRequest, 
  AuditLogEntry
} from '@/Entities/User';
import { SpecialUserConfigService } from '@/lib/config/specialUsers';
import type { UserConfiguration } from '@/lib/config/specialUsers';
import { supabase } from '@/lib/supabase';
import { validateField, validators } from '@/lib/validation';
import { toast } from '@/lib/toast';
import { AuditService } from '@/lib/services/auditService';
import { ErrorHandlingService, UserManagementErrorType } from '@/lib/services/errorHandlingService';

// Profile validation rules
const PROFILE_VALIDATION_RULES = {
  name: {
    required: true,
    minLength: { value: 2, message: "Name must be at least 2 characters" },
    maxLength: { value: 100, message: "Name must be no more than 100 characters" },
    pattern: { 
      value: /^[a-zA-Z0-9\s'-]+$/, 
      message: "Name can only contain letters, numbers, spaces, hyphens, and apostrophes" 
    }
  },
  designation: {
    maxLength: { value: 50, message: "Designation must be no more than 50 characters" },
    pattern: { 
      value: /^[a-zA-Z0-9\s'-]+$/, 
      message: "Designation can only contain letters, numbers, spaces, hyphens, and apostrophes" 
    }
  },
  displayName: {
    maxLength: { value: 100, message: "Display name must be no more than 100 characters" }
  },
  title: {
    maxLength: { value: 50, message: "Title must be no more than 50 characters" }
  },
  department: {
    maxLength: { value: 50, message: "Department must be no more than 50 characters" }
  }
};

// Profile update validation result
export interface ProfileValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

// Profile update response
export interface ProfileUpdateResponse {
  success: boolean;
  user?: User;
  errors?: Array<{ field: string; message: string }>;
  message?: string;
}

/**
 * UserProfileService - Handles user profile management operations
 * 
 * This service provides methods for:
 * - Profile updates with validation
 * - Special user configuration detection and application
 * - Profile validation and error handling
 * - Integration with Supabase operations
 */
export class UserProfileService {
  
  /**
   * Update user profile with validation and error handling
   * 
   * @param userId - The ID of the user to update
   * @param updates - Profile update data
   * @param updatedBy - ID of the user performing the update (optional, defaults to userId)
   * @returns Promise<ProfileUpdateResponse>
   */
  static async updateProfile(
    userId: string, 
    updates: ProfileUpdateRequest,
    updatedBy?: string
  ): Promise<ProfileUpdateResponse> {
    try {
      // Validate input data
      const validationResult = this.validateProfileUpdate(updates);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          message: 'Profile validation failed'
        };
      }

      // Get current user profile
      const currentProfile = await UserProfileManager.getEnhancedUserProfile(userId);
      if (!currentProfile) {
        return {
          success: false,
          message: 'User profile not found'
        };
      }

      // Prepare profile updates
      const profileUpdates: Partial<EnhancedUserProfile> = {};
      
      if (updates.name !== undefined) {
        profileUpdates.name = updates.name.trim();
      }
      
      if (updates.designation !== undefined) {
        profileUpdates.designation = updates.designation.trim() || undefined;
      }
      
      if (updates.custom_settings !== undefined) {
        profileUpdates.custom_settings = {
          ...currentProfile.custom_settings,
          ...updates.custom_settings
        };
        
        // Clean up custom settings
        if (updates.custom_settings.display_name !== undefined) {
          profileUpdates.custom_settings.display_name = 
            updates.custom_settings.display_name?.trim() || undefined;
        }
        
        if (updates.custom_settings.title !== undefined) {
          profileUpdates.custom_settings.title = 
            updates.custom_settings.title?.trim() || undefined;
        }
        
        if (updates.custom_settings.department !== undefined) {
          profileUpdates.custom_settings.department = 
            updates.custom_settings.department?.trim() || undefined;
        }
      }

      // Create audit log entry for the update
      const auditEntry = await AuditService.createAuditLog(
        userId,
        'profile_update',
        this.extractAuditableFields(currentProfile),
        this.extractAuditableFields({ ...currentProfile, ...profileUpdates }),
        updatedBy || userId
      );

      // Update the profile in database
      const updatedProfile = await UserProfileManager.updateEnhancedUserProfile(
        userId, 
        profileUpdates, 
        updatedBy || userId
      );

      // Get current Supabase user to create full User object
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser || supabaseUser.id !== userId) {
        // If updating another user's profile, we need to fetch their auth data differently
        // For now, we'll return a success response without the full user object
        return {
          success: true,
          message: 'Profile updated successfully'
        };
      }

      // Create updated User object
      const updatedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: updatedProfile.role,
        name: updatedProfile.name || undefined,
        designation: updatedProfile.designation,
        custom_settings: updatedProfile.custom_settings,
        last_profile_update: updatedProfile.last_profile_update,
        updated_by: updatedProfile.updated_by,
        active: updatedProfile.active,
        created_at: supabaseUser.created_at,
        updated_at: updatedProfile.updated_at,
        last_login: supabaseUser.last_sign_in_at || undefined,
        email_confirmed_at: supabaseUser.email_confirmed_at || undefined,
        phone: supabaseUser.phone || undefined,
        phone_confirmed_at: supabaseUser.phone_confirmed_at || undefined,
        app_metadata: supabaseUser.app_metadata,
        user_metadata: supabaseUser.user_metadata
      };

      return {
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      console.error('Profile update error:', error);
      
      // Use error handling service for standardized error handling
      const recoverableError = ErrorHandlingService.handleProfileUpdateError(error, {
        userId,
        formData: updates
      });
      
      // Return error response with standardized message
      return {
        success: false,
        message: recoverableError.message,
        errors: recoverableError.type === UserManagementErrorType.VALIDATION_ERROR 
          ? [{ field: 'general', message: recoverableError.message }] 
          : undefined
      };
    }
  }

  /**
   * Apply special user configuration based on email
   * 
   * @param email - User email to check for special configuration
   * @returns Promise<UserConfiguration | null>
   */
  static async applySpecialConfiguration(email: string): Promise<UserConfiguration | null> {
    try {
      const config = SpecialUserConfigService.getConfigurationByEmail(email);
      
      if (config) {
        console.log(`Applying special configuration for user: ${email}`);
        return config;
      }
      
      return null;
    } catch (error) {
      console.error('Error applying special configuration:', error);
      return null;
    }
  }

  /**
   * Get user profile history (audit trail)
   * 
   * @param userId - User ID to get history for
   * @param limit - Maximum number of entries to return (default: 50)
   * @returns Promise<AuditLogEntry[]>
   */
  static async getProfileHistory(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      return await AuditService.getUserAuditLogs(userId, limit);
    } catch (error) {
      console.error('Error fetching profile history:', error);
      return [];
    }
  }

  /**
   * Validate profile update data
   * 
   * @param updates - Profile update data to validate
   * @returns ProfileValidationResult
   */
  static validateProfileUpdate(updates: ProfileUpdateRequest): ProfileValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate name
    if (updates.name !== undefined) {
      const nameError = validateField(updates.name, PROFILE_VALIDATION_RULES.name);
      if (nameError) {
        errors.push({ field: 'name', message: nameError });
      }
    }

    // Validate designation
    if (updates.designation !== undefined && updates.designation !== '') {
      const designationError = validateField(updates.designation, PROFILE_VALIDATION_RULES.designation);
      if (designationError) {
        errors.push({ field: 'designation', message: designationError });
      }
    }

    // Validate custom settings
    if (updates.custom_settings) {
      const { display_name, title, department } = updates.custom_settings;

      if (display_name !== undefined && display_name !== '') {
        const displayNameError = validateField(display_name, PROFILE_VALIDATION_RULES.displayName);
        if (displayNameError) {
          errors.push({ field: 'custom_settings.display_name', message: displayNameError });
        }
      }

      if (title !== undefined && title !== '') {
        const titleError = validateField(title, PROFILE_VALIDATION_RULES.title);
        if (titleError) {
          errors.push({ field: 'custom_settings.title', message: titleError });
        }
      }

      if (department !== undefined && department !== '') {
        const departmentError = validateField(department, PROFILE_VALIDATION_RULES.department);
        if (departmentError) {
          errors.push({ field: 'custom_settings.department', message: departmentError });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user has special configuration
   * 
   * @param email - User email to check
   * @returns boolean
   */
  static isSpecialUser(email: string): boolean {
    return SpecialUserConfigService.isSpecialUser(email);
  }

  /**
   * Get special user configuration by email
   * 
   * @param email - User email
   * @returns UserConfiguration | null
   */
  static getSpecialUserConfiguration(email: string): UserConfiguration | null {
    return SpecialUserConfigService.getConfigurationByEmail(email);
  }

  /**
   * Create enhanced user profile with special configuration detection
   * 
   * @param userId - User ID
   * @param email - User email
   * @param defaultName - Default name if no special config
   * @returns Promise<EnhancedUserProfile>
   */
  static async createEnhancedProfileWithSpecialConfig(
    userId: string,
    email: string,
    defaultName?: string
  ): Promise<EnhancedUserProfile> {
    try {
      // Check for special configuration
      const specialConfig = await this.applySpecialConfiguration(email);
      
      if (specialConfig) {
        // Create profile with special configuration
        const profile = await UserProfileManager.createEnhancedUserProfile({
          id: userId,
          role: specialConfig.auto_settings.role,
          name: specialConfig.auto_settings.name,
          designation: specialConfig.auto_settings.designation,
          custom_settings: {
            special_permissions: specialConfig.auto_settings.custom_permissions
          },
          active: true,
          updated_by: 'system'
        });

        // Log the special configuration application
        await AuditService.createAuditLog(
          userId,
          'profile_update',
          {},
          this.extractAuditableFields(profile),
          'system'
        );

        toast.success(`Welcome ${specialConfig.auto_settings.name}! Special configuration applied.`);
        
        return profile;
      } else {
        // Create default profile
        const profile = await UserProfileManager.createEnhancedUserProfile({
          id: userId,
          role: UserRole.VIEWER,
          name: defaultName || email.split('@')[0],
          active: true,
          updated_by: userId
        });

        return profile;
      }
    } catch (error) {
      console.error('Error creating enhanced profile with special config:', error);
      throw error;
    }
  }

  // Audit logging is now handled by AuditService

  /**
   * Extract auditable fields from profile data
   * 
   * @param profile - Profile data
   * @returns Record<string, any>
   */
  private static extractAuditableFields(profile: Partial<EnhancedUserProfile>): Record<string, any> {
    return {
      name: profile.name,
      designation: profile.designation,
      role: profile.role,
      custom_settings: profile.custom_settings,
      active: profile.active
    };
  }

  /**
   * Sanitize profile update input
   * 
   * @param updates - Raw profile updates
   * @returns ProfileUpdateRequest
   */
  static sanitizeProfileUpdate(updates: any): ProfileUpdateRequest {
    const sanitized: ProfileUpdateRequest = {};

    if (updates.name !== undefined) {
      sanitized.name = typeof updates.name === 'string' ? updates.name.trim() : '';
    }

    if (updates.designation !== undefined) {
      sanitized.designation = typeof updates.designation === 'string' ? updates.designation.trim() : '';
    }

    if (updates.custom_settings && typeof updates.custom_settings === 'object') {
      sanitized.custom_settings = {};

      // Always set these fields if they exist in the input, even if undefined
      const customSettings = updates.custom_settings;
      
      if ('display_name' in customSettings) {
        sanitized.custom_settings.display_name = 
          typeof customSettings.display_name === 'string' 
            ? customSettings.display_name.trim() 
            : '';
      }

      if ('title' in customSettings) {
        sanitized.custom_settings.title = 
          typeof customSettings.title === 'string' 
            ? customSettings.title.trim() 
            : '';
      }

      if ('department' in customSettings) {
        sanitized.custom_settings.department = 
          typeof customSettings.department === 'string' 
            ? customSettings.department.trim() 
            : '';
      }
    }

    return sanitized;
  }

  /**
   * Get profile update summary for user feedback
   * 
   * @param oldProfile - Previous profile data
   * @param newProfile - Updated profile data
   * @returns string
   */
  static getUpdateSummary(
    oldProfile: Partial<EnhancedUserProfile>, 
    newProfile: Partial<EnhancedUserProfile>
  ): string {
    const changes: string[] = [];

    if (oldProfile.name !== newProfile.name) {
      changes.push(`name updated to "${newProfile.name}"`);
    }

    if (oldProfile.designation !== newProfile.designation) {
      if (newProfile.designation) {
        changes.push(`designation set to "${newProfile.designation}"`);
      } else {
        changes.push('designation removed');
      }
    }

    if (changes.length === 0) {
      return 'Profile updated';
    }

    return `Profile updated: ${changes.join(', ')}`;
  }
}
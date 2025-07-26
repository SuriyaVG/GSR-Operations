// src/lib/services/errorHandlingService.ts
// Error handling service for user management operations

import { toast } from '@/lib/toast';
import { DatabaseErrorType } from '@/lib/database';

// Error types specific to user management
export enum UserManagementErrorType {
  PROFILE_UPDATE_ERROR = 'profile_update_error',
  ROLE_CHANGE_ERROR = 'role_change_error',
  PERMISSION_ERROR = 'permission_error',
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  CONNECTION_ERROR = 'connection_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error recovery actions
export enum ErrorRecoveryAction {
  RETRY = 'retry',
  REFRESH = 'refresh',
  LOGOUT = 'logout',
  CONTACT_ADMIN = 'contact_admin',
  EDIT_INPUT = 'edit_input',
  CANCEL = 'cancel'
}

// Error context for user management operations
export interface ErrorContext {
  operation: string;
  userId?: string;
  entityId?: string;
  formData?: Record<string, any>;
  timestamp: number;
}

// Error with recovery options
export interface RecoverableError {
  type: UserManagementErrorType | DatabaseErrorType;
  message: string;
  technicalDetails?: string;
  recoveryActions: ErrorRecoveryAction[];
  context?: ErrorContext;
}

/**
 * Error Handling Service for User Management
 * 
 * Provides standardized error handling, user-friendly messages,
 * and recovery options for user management operations
 */
export class ErrorHandlingService {
  
  /**
   * Handle profile update errors with user-friendly messages and recovery options
   * 
   * @param error - The error that occurred
   * @param context - Additional context about the operation
   * @returns RecoverableError with user-friendly message and recovery options
   */
  static handleProfileUpdateError(error: any, context?: Partial<ErrorContext>): RecoverableError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let errorType = UserManagementErrorType.PROFILE_UPDATE_ERROR;
    let userMessage = 'Failed to update profile';
    let recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    let technicalDetails = errorMessage;
    
    // Determine error type and appropriate message
    if (errorMessage.includes('validation')) {
      errorType = UserManagementErrorType.VALIDATION_ERROR;
      userMessage = 'Profile validation failed. Please check your input.';
      recoveryActions = [ErrorRecoveryAction.EDIT_INPUT, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      errorType = UserManagementErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to update this profile.';
      recoveryActions = [ErrorRecoveryAction.CONTACT_ADMIN, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      errorType = UserManagementErrorType.AUTHENTICATION_ERROR;
      userMessage = 'Your session has expired. Please log in again.';
      recoveryActions = [ErrorRecoveryAction.LOGOUT, ErrorRecoveryAction.RETRY];
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorType = UserManagementErrorType.CONNECTION_ERROR;
      userMessage = 'Network connection issue. Please check your internet connection.';
      recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    }
    
    // Show toast notification with user-friendly message
    toast.error(userMessage);
    
    // Return recoverable error
    return {
      type: errorType,
      message: userMessage,
      technicalDetails,
      recoveryActions,
      context: {
        operation: 'profile_update',
        timestamp: Date.now(),
        ...context
      }
    };
  }
  
  /**
   * Handle role change errors with user-friendly messages and recovery options
   * 
   * @param error - The error that occurred
   * @param context - Additional context about the operation
   * @returns RecoverableError with user-friendly message and recovery options
   */
  static handleRoleChangeError(error: any, context?: Partial<ErrorContext>): RecoverableError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let errorType = UserManagementErrorType.ROLE_CHANGE_ERROR;
    let userMessage = 'Failed to update user role';
    let recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    let technicalDetails = errorMessage;
    
    // Determine error type and appropriate message
    if (errorMessage.includes('last admin')) {
      errorType = UserManagementErrorType.VALIDATION_ERROR;
      userMessage = 'Cannot demote the last admin user. Promote another user to admin first.';
      recoveryActions = [ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      errorType = UserManagementErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to change user roles.';
      recoveryActions = [ErrorRecoveryAction.CONTACT_ADMIN, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      errorType = UserManagementErrorType.AUTHENTICATION_ERROR;
      userMessage = 'Your session has expired. Please log in again.';
      recoveryActions = [ErrorRecoveryAction.LOGOUT, ErrorRecoveryAction.RETRY];
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorType = UserManagementErrorType.CONNECTION_ERROR;
      userMessage = 'Network connection issue. Please check your internet connection.';
      recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('too many role changes')) {
      errorType = UserManagementErrorType.VALIDATION_ERROR;
      userMessage = 'Too many role changes for this user in the last 24 hours. Please try again later.';
      recoveryActions = [ErrorRecoveryAction.CANCEL];
    }
    
    // Show toast notification with user-friendly message
    toast.error(userMessage);
    
    // Return recoverable error
    return {
      type: errorType,
      message: userMessage,
      technicalDetails,
      recoveryActions,
      context: {
        operation: 'role_change',
        timestamp: Date.now(),
        ...context
      }
    };
  }
  
  /**
   * Handle permission management errors with user-friendly messages and recovery options
   * 
   * @param error - The error that occurred
   * @param context - Additional context about the operation
   * @returns RecoverableError with user-friendly message and recovery options
   */
  static handlePermissionError(error: any, context?: Partial<ErrorContext>): RecoverableError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let errorType = UserManagementErrorType.PERMISSION_ERROR;
    let userMessage = 'Failed to update user permissions';
    let recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    let technicalDetails = errorMessage;
    
    // Determine error type and appropriate message
    if (errorMessage.includes('validation')) {
      errorType = UserManagementErrorType.VALIDATION_ERROR;
      userMessage = 'Invalid permission format. Please check your input.';
      recoveryActions = [ErrorRecoveryAction.EDIT_INPUT, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('access denied')) {
      errorType = UserManagementErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to manage user permissions.';
      recoveryActions = [ErrorRecoveryAction.CONTACT_ADMIN, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      errorType = UserManagementErrorType.AUTHENTICATION_ERROR;
      userMessage = 'Your session has expired. Please log in again.';
      recoveryActions = [ErrorRecoveryAction.LOGOUT, ErrorRecoveryAction.RETRY];
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorType = UserManagementErrorType.CONNECTION_ERROR;
      userMessage = 'Network connection issue. Please check your internet connection.';
      recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    }
    
    // Show toast notification with user-friendly message
    toast.error(userMessage);
    
    // Return recoverable error
    return {
      type: errorType,
      message: userMessage,
      technicalDetails,
      recoveryActions,
      context: {
        operation: 'permission_management',
        timestamp: Date.now(),
        ...context
      }
    };
  }
  
  /**
   * Handle general user management errors with user-friendly messages and recovery options
   * 
   * @param error - The error that occurred
   * @param operation - The operation being performed
   * @param context - Additional context about the operation
   * @returns RecoverableError with user-friendly message and recovery options
   */
  static handleUserManagementError(
    error: any, 
    operation: string,
    context?: Partial<ErrorContext>
  ): RecoverableError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let errorType = UserManagementErrorType.UNKNOWN_ERROR;
    let userMessage = `Failed to perform operation: ${operation}`;
    let recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    let technicalDetails = errorMessage;
    
    // Determine error type and appropriate message
    if (errorMessage.includes('validation')) {
      errorType = UserManagementErrorType.VALIDATION_ERROR;
      userMessage = 'Validation failed. Please check your input.';
      recoveryActions = [ErrorRecoveryAction.EDIT_INPUT, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      errorType = UserManagementErrorType.PERMISSION_ERROR;
      userMessage = 'You do not have permission to perform this operation.';
      recoveryActions = [ErrorRecoveryAction.CONTACT_ADMIN, ErrorRecoveryAction.CANCEL];
    } else if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      errorType = UserManagementErrorType.AUTHENTICATION_ERROR;
      userMessage = 'Your session has expired. Please log in again.';
      recoveryActions = [ErrorRecoveryAction.LOGOUT, ErrorRecoveryAction.RETRY];
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorType = UserManagementErrorType.CONNECTION_ERROR;
      userMessage = 'Network connection issue. Please check your internet connection.';
      recoveryActions = [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CANCEL];
    }
    
    // Show toast notification with user-friendly message
    toast.error(userMessage);
    
    // Return recoverable error
    return {
      type: errorType,
      message: userMessage,
      technicalDetails,
      recoveryActions,
      context: {
        operation,
        timestamp: Date.now(),
        ...context
      }
    };
  }
  
  /**
   * Get user-friendly message for database errors
   * 
   * @param errorType - Database error type
   * @returns User-friendly error message
   */
  static getDatabaseErrorMessage(errorType: DatabaseErrorType): string {
    switch (errorType) {
      case DatabaseErrorType.CONNECTION_ERROR:
        return 'Unable to connect to the server. Please check your internet connection.';
      case DatabaseErrorType.QUERY_ERROR:
        return 'Error retrieving data. Please try again.';
      case DatabaseErrorType.TIMEOUT_ERROR:
        return 'Operation timed out. Please try again.';
      case DatabaseErrorType.VALIDATION_ERROR:
        return 'Invalid data provided. Please check your input.';
      case DatabaseErrorType.PERMISSION_ERROR:
        return 'You do not have permission to perform this operation.';
      case DatabaseErrorType.AUTHENTICATION_ERROR:
        return 'Your session has expired. Please log in again.';
      case DatabaseErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.';
      case DatabaseErrorType.CONSTRAINT_ERROR:
        return 'Operation failed due to data constraints. Please check your input.';
      case DatabaseErrorType.RLS_ERROR:
        return 'Access denied. You do not have permission to access this data.';
      case DatabaseErrorType.SUPABASE_ERROR:
        return 'Database service error. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  /**
   * Get recovery action label for UI display
   * 
   * @param action - Recovery action
   * @returns User-friendly action label
   */
  static getRecoveryActionLabel(action: ErrorRecoveryAction): string {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        return 'Try Again';
      case ErrorRecoveryAction.REFRESH:
        return 'Refresh Page';
      case ErrorRecoveryAction.LOGOUT:
        return 'Log Out';
      case ErrorRecoveryAction.CONTACT_ADMIN:
        return 'Contact Admin';
      case ErrorRecoveryAction.EDIT_INPUT:
        return 'Edit Input';
      case ErrorRecoveryAction.CANCEL:
        return 'Cancel';
      default:
        return 'OK';
    }
  }
}
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ErrorHandlingService, 
  UserManagementErrorType, 
  ErrorRecoveryAction 
} from '../errorHandlingService';

// Mock toast
vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleProfileUpdateError', () => {
    it('should handle validation errors', () => {
      const error = new Error('validation failed');
      const result = ErrorHandlingService.handleProfileUpdateError(error);

      expect(result.type).toBe(UserManagementErrorType.VALIDATION_ERROR);
      expect(result.message).toContain('validation');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.EDIT_INPUT);
    });

    it('should handle permission errors', () => {
      const error = new Error('permission denied');
      const result = ErrorHandlingService.handleProfileUpdateError(error);

      expect(result.type).toBe(UserManagementErrorType.PERMISSION_ERROR);
      expect(result.message).toContain('permission');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.CONTACT_ADMIN);
    });

    it('should handle authentication errors', () => {
      const error = new Error('authentication required');
      const result = ErrorHandlingService.handleProfileUpdateError(error);

      expect(result.type).toBe(UserManagementErrorType.AUTHENTICATION_ERROR);
      expect(result.message).toContain('session');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.LOGOUT);
    });

    it('should handle connection errors', () => {
      const error = new Error('network connection issue');
      const result = ErrorHandlingService.handleProfileUpdateError(error);

      expect(result.type).toBe(UserManagementErrorType.CONNECTION_ERROR);
      expect(result.message).toContain('connection');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.RETRY);
    });

    it('should handle generic errors', () => {
      const error = new Error('unknown error');
      const result = ErrorHandlingService.handleProfileUpdateError(error);

      expect(result.type).toBe(UserManagementErrorType.PROFILE_UPDATE_ERROR);
      expect(result.message).toContain('Failed to update profile');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.RETRY);
    });

    it('should include context in the error', () => {
      const error = new Error('test error');
      const context = { userId: '123', formData: { name: 'Test' } };
      const result = ErrorHandlingService.handleProfileUpdateError(error, context);

      expect(result.context?.userId).toBe('123');
      expect(result.context?.formData).toEqual({ name: 'Test' });
      expect(result.context?.operation).toBe('profile_update');
      expect(result.context?.timestamp).toBeDefined();
    });
  });

  describe('handleRoleChangeError', () => {
    it('should handle last admin error', () => {
      const error = new Error('cannot demote the last admin');
      const result = ErrorHandlingService.handleRoleChangeError(error);

      expect(result.type).toBe(UserManagementErrorType.VALIDATION_ERROR);
      expect(result.message).toContain('last admin');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.CANCEL);
    });

    it('should handle too many role changes error', () => {
      const error = new Error('too many role changes in the last 24 hours');
      const result = ErrorHandlingService.handleRoleChangeError(error);

      expect(result.type).toBe(UserManagementErrorType.VALIDATION_ERROR);
      expect(result.message).toContain('Too many role changes');
      expect(result.recoveryActions).toContain(ErrorRecoveryAction.CANCEL);
    });
  });

  describe('getRecoveryActionLabel', () => {
    it('should return correct labels for recovery actions', () => {
      expect(ErrorHandlingService.getRecoveryActionLabel(ErrorRecoveryAction.RETRY)).toBe('Try Again');
      expect(ErrorHandlingService.getRecoveryActionLabel(ErrorRecoveryAction.REFRESH)).toBe('Refresh Page');
      expect(ErrorHandlingService.getRecoveryActionLabel(ErrorRecoveryAction.LOGOUT)).toBe('Log Out');
      expect(ErrorHandlingService.getRecoveryActionLabel(ErrorRecoveryAction.CONTACT_ADMIN)).toBe('Contact Admin');
      expect(ErrorHandlingService.getRecoveryActionLabel(ErrorRecoveryAction.EDIT_INPUT)).toBe('Edit Input');
      expect(ErrorHandlingService.getRecoveryActionLabel(ErrorRecoveryAction.CANCEL)).toBe('Cancel');
    });
  });
});
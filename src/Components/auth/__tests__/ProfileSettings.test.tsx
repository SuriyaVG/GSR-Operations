import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileSettings } from '../ProfileSettings';
import { useAuth } from '@/lib/auth';
import { UserProfileService } from '@/lib/services/userProfileService';
import { useToast } from '@/Components/ui/toast';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/lib/auth');
vi.mock('@/lib/services/userProfileService');
vi.mock('@/Components/ui/toast');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/test' })
  };
});

const mockUseAuth = vi.mocked(useAuth);
const mockUserProfileService = vi.mocked(UserProfileService, true);
const mockUseToast = vi.mocked(useToast);

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'John Doe',
  role: 'admin' as const,
  designation: 'Manager',
  custom_settings: {
    display_name: 'Johnny',
    title: 'Senior Manager',
    department: 'Engineering'
  }
};

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  dismiss: vi.fn(),
  clear: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    clear: vi.fn()
  }
};

describe('ProfileSettings', () => {
  const mockOnOpenChange = vi.fn();
  const mockUpdateProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      updateProfile: mockUpdateProfile,
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      canOverridePrice: vi.fn(),
      canAccessFinancialData: vi.fn(),
      canModifyInventory: vi.fn(),
      canManageCustomers: vi.fn(),
      isSpecialUser: vi.fn(),
      getSpecialUserConfig: vi.fn(),
      refreshUserPermissions: vi.fn(),
      hasCustomPermission: vi.fn(),
      getProfileHistory: vi.fn(),
      subscribeToRoleChanges: vi.fn()
    });

    mockUseToast.mockReturnValue(mockToast);
    mockUserProfileService.sanitizeProfileUpdate.mockImplementation((data) => data);
    mockUserProfileService.getUpdateSummary.mockReturnValue('Profile updated: name updated to "New Name"');
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <ProfileSettings open={true} onOpenChange={mockOnOpenChange} {...props} />
      </BrowserRouter>
    );
  };

  it('renders all form fields with correct initial values', () => {
    renderComponent();
    
    // Check form fields
    expect(screen.getByLabelText(/Name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/Designation/i)).toHaveValue('Manager');
    expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Johnny');
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Senior Manager');
    expect(screen.getByLabelText(/Department/i)).toHaveValue('Engineering');
    
    // Check user info display
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('validates form fields correctly', async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Test name validation (required)
    await user.clear(screen.getByLabelText(/Name/i));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    
    // Test name validation (too short)
    await user.type(screen.getByLabelText(/Name/i), 'A');
    expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    
    // Test name validation (invalid characters)
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'John123');
    expect(screen.getByText('Name can only contain letters, spaces, hyphens, and apostrophes')).toBeInTheDocument();
    
    // Test designation validation (invalid characters)
    await user.clear(screen.getByLabelText(/Designation/i));
    await user.type(screen.getByLabelText(/Designation/i), 'Manager123');
    expect(screen.getByText('Designation can only contain letters, spaces, hyphens, and apostrophes')).toBeInTheDocument();
    
    // Save button should be disabled when there are validation errors
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });

  it('submits form with valid data', async () => {
    mockUserProfileService.updateProfile.mockResolvedValue({
      success: true,
      user: {
        ...mockUser,
        name: 'New Name',
        designation: 'New Designation'
      },
      message: 'Profile updated successfully'
    });
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    await user.clear(screen.getByLabelText(/Designation/i));
    await user.type(screen.getByLabelText(/Designation/i), 'New Designation');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    // Check if service was called with correct data
    await waitFor(() => {
      expect(mockUserProfileService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'New Name',
          designation: 'New Designation',
          custom_settings: expect.any(Object)
        })
      );
    });
    
    // Check if auth context was updated
    expect(mockUpdateProfile).toHaveBeenCalled();
    
    // Check if success toast was shown
    expect(mockToast.success).toHaveBeenCalledWith('Profile updated: name updated to "New Name"');
    
    // Check if dialog was closed
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles validation errors from the service', async () => {
    mockUserProfileService.updateProfile.mockResolvedValue({
      success: false,
      errors: [
        { field: 'name', message: 'Name is invalid' }
      ],
      message: 'Profile validation failed'
    });
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    // Check if error toast was shown
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please fix the validation errors before saving');
    });
    
    // Check if dialog was not closed
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('handles service errors gracefully', async () => {
    mockUserProfileService.updateProfile.mockRejectedValue(new Error('Service error'));
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Service error/i)).toBeInTheDocument();
    });
    
    // Check if dialog was not closed
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('shows loading state during submission', async () => {
    // Delay the response to show loading state
    mockUserProfileService.updateProfile.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        user: mockUser,
        message: 'Profile updated successfully'
      }), 100))
    );
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    // Check if loading state is shown
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockUserProfileService.updateProfile).toHaveBeenCalled();
    });
  });

  it('handles dialog close with unsaved changes', async () => {
    // Mock confirm to return true (user confirms discard)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values to create unsaved changes
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    // Click cancel button
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    
    // Check if confirmation was shown
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
    
    // Check if dialog was closed
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    
    // Restore original confirm
    confirmSpy.mockRestore();
  });

  it('prevents dialog close when user cancels confirmation', async () => {
    // Mock confirm to return false (user cancels discard)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values to create unsaved changes
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    // Click cancel button
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    
    // Check if confirmation was shown
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
    
    // Check if dialog was not closed
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    
    // Restore original confirm
    confirmSpy.mockRestore();
  });

  it('disables save button when there are no changes', () => {
    renderComponent();
    
    // Save button should be disabled initially (no changes)
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });

  it('enables save button when there are valid changes', async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Valid Name');
    
    // Save button should be enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
    });
  });

  it('handles error recovery actions correctly', async () => {
    // First make the service throw an error
    mockUserProfileService.updateProfile.mockRejectedValue(new Error('Service error'));
    
    renderComponent();
    const user = userEvent.setup();
    
    // Change form values
    await user.clear(screen.getByLabelText(/Name/i));
    await user.type(screen.getByLabelText(/Name/i), 'New Name');
    
    // Submit form to trigger error
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Service error/i)).toBeInTheDocument();
    });
    
    // Now make the service succeed for retry
    mockUserProfileService.updateProfile.mockResolvedValue({
      success: true,
      user: mockUser,
      message: 'Profile updated successfully'
    });
    
    // Click retry button
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    await user.click(retryButton);
    
    // Check if service was called again
    await waitFor(() => {
      expect(mockUserProfileService.updateProfile).toHaveBeenCalledTimes(2);
    });
  });
});
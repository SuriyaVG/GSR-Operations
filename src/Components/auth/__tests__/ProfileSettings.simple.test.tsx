import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileSettings } from '../ProfileSettings';
import { useAuth } from '@/lib/auth';
import { UserProfileService } from '@/lib/services/userProfileService';
import { useToast } from '@/Components/ui/toast';

// Mock dependencies
vi.mock('@/lib/auth');
vi.mock('@/lib/services/userProfileService');
vi.mock('@/Components/ui/toast');

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
    department: 'Operations'
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

describe('ProfileSettings - Simple Tests', () => {
  const mockOnOpenChange = vi.fn();

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
      updateProfile: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      canOverridePrice: vi.fn(),
      canAccessFinancialData: vi.fn(),
      canModifyInventory: vi.fn(),
      canManageCustomers: vi.fn()
    });

    mockUseToast.mockReturnValue(mockToast);
    mockUserProfileService.sanitizeProfileUpdate.mockImplementation((data) => data);
  });

  it('renders profile settings dialog when open', () => {
    render(<ProfileSettings open={true} onOpenChange={mockOnOpenChange} />);
    
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Manager')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ProfileSettings open={false} onOpenChange={mockOnOpenChange} />);
    
    expect(screen.queryByText('Profile Settings')).not.toBeInTheDocument();
  });

  it('displays user email and role information', () => {
    render(<ProfileSettings open={true} onOpenChange={mockOnOpenChange} />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('returns null when user is not available', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      updateProfile: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      canOverridePrice: vi.fn(),
      canAccessFinancialData: vi.fn(),
      canModifyInventory: vi.fn(),
      canManageCustomers: vi.fn()
    });

    const { container } = render(<ProfileSettings open={true} onOpenChange={mockOnOpenChange} />);
    expect(container.firstChild).toBeNull();
  });
});
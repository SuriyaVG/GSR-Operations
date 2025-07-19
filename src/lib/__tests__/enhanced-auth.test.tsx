import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth';
import { User, UserRole } from '../../Entities/User';
import { UserProfileService } from '../services/userProfileService';
import { SpecialUserConfigService } from '../config/specialUsers';
import { supabase } from '../supabase';
import { toast } from '../toast';

// Mock dependencies
vi.mock('../../Entities/User', () => ({
  User: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    updateProfile: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  UserRole: {
    ADMIN: 'admin',
    PRODUCTION: 'production',
    SALES_MANAGER: 'sales_manager',
    FINANCE: 'finance',
    VIEWER: 'viewer'
  },
  AuthorizationService: {
    hasPermission: vi.fn(),
    hasRole: vi.fn(),
    canOverridePrice: vi.fn(),
    canAccessFinancialData: vi.fn(),
    canModifyInventory: vi.fn(),
    canManageCustomers: vi.fn()
  }
}));

vi.mock('../services/userProfileService', () => ({
  UserProfileService: {
    updateProfile: vi.fn(),
    isSpecialUser: vi.fn(),
    getSpecialUserConfiguration: vi.fn(),
    getProfileHistory: vi.fn(),
    sanitizeProfileUpdate: vi.fn(updates => updates)
  }
}));

vi.mock('../config/specialUsers', () => ({
  SpecialUserConfigService: {
    getConfigurationByEmail: vi.fn(),
    isSpecialUser: vi.fn()
  }
}));

vi.mock('../supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}));

vi.mock('../toast', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}));

// Test component that uses enhanced auth context
function EnhancedAuthTestComponent() {
  const { 
    user, 
    loading, 
    updateProfile, 
    isSpecialUser, 
    getSpecialUserConfig,
    refreshUserPermissions,
    hasCustomPermission,
    getProfileHistory,
    subscribeToRoleChanges
  } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-info">
        {user ? `Logged in as: ${user.email}` : 'Not logged in'}
      </div>
      <button onClick={() => updateProfile({ name: 'Updated Name' })}>Update Profile</button>
      <button onClick={() => refreshUserPermissions()}>Refresh Permissions</button>
      <div data-testid="special-user">{isSpecialUser() ? 'Special User' : 'Regular User'}</div>
      <button onClick={() => {
        const unsubscribe = subscribeToRoleChanges((notification) => {
          console.log('Role changed:', notification);
        });
        // Store unsubscribe function somewhere if needed
      }}>Subscribe to Role Changes</button>
    </div>
  );
}

describe('Enhanced AuthProvider', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    name: 'Test User',
    active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    custom_settings: {
      special_permissions: ['order:create', 'customer:*']
    }
  };

  const mockSpecialUser = {
    id: '2',
    email: 'special@example.com',
    role: UserRole.ADMIN,
    name: 'Special User',
    designation: 'CEO',
    active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    custom_settings: {
      special_permissions: ['*']
    }
  };

  const mockSpecialConfig = {
    email: 'special@example.com',
    auto_settings: {
      name: 'Special User',
      designation: 'CEO',
      role: UserRole.ADMIN,
      custom_permissions: ['*']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock onAuthStateChange to return a subscription
    vi.mocked(User.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    });

    // Mock supabase channel
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    } as any);
  });

  it('should handle enhanced profile updates', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(UserProfileService.updateProfile).mockResolvedValue({
      success: true,
      user: { ...mockUser, name: 'Updated Name' },
      message: 'Profile updated successfully'
    });

    render(
      <AuthProvider>
        <EnhancedAuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Update Profile').click();
    });

    await waitFor(() => {
      expect(UserProfileService.updateProfile).toHaveBeenCalledWith(
        '1', 
        { name: 'Updated Name' }
      );
    });
  });

  it('should detect special users', async () => {
    vi.mocked(User.me).mockResolvedValue(mockSpecialUser);
    vi.mocked(UserProfileService.isSpecialUser).mockReturnValue(true);
    vi.mocked(UserProfileService.getSpecialUserConfiguration).mockReturnValue(mockSpecialConfig);

    render(
      <AuthProvider>
        <EnhancedAuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('special-user')).toHaveTextContent('Special User');
    });
  });

  it('should refresh user permissions', async () => {
    const initialUser = { ...mockUser };
    const updatedUser = { ...mockUser, role: UserRole.SALES_MANAGER };
    
    vi.mocked(User.me)
      .mockResolvedValueOnce(initialUser)
      .mockResolvedValueOnce(updatedUser);

    render(
      <AuthProvider>
        <EnhancedAuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Refresh Permissions').click();
    });

    await waitFor(() => {
      expect(User.me).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle login with special user detection', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(User.login).mockResolvedValue(mockSpecialUser);
    vi.mocked(UserProfileService.isSpecialUser).mockReturnValue(true);

    render(
      <AuthProvider>
        <EnhancedAuthTestComponent />
      </AuthProvider>
    );

    const { login } = useAuth();

    await act(async () => {
      await login('special@example.com', 'password');
    });

    await waitFor(() => {
      expect(UserProfileService.isSpecialUser).toHaveBeenCalledWith('special@example.com');
    });
  });

  it('should handle profile update failure', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(UserProfileService.updateProfile).mockResolvedValue({
      success: false,
      message: 'Profile validation failed',
      errors: [{ field: 'name', message: 'Invalid name' }]
    });

    render(
      <AuthProvider>
        <EnhancedAuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    let result;
    await act(async () => {
      const { updateProfile } = useAuth();
      result = await updateProfile({ name: 'Invalid Name' });
    });

    expect(result).toEqual({
      success: false,
      message: 'Profile validation failed',
      errors: [{ field: 'name', message: 'Invalid name' }]
    });
  });

  it('should set up role change subscription', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <EnhancedAuthTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Subscribe to Role Changes').click();
    });

    expect(supabase.channel).toHaveBeenCalled();
  });
});
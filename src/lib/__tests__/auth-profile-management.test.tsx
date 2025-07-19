import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../auth';
import { UserProfileService } from '../services/userProfileService';
import { User } from '@/Entities/User';
import { supabase } from '../supabase';

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn()
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }),
    removeChannel: vi.fn()
  }
}));

vi.mock('@/Entities/User', () => ({
  User: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  },
  UserRole: {
    ADMIN: 'admin',
    PRODUCTION: 'production',
    SALES_MANAGER: 'sales_manager',
    FINANCE: 'finance',
    VIEWER: 'viewer'
  },
  AuthorizationService: {
    hasRole: vi.fn(),
    hasPermission: vi.fn(),
    canOverridePrice: vi.fn(),
    canAccessFinancialData: vi.fn(),
    canModifyInventory: vi.fn(),
    canManageCustomers: vi.fn(),
    getUserPermissions: vi.fn()
  }
}));

vi.mock('../services/userProfileService', () => ({
  UserProfileService: {
    updateProfile: vi.fn(),
    sanitizeProfileUpdate: vi.fn(data => data),
    isSpecialUser: vi.fn(),
    getSpecialUserConfiguration: vi.fn(),
    getProfileHistory: vi.fn(),
    getUpdateSummary: vi.fn()
  }
}));

vi.mock('../toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}));

// Test component that uses auth context
const TestComponent = () => {
  const { 
    user, 
    updateProfile, 
    isSpecialUser, 
    getSpecialUserConfig, 
    refreshUserPermissions,
    hasCustomPermission,
    getProfileHistory,
    subscribeToRoleChanges
  } = useAuth();

  const handleUpdateProfile = async () => {
    await updateProfile({ name: 'Updated Name' });
  };

  const handleRefreshPermissions = async () => {
    await refreshUserPermissions();
  };

  return (
    <div>
      {user ? (
        <>
          <h1>Logged in as {user.name}</h1>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
          <p>Special user: {isSpecialUser() ? 'Yes' : 'No'}</p>
          <button onClick={handleUpdateProfile}>Update Profile</button>
          <button onClick={handleRefreshPermissions}>Refresh Permissions</button>
        </>
      ) : (
        <h1>Not logged in</h1>
      )}
    </div>
  );
};

describe('Auth Context with Profile Management', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'viewer',
    designation: 'Viewer',
    custom_settings: {
      display_name: 'Tester',
      special_permissions: ['orders:read']
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock User.me to return a user
    vi.mocked(User.me).mockResolvedValue(mockUser);
    
    // Mock supabase auth
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          created_at: mockUser.created_at
        }
      },
      error: null
    } as any);
  });

  it('provides enhanced profile management methods', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Check if all profile management methods are provided
    const authContext = useAuth();
    expect(authContext.updateProfile).toBeDefined();
    expect(authContext.isSpecialUser).toBeDefined();
    expect(authContext.getSpecialUserConfig).toBeDefined();
    expect(authContext.refreshUserPermissions).toBeDefined();
    expect(authContext.hasCustomPermission).toBeDefined();
    expect(authContext.getProfileHistory).toBeDefined();
    expect(authContext.subscribeToRoleChanges).toBeDefined();
  });

  it('updates user profile successfully', async () => {
    const updatedUser = {
      ...mockUser,
      name: 'Updated Name'
    };
    
    // Mock successful profile update
    vi.mocked(UserProfileService.updateProfile).mockResolvedValue({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Click update profile button
    fireEvent.click(screen.getByText('Update Profile'));
    
    // Check if UserProfileService was called
    await waitFor(() => {
      expect(UserProfileService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        { name: 'Updated Name' }
      );
    });
    
    // Check if user state was updated
    await waitFor(() => {
      expect(screen.getByText('Logged in as Updated Name')).toBeInTheDocument();
    });
  });

  it('handles profile update errors', async () => {
    // Mock failed profile update
    vi.mocked(UserProfileService.updateProfile).mockResolvedValue({
      success: false,
      message: 'Failed to update profile'
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Click update profile button
    fireEvent.click(screen.getByText('Update Profile'));
    
    // Check if UserProfileService was called
    await waitFor(() => {
      expect(UserProfileService.updateProfile).toHaveBeenCalled();
    });
    
    // User state should not change
    expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
  });

  it('detects special users correctly', async () => {
    // Mock special user detection
    vi.mocked(UserProfileService.isSpecialUser).mockReturnValue(true);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Check if special user status is displayed
    expect(screen.getByText('Special user: Yes')).toBeInTheDocument();
    
    // Check if isSpecialUser was called with the right email
    expect(UserProfileService.isSpecialUser).toHaveBeenCalledWith(mockUser.email);
  });

  it('refreshes user permissions', async () => {
    const updatedUser = {
      ...mockUser,
      role: 'admin'
    };
    
    // Mock User.me to return updated user on second call
    vi.mocked(User.me)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(updatedUser);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
      expect(screen.getByText(`Role: ${mockUser.role}`)).toBeInTheDocument();
    });
    
    // Click refresh permissions button
    fireEvent.click(screen.getByText('Refresh Permissions'));
    
    // Check if User.me was called again
    await waitFor(() => {
      expect(User.me).toHaveBeenCalledTimes(2);
    });
    
    // Check if user state was updated with new role
    await waitFor(() => {
      expect(screen.getByText('Role: admin')).toBeInTheDocument();
    });
  });

  it('checks custom permissions correctly', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Get auth context
    const authContext = useAuth();
    
    // Check specific permission that exists
    expect(authContext.hasCustomPermission('orders', 'read')).toBe(true);
    
    // Check permission that doesn't exist
    expect(authContext.hasCustomPermission('orders', 'create')).toBe(false);
  });

  it('fetches profile history', async () => {
    const mockHistory = [
      {
        id: 'log-1',
        user_id: mockUser.id,
        action: 'profile_update',
        old_values: { name: 'Old Name' },
        new_values: { name: 'Test User' },
        performed_by: mockUser.id,
        timestamp: '2025-01-01T00:00:00Z'
      }
    ];
    
    // Mock getProfileHistory
    vi.mocked(UserProfileService.getProfileHistory).mockResolvedValue(mockHistory);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Get auth context
    const authContext = useAuth();
    
    // Call getProfileHistory
    const history = await authContext.getProfileHistory();
    
    // Check if UserProfileService was called
    expect(UserProfileService.getProfileHistory).toHaveBeenCalledWith(mockUser.id);
    
    // Check if history was returned
    expect(history).toEqual(mockHistory);
  });

  it('subscribes to role changes', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for user to be loaded
    await waitFor(() => {
      expect(screen.getByText(`Logged in as ${mockUser.name}`)).toBeInTheDocument();
    });
    
    // Get auth context
    const authContext = useAuth();
    
    // Create mock callback
    const mockCallback = vi.fn();
    
    // Subscribe to role changes
    const unsubscribe = authContext.subscribeToRoleChanges(mockCallback);
    
    // Check if subscription was created
    expect(typeof unsubscribe).toBe('function');
    
    // Unsubscribe
    unsubscribe();
  });
});
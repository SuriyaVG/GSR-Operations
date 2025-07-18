import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth, ProtectedRoute, PermissionGate } from '../auth';
import { User, UserRole } from '../../Entities/User';
import type { ReactNode } from 'react';

// Mock the User entity
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

// Test component that uses auth context
function TestComponent() {
  const { user, loading, login, register, logout, resetPassword, updatePassword, updateProfile } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-info">
        {user ? `Logged in as: ${user.email}` : 'Not logged in'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => register('test@example.com', 'password', 'Test User')}>Register</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => resetPassword('test@example.com')}>Reset Password</button>
      <button onClick={() => updatePassword('newpassword')}>Update Password</button>
      <button onClick={() => updateProfile({ name: 'Updated Name' })}>Update Profile</button>
    </div>
  );
}

describe('AuthProvider', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    name: 'Test User',
    active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
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
  });

  it('should initialize with loading state', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load authenticated user on initialization', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });
  });

  it('should handle unauthenticated state', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });
  });

  it('should handle login', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(User.login).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(User.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });
  });

  it('should handle registration', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(User.register).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });

    await act(async () => {
      screen.getByText('Register').click();
    });

    await waitFor(() => {
      expect(User.register).toHaveBeenCalledWith('test@example.com', 'password', 'Test User');
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });
  });

  it('should handle logout', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(User.logout).mockResolvedValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    await waitFor(() => {
      expect(User.logout).toHaveBeenCalled();
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });
  });

  it('should handle password reset', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(User.resetPassword).mockResolvedValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Reset Password').click();
    });

    await waitFor(() => {
      expect(User.resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should handle password update', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(User.updatePassword).mockResolvedValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Update Password').click();
    });

    await waitFor(() => {
      expect(User.updatePassword).toHaveBeenCalledWith('newpassword');
    });
  });

  it('should handle profile update', async () => {
    const updatedUser = { ...mockUser, name: 'Updated Name' };
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(User.updateProfile).mockResolvedValue(updatedUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: test@example.com');
    });

    await act(async () => {
      screen.getByText('Update Profile').click();
    });

    await waitFor(() => {
      expect(User.updateProfile).toHaveBeenCalledWith({ name: 'Updated Name' });
    });
  });

  it('should set up auth state change listener', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(User.onAuthStateChange).toHaveBeenCalled();
  });

  it('should cleanup subscription on unmount', () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(User.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock
        }
      }
    });

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

describe('ProtectedRoute', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    name: 'Test User',
    active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    });
  });

  it('should show loading state', async () => {
    vi.mocked(User.me).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show authentication required for unauthenticated user', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument();
    });
  });

  it('should show protected content for authenticated user', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should show custom fallback for unauthenticated user', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <ProtectedRoute fallback={<div>Custom Login Required</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Login Required')).toBeInTheDocument();
    });
  });
});

describe('PermissionGate', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    name: 'Test User',
    active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    });
  });

  it('should show content for authenticated user with permission', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUser);
    
    // Import and mock AuthorizationService
    const { AuthorizationService } = await import('../../Entities/User');
    vi.mocked(AuthorizationService.hasRole).mockReturnValue(true);

    render(
      <AuthProvider>
        <PermissionGate roles={[UserRole.ADMIN]}>
          <div>Admin Content</div>
        </PermissionGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('should hide content for unauthenticated user', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <PermissionGate roles={[UserRole.ADMIN]}>
          <div>Admin Content</div>
        </PermissionGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  it('should show fallback for unauthenticated user', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <PermissionGate roles={[UserRole.ADMIN]} fallback={<div>Access Denied</div>}>
          <div>Admin Content</div>
        </PermissionGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });
});

describe('useAuth hook', () => {
  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
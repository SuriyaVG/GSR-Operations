import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth';
import { User, UserRole, AuthorizationService } from '../../Entities/User';

// Mock dependencies
vi.mock('../../Entities/User', () => ({
  User: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
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
    getUserPermissions: vi.fn()
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

// Test component for dynamic permissions
function DynamicPermissionsTestComponent() {
  const { 
    user, 
    loading, 
    hasPermission, 
    hasCustomPermission,
    refreshUserPermissions
  } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-info">
        {user ? `Logged in as: ${user.email} (${user.role})` : 'Not logged in'}
      </div>
      
      <div data-testid="standard-permission">
        Can create order: {hasPermission('order', 'create') ? 'Yes' : 'No'}
      </div>
      
      <div data-testid="custom-permission">
        Has custom permission: {hasCustomPermission('special_feature', 'access') ? 'Yes' : 'No'}
      </div>
      
      <button onClick={() => refreshUserPermissions()}>
        Refresh Permissions
      </button>
      
      <button onClick={() => {
        const result = hasPermission('financial_report', 'read');
        document.getElementById('permission-check')!.textContent = 
          result ? 'Has permission' : 'No permission';
      }}>
        Check Financial Permission
      </button>
      
      <div id="permission-check" data-testid="permission-check"></div>
    </div>
  );
}

describe('Dynamic Permissions', () => {
  const mockRegularUser = {
    id: '1',
    email: 'user@example.com',
    role: UserRole.SALES_MANAGER,
    name: 'Regular User',
    active: true
  };

  const mockUserWithCustomPermissions = {
    id: '2',
    email: 'custom@example.com',
    role: UserRole.VIEWER,
    name: 'Custom User',
    active: true,
    custom_settings: {
      special_permissions: ['special_feature:access', 'financial_report:read']
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

    // Default permission checks
    vi.mocked(AuthorizationService.hasPermission).mockImplementation(
      (user, resource, action) => {
        if (user.role === UserRole.ADMIN) return true;
        if (user.role === UserRole.SALES_MANAGER && resource === 'order' && action === 'create') return true;
        return false;
      }
    );
  });

  it('should check standard role-based permissions', async () => {
    vi.mocked(User.me).mockResolvedValue(mockRegularUser);

    render(
      <AuthProvider>
        <DynamicPermissionsTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: user@example.com');
      expect(screen.getByTestId('standard-permission')).toHaveTextContent('Can create order: Yes');
      expect(screen.getByTestId('custom-permission')).toHaveTextContent('Has custom permission: No');
    });
  });

  it('should check custom permissions', async () => {
    vi.mocked(User.me).mockResolvedValue(mockUserWithCustomPermissions);

    render(
      <AuthProvider>
        <DynamicPermissionsTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: custom@example.com');
      // Standard permission should be No because the user is a VIEWER
      expect(screen.getByTestId('standard-permission')).toHaveTextContent('Can create order: No');
      // But custom permission should be Yes
      expect(screen.getByTestId('custom-permission')).toHaveTextContent('Has custom permission: Yes');
    });

    // Check another custom permission
    await act(async () => {
      screen.getByText('Check Financial Permission').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('permission-check')).toHaveTextContent('Has permission');
    });
  });

  it('should refresh permissions dynamically', async () => {
    // First return regular user, then user with updated permissions
    vi.mocked(User.me)
      .mockResolvedValueOnce(mockRegularUser)
      .mockResolvedValueOnce(mockUserWithCustomPermissions);

    render(
      <AuthProvider>
        <DynamicPermissionsTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('custom-permission')).toHaveTextContent('Has custom permission: No');
    });

    // Refresh permissions
    await act(async () => {
      screen.getByText('Refresh Permissions').click();
    });

    await waitFor(() => {
      // After refresh, should have the custom permission
      expect(screen.getByTestId('custom-permission')).toHaveTextContent('Has custom permission: Yes');
    });
  });
});
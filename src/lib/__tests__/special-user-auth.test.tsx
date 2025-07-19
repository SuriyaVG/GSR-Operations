import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth';
import { User, UserRole } from '../../Entities/User';
import { UserProfileService } from '../services/userProfileService';
import { SpecialUserConfigService } from '../config/specialUsers';
import type { UserConfiguration } from '../config/specialUsers';

// Mock dependencies
vi.mock('../../Entities/User', () => ({
  User: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
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
    hasRole: vi.fn()
  }
}));

vi.mock('../services/userProfileService', () => ({
  UserProfileService: {
    isSpecialUser: vi.fn(),
    getSpecialUserConfiguration: vi.fn(),
    applySpecialConfiguration: vi.fn()
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

// Test component for special user functionality
function SpecialUserTestComponent() {
  const { 
    user, 
    loading, 
    login, 
    isSpecialUser, 
    getSpecialUserConfig 
  } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-info">
        {user ? `Logged in as: ${user.email} (${user.role})` : 'Not logged in'}
      </div>
      <div data-testid="user-designation">
        {user?.designation || 'No designation'}
      </div>
      <div data-testid="special-status">
        {isSpecialUser() ? 'Special User' : 'Regular User'}
      </div>
      <button onClick={() => login('special@example.com', 'password')}>
        Login as Special User
      </button>
      <button onClick={() => login('regular@example.com', 'password')}>
        Login as Regular User
      </button>
      <button onClick={() => {
        const config = getSpecialUserConfig();
        document.getElementById('config-output')!.textContent = 
          config ? JSON.stringify(config) : 'No special config';
      }}>
        Get Special Config
      </button>
      <div id="config-output" data-testid="config-output"></div>
    </div>
  );
}

describe('Special User Authentication', () => {
  const mockRegularUser = {
    id: '1',
    email: 'regular@example.com',
    role: UserRole.VIEWER,
    name: 'Regular User',
    active: true
  };

  const mockSpecialUser = {
    id: '2',
    email: 'special@example.com',
    role: UserRole.ADMIN,
    name: 'Special User',
    designation: 'CEO',
    active: true,
    custom_settings: {
      special_permissions: ['*']
    }
  };

  const mockSpecialConfig: UserConfiguration = {
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

    // Default mocks for special user detection
    vi.mocked(UserProfileService.isSpecialUser)
      .mockImplementation((email) => email === 'special@example.com');
      
    vi.mocked(UserProfileService.getSpecialUserConfiguration)
      .mockImplementation((email) => email === 'special@example.com' ? mockSpecialConfig : null);
  });

  it('should detect special user on login', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(User.login)
      .mockImplementation(async (email) => {
        if (email === 'special@example.com') {
          return mockSpecialUser;
        }
        return mockRegularUser;
      });

    render(
      <AuthProvider>
        <SpecialUserTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });

    // Login as special user
    await act(async () => {
      screen.getByText('Login as Special User').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: special@example.com');
      expect(screen.getByTestId('special-status')).toHaveTextContent('Special User');
      expect(screen.getByTestId('user-designation')).toHaveTextContent('CEO');
    });

    // Check special user configuration
    await act(async () => {
      screen.getByText('Get Special Config').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('config-output')).toHaveTextContent('CEO');
    });
  });

  it('should handle regular user login', async () => {
    vi.mocked(User.me).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(User.login)
      .mockImplementation(async (email) => {
        if (email === 'special@example.com') {
          return mockSpecialUser;
        }
        return mockRegularUser;
      });

    render(
      <AuthProvider>
        <SpecialUserTestComponent />
      </AuthProvider>
    );

    // Login as regular user
    await act(async () => {
      screen.getByText('Login as Regular User').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: regular@example.com');
      expect(screen.getByTestId('special-status')).toHaveTextContent('Regular User');
      expect(screen.getByTestId('user-designation')).toHaveTextContent('No designation');
    });

    // Check special user configuration
    await act(async () => {
      screen.getByText('Get Special Config').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('config-output')).toHaveTextContent('No special config');
    });
  });

  it('should auto-configure special user on initial load', async () => {
    vi.mocked(User.me).mockResolvedValue(mockSpecialUser);

    render(
      <AuthProvider>
        <SpecialUserTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as: special@example.com');
      expect(screen.getByTestId('special-status')).toHaveTextContent('Special User');
    });
  });
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { AuthProvider } from '@/lib/auth';
import { UserRole } from '@/Entities/User';

// Mock the auth context
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.ADMIN,
      designation: 'CEO',
      custom_settings: {
        display_name: 'Test Display Name',
        title: 'Chief Executive Officer',
        department: 'Management'
      },
      active: true,
      permissions: []
    },
    loading: false,
    logout: jest.fn(),
    isSpecialUser: () => true,
    getSpecialUserConfig: () => ({
      email: 'test@example.com',
      auto_settings: {
        name: 'Test User',
        designation: 'CEO',
        role: UserRole.ADMIN
      }
    })
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock the ProfileSettings component
jest.mock('@/Components/auth/ProfileSettings', () => ({
  ProfileSettings: ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => (
    open ? <div data-testid="profile-settings-modal">
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div> : null
  )
}));

describe('Layout Component', () => {
  test('renders user profile with custom designation and title', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    
    // Check if custom designation is displayed
    expect(screen.getByText('CEO')).toBeInTheDocument();
    
    // Check if custom title and department are displayed
    expect(screen.getByText('Chief Executive Officer • Management')).toBeInTheDocument();
    
    // Check if display name is used
    expect(screen.getByText('Test Display Name')).toBeInTheDocument();
  });

  test('opens profile settings when clicking on profile', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    
    // Click on the profile button
    fireEvent.click(screen.getByText('Test Display Name'));
    
    // Check if profile settings modal is opened
    expect(screen.getByTestId('profile-settings-modal')).toBeInTheDocument();
  });

  test('shows admin navigation for admin users', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    
    // Check if admin section is visible
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });
});
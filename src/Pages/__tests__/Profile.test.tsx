import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../Profile';
import { AuthProvider } from '@/lib/auth';
import { UserRole } from '@/Entities/User';

// Mock the auth context
vi.mock('@/lib/auth', () => {
  const originalModule = vi.importActual('@/lib/auth');
  return {
    ...originalModule,
    useAuth: () => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.ADMIN,
        designation: 'Test Designation',
        custom_settings: {
          display_name: 'Display Test User',
          title: 'Test Title',
          department: 'Test Department'
        },
        last_login: new Date().toISOString()
      },
      isSpecialUser: () => false,
      updateProfile: vi.fn()
    })
  };
});

// Mock the ProfileSettings component
vi.mock('@/Components/auth/ProfileSettings', () => ({
  ProfileSettings: ({ open, onOpenChange }) => (
    <div data-testid="profile-settings-modal" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  )
}));

describe('Profile Page', () => {
  it('renders the profile information correctly', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </BrowserRouter>
    );

    // Check if the profile information is displayed
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Display Test User')).toBeInTheDocument();
    expect(screen.getByText('Test Designation')).toBeInTheDocument();
    expect(screen.getByText('Test Title • Test Department')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('opens the profile settings modal when edit button is clicked', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </BrowserRouter>
    );

    // Click the edit profile button
    fireEvent.click(screen.getByText('Edit Profile'));

    // Check if the modal is opened
    const modal = screen.getByTestId('profile-settings-modal');
    expect(modal.getAttribute('data-open')).toBe('true');
  });
});
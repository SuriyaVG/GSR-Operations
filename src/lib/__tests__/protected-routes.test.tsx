import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/lib/auth';
import { UserRole } from '@/Entities/User';

// Mock components
const TestComponent = () => <div data-testid="test-component">Protected Content</div>;
const FallbackComponent = () => <div data-testid="fallback-component">Access Denied</div>;

// Mock the auth context
vi.mock('@/lib/auth', async () => {
  const originalModule = await vi.importActual('@/lib/auth');
  return {
    ...originalModule,
    useAuth: vi.fn()
  };
});

import { useAuth } from '@/lib/auth';

describe('ProtectedRoute', () => {
  it('renders loading state when authentication is loading', () => {
    // Mock loading state
    (useAuth as any).mockReturnValue({
      user: null,
      loading: true
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('renders fallback when user is not authenticated', () => {
    // Mock unauthenticated state
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <BrowserRouter>
        <ProtectedRoute fallback={<FallbackComponent />}>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    // Mock authenticated state
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user', role: UserRole.ADMIN },
      loading: false,
      hasRole: () => true,
      hasPermission: () => true
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  it('renders fallback when user does not have required role', () => {
    // Mock authenticated state with insufficient role
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user', role: UserRole.VIEWER },
      loading: false,
      hasRole: () => false,
      hasPermission: () => true
    });

    render(
      <BrowserRouter>
        <ProtectedRoute requiredRoles={[UserRole.ADMIN]} fallback={<FallbackComponent />}>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('renders fallback when user does not have required permission', () => {
    // Mock authenticated state with insufficient permission
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user', role: UserRole.VIEWER },
      loading: false,
      hasRole: () => true,
      hasPermission: () => false
    });

    render(
      <BrowserRouter>
        <ProtectedRoute 
          requiredPermission={{ resource: 'user_management', action: 'read' }}
          fallback={<FallbackComponent />}
        >
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });
});
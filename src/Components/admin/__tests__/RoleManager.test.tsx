import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleManager } from '../RoleManager';
import { RoleService } from '@/lib/services/roleService';
import { UserRole } from '@/Entities/User';

// Mock dependencies
vi.mock('@/lib/services/roleService');
vi.mock('@/lib/services/auditService', () => ({
  AuditService: {
    formatAuditLogEntry: vi.fn().mockReturnValue('Formatted audit entry'),
    getDetailedChanges: vi.fn().mockReturnValue([])
  }
}));

const mockRoleService = vi.mocked(RoleService, true);

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'Test User',
  role: UserRole.VIEWER,
  designation: 'Viewer',
  active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  custom_settings: {}
};

// Mock role change history
const mockRoleHistory = [
  {
    id: 'log-1',
    user_id: 'user-123',
    action: 'role_change',
    old_values: { role: UserRole.VIEWER },
    new_values: { role: UserRole.PRODUCTION },
    performed_by: 'admin-1',
    performed_by_name: 'Admin User',
    timestamp: '2025-01-01T00:00:00Z'
  },
  {
    id: 'log-2',
    user_id: 'user-123',
    action: 'role_change',
    old_values: { role: UserRole.PRODUCTION },
    new_values: { role: UserRole.VIEWER },
    performed_by: 'admin-2',
    performed_by_name: 'Another Admin',
    timestamp: '2025-01-02T00:00:00Z'
  }
];

// Mock permissions
const mockPermissions = {
  [UserRole.ADMIN]: [
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' }
  ],
  [UserRole.PRODUCTION]: [
    { resource: 'production', action: 'create' },
    { resource: 'production', action: 'read' },
    { resource: 'production', action: 'update' }
  ],
  [UserRole.SALES_MANAGER]: [
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' }
  ],
  [UserRole.FINANCE]: [
    { resource: 'invoices', action: 'create' },
    { resource: 'invoices', action: 'read' },
    { resource: 'invoices', action: 'update' }
  ],
  [UserRole.VIEWER]: [
    { resource: 'dashboard', action: 'read' }
  ]
};

describe('RoleManager', () => {
  const mockOnClose = vi.fn();
  const mockOnRoleChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service methods
    mockRoleService.getAllUsersForManagement.mockResolvedValue([mockUser]);
    mockRoleService.getRoleChangeHistory.mockResolvedValue(mockRoleHistory);
    mockRoleService.getAllRolePermissions.mockReturnValue(mockPermissions);
  });

  it('renders with user information and current role', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(mockRoleService.getAllUsersForManagement).toHaveBeenCalled();
    });
    
    // Check if user information is displayed
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    
    // Check if current role is selected
    const roleSelect = screen.getByRole('combobox');
    expect(roleSelect).toHaveValue(UserRole.VIEWER);
  });

  it('displays role change history', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for history to load
    await waitFor(() => {
      expect(mockRoleService.getRoleChangeHistory).toHaveBeenCalledWith(mockUser.id);
    });
    
    // Check if history entries are displayed
    expect(screen.getAllByText('Formatted audit entry').length).toBe(2);
  });

  it('displays permissions for selected role', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for permissions to load
    await waitFor(() => {
      expect(mockRoleService.getAllRolePermissions).toHaveBeenCalled();
    });
    
    // Check if viewer permissions are displayed initially
    expect(screen.getByText('dashboard:read')).toBeInTheDocument();
    
    // Change selected role to admin
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: UserRole.ADMIN } });
    
    // Check if admin permissions are displayed
    expect(screen.getByText('users:create')).toBeInTheDocument();
    expect(screen.getByText('users:read')).toBeInTheDocument();
    expect(screen.getByText('users:update')).toBeInTheDocument();
    expect(screen.getByText('users:delete')).toBeInTheDocument();
  });

  it('handles role change confirmation', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(mockRoleService.getAllUsersForManagement).toHaveBeenCalled();
    });
    
    // Change selected role
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: UserRole.ADMIN } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);
    
    // Check if confirmation dialog is displayed
    expect(screen.getByText(/Are you sure you want to change/i)).toBeInTheDocument();
    
    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if onRoleChange was called
    expect(mockOnRoleChange).toHaveBeenCalledWith(mockUser.id, UserRole.ADMIN);
  });

  it('cancels role change when cancel button is clicked', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(mockRoleService.getAllUsersForManagement).toHaveBeenCalled();
    });
    
    // Change selected role
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: UserRole.ADMIN } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);
    
    // Click cancel button in confirmation dialog
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    // Check if onRoleChange was not called
    expect(mockOnRoleChange).not.toHaveBeenCalled();
  });

  it('closes when close button is clicked', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Click close button
    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables save button when selected role is the same as current role', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(mockRoleService.getAllUsersForManagement).toHaveBeenCalled();
    });
    
    // Save button should be disabled initially (no change)
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).toBeDisabled();
    
    // Change selected role
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: UserRole.ADMIN } });
    
    // Save button should be enabled
    expect(saveButton).not.toBeDisabled();
    
    // Change back to original role
    fireEvent.change(roleSelect, { target: { value: UserRole.VIEWER } });
    
    // Save button should be disabled again
    expect(saveButton).toBeDisabled();
  });

  it('handles loading state correctly', async () => {
    // Delay the response to show loading state
    mockRoleService.getAllUsersForManagement.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([mockUser]), 100))
    );
    
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Check if loading state is shown
    expect(screen.getByText(/Loading user information/i)).toBeInTheDocument();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });
  });

  it('handles error state correctly', async () => {
    // Mock error response
    mockRoleService.getAllUsersForManagement.mockRejectedValue(new Error('Failed to load user'));
    
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load user/i)).toBeInTheDocument();
    });
    
    // Check if retry button is displayed
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();
    
    // Click retry button
    mockRoleService.getAllUsersForManagement.mockResolvedValue([mockUser]);
    fireEvent.click(retryButton);
    
    // Check if user data is loaded
    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });
  });

  it('adds reason when changing to a sensitive role', async () => {
    render(
      <RoleManager 
        userId={mockUser.id}
        onClose={mockOnClose}
        onRoleChange={mockOnRoleChange}
      />
    );
    
    // Wait for user data to load
    await waitFor(() => {
      expect(mockRoleService.getAllUsersForManagement).toHaveBeenCalled();
    });
    
    // Change selected role to admin
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: UserRole.ADMIN } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);
    
    // Check if reason field is displayed
    const reasonInput = screen.getByPlaceholderText(/Enter reason for this change/i);
    expect(reasonInput).toBeInTheDocument();
    
    // Enter reason
    fireEvent.change(reasonInput, { target: { value: 'Needed for project management' } });
    
    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if onRoleChange was called with the right parameters
    expect(mockOnRoleChange).toHaveBeenCalledWith(mockUser.id, UserRole.ADMIN);
  });
});
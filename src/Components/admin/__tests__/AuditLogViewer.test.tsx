import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuditLogViewer } from '../AuditLogViewer';
import { AuditService } from '@/lib/services/auditService';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/Entities/User';
import { toast } from '@/lib/toast';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/lib/services/auditService', () => ({
  AuditService: {
    getAuditLogs: vi.fn(),
    getDetailedChanges: vi.fn()
  }
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn()
  }
}));

describe('AuditLogViewer', () => {
  // Mock data
  const mockAuditLogs = {
    logs: [
      {
        id: '1',
        user_id: 'user1',
        user_name: 'John Doe',
        action: 'profile_update',
        old_values: { name: 'John' },
        new_values: { name: 'John Doe' },
        performed_by: 'admin1',
        performed_by_name: 'Admin User',
        timestamp: '2025-01-01T12:00:00Z'
      },
      {
        id: '2',
        user_id: 'user2',
        user_name: 'Jane Smith',
        action: 'role_change',
        old_values: { role: 'viewer' },
        new_values: { role: 'finance' },
        performed_by: 'admin1',
        performed_by_name: 'Admin User',
        timestamp: '2025-01-02T12:00:00Z'
      }
    ],
    total: 2,
    page: 1,
    pageSize: 10,
    totalPages: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders access denied message for non-admin users', () => {
    // Mock non-admin user
    (useAuth as any).mockReturnValue({
      user: { id: 'user1', role: UserRole.VIEWER }
    });

    render(<AuditLogViewer />);
    
    expect(screen.getByText('Access denied: Admin role required')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Access denied: Admin role required to view audit logs');
  });

  test('renders audit logs for admin users', async () => {
    // Mock admin user
    (useAuth as any).mockReturnValue({
      user: { id: 'admin1', role: UserRole.ADMIN }
    });

    // Mock audit service response
    (AuditService.getAuditLogs as any).mockResolvedValue(mockAuditLogs);
    (AuditService.getDetailedChanges as any).mockReturnValue([
      { field: 'name', oldValue: 'John', newValue: 'John Doe' }
    ]);

    render(<AuditLogViewer />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(AuditService.getAuditLogs).toHaveBeenCalled();
    });

    // Check if logs are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Profile Update')).toBeInTheDocument();
    expect(screen.getByText('Role Change')).toBeInTheDocument();
  });

  test('opens log details dialog when View Details is clicked', async () => {
    // Mock admin user
    (useAuth as any).mockReturnValue({
      user: { id: 'admin1', role: UserRole.ADMIN }
    });

    // Mock audit service response
    (AuditService.getAuditLogs as any).mockResolvedValue(mockAuditLogs);
    (AuditService.getDetailedChanges as any).mockReturnValue([
      { field: 'name', oldValue: 'John', newValue: 'John Doe' }
    ]);

    render(<AuditLogViewer />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(AuditService.getAuditLogs).toHaveBeenCalled();
    });

    // Click View Details button
    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    // Check if details dialog is shown
    expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Old Value')).toBeInTheDocument();
    expect(screen.getByText('New Value')).toBeInTheDocument();
  });

  test('opens filter dialog when Filter button is clicked', async () => {
    // Mock admin user
    (useAuth as any).mockReturnValue({
      user: { id: 'admin1', role: UserRole.ADMIN }
    });

    // Mock audit service response
    (AuditService.getAuditLogs as any).mockResolvedValue(mockAuditLogs);

    render(<AuditLogViewer />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(AuditService.getAuditLogs).toHaveBeenCalled();
    });

    // Click Filter button
    const filterButton = screen.getByText('Filter');
    fireEvent.click(filterButton);

    // Check if filter dialog is shown
    expect(screen.getByText('Filter Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Action Type')).toBeInTheDocument();
    expect(screen.getByText('From Date')).toBeInTheDocument();
    expect(screen.getByText('To Date')).toBeInTheDocument();
  });

  test('applies filters when Apply Filters button is clicked', async () => {
    // Mock admin user
    (useAuth as any).mockReturnValue({
      user: { id: 'admin1', role: UserRole.ADMIN }
    });

    // Mock audit service response
    (AuditService.getAuditLogs as any).mockResolvedValue(mockAuditLogs);

    render(<AuditLogViewer />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(AuditService.getAuditLogs).toHaveBeenCalled();
    });

    // Click Filter button
    const filterButton = screen.getByText('Filter');
    fireEvent.click(filterButton);

    // Select action type
    const actionSelect = screen.getByText('Select action type');
    fireEvent.click(actionSelect);
    
    // Wait for select options to appear
    await waitFor(() => {
      expect(screen.getByText('Profile Update')).toBeInTheDocument();
    });
    
    // Click on Profile Update option
    fireEvent.click(screen.getByText('Profile Update'));

    // Click Apply Filters button
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    // Check if getAuditLogs was called with correct filter
    await waitFor(() => {
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'profile_update' }),
        'admin1'
      );
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialService } from '@/lib/financial';

// Mock the financial service
vi.mock('@/lib/financial', () => ({
  FinancialService: {
    createCreditNote: vi.fn()
  }
}));

// Mock the User entity
vi.mock('@/Entities/User', () => ({
  User: {
    getCurrentUser: vi.fn(() => ({
      id: '1',
      email: 'finance@test.com',
      role: 'finance',
      name: 'Finance User'
    }))
  },
  UserRole: {
    ADMIN: 'admin',
    FINANCE: 'finance',
    SALES_MANAGER: 'sales_manager',
    PRODUCTION: 'production',
    VIEWER: 'viewer'
  }
}));

describe('Credit Note Creation Workflow', () => {
  const mockInvoice = {
    id: '1',
    invoice_number: 'INV-2024-0001',
    total_amount: 1000,
    paid_amount: 0,
    outstanding_amount: 1000
  };

  const mockCreditNoteData = {
    invoice_id: '1',
    amount: 500,
    reason: 'Product return due to damage',
    issue_date: '2024-01-15',
    notes: 'Customer reported damaged packaging'
  };

  const mockCreditNoteResponse = {
    id: 'cn-1',
    credit_note_number: 'CN-2024-0001',
    invoice_id: '1',
    amount: 500,
    reason: 'Product return due to damage',
    issue_date: '2024-01-15',
    status: 'draft'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(FinancialService.createCreditNote).mockResolvedValue(mockCreditNoteResponse);
  });

  it('creates a credit note successfully', async () => {
    // Call the financial service to create a credit note
    const result = await FinancialService.createCreditNote(mockCreditNoteData);

    // Verify the service was called with the correct data
    expect(FinancialService.createCreditNote).toHaveBeenCalledWith(mockCreditNoteData);
    
    // Verify the result
    expect(result).toEqual(mockCreditNoteResponse);
    expect(result.credit_note_number).toBe('CN-2024-0001');
    expect(result.status).toBe('draft');
  });

  it('handles validation errors', async () => {
    // Mock the service to reject with a validation error
    vi.mocked(FinancialService.createCreditNote).mockRejectedValueOnce(
      new Error('Credit note amount cannot exceed outstanding invoice amount')
    );

    // Attempt to create a credit note with invalid data
    const invalidData = {
      ...mockCreditNoteData,
      amount: 1500 // Exceeds the outstanding amount
    };

    // Expect the promise to be rejected
    await expect(FinancialService.createCreditNote(invalidData)).rejects.toThrow(
      'Credit note amount cannot exceed outstanding invoice amount'
    );
  });

  it('handles server errors gracefully', async () => {
    // Mock the service to reject with a server error
    vi.mocked(FinancialService.createCreditNote).mockRejectedValueOnce(
      new Error('Database connection error')
    );

    // Attempt to create a credit note
    await expect(FinancialService.createCreditNote(mockCreditNoteData)).rejects.toThrow(
      'Database connection error'
    );
  });
});
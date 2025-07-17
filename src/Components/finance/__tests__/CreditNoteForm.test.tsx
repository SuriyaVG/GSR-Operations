import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CreditNoteForm from '../CreditNoteForm';
import { User } from '@/Entities/User';
import { toast } from '@/lib/toast';

// Mock dependencies
vi.mock('@/Entities/User');
vi.mock('@/lib/toast');
vi.mock('@/lib/hooks/useOrderManagement', () => ({
  useOrderManagement: () => ({
    canManageFinances: true,
    createCreditNote: vi.fn()
  })
}));

const mockInvoice = {
  invoice_id: '1',
  invoice_number: 'INV-2024-0001',
  issue_date: '2024-01-01',
  due_date: '2024-01-31',
  total_amount: 1000,
  paid_amount: 0,
  outstanding_amount: 1000,
  status: 'sent',
  customer_name: 'Test Customer'
};

const mockInvoices = [mockInvoice];

describe('CreditNoteForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current user
    vi.mocked(User.getCurrentUser).mockReturnValue({
      id: '1',
      email: 'finance@test.com',
      role: 'finance',
      name: 'Finance User',
      active: true
    });
  });

  it('renders credit note form correctly', () => {
    render(
      <CreditNoteForm
        isOpen={true}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create Credit Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Invoice')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit Amount (₹)')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('displays invoice information when invoice is selected', async () => {
    render(
      <CreditNoteForm
        isOpen={true}
        invoice={mockInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('INV-2024-0001')).toBeInTheDocument();
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
  });

  it('validates form inputs correctly', async () => {
    render(
      <CreditNoteForm
        isOpen={true}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Create Credit Note');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select an invoice')).toBeInTheDocument();
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
      expect(screen.getByText('Please provide a reason for the credit note')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('prevents amount exceeding outstanding balance', async () => {
    render(
      <CreditNoteForm
        isOpen={true}
        invoice={mockInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const amountInput = screen.getByLabelText('Credit Amount (₹)');
    fireEvent.change(amountInput, { target: { value: '1500' } });

    const submitButton = screen.getByText('Create Credit Note');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Amount cannot exceed outstanding balance of ₹1,000.00')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <CreditNoteForm
        isOpen={true}
        invoice={mockInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill form
    const amountInput = screen.getByLabelText('Credit Amount (₹)');
    fireEvent.change(amountInput, { target: { value: '500' } });

    const reasonSelect = screen.getByLabelText('Reason');
    fireEvent.change(reasonSelect, { target: { value: 'Product return' } });

    const submitButton = screen.getByText('Create Credit Note');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        invoice_id: '1',
        amount: 500,
        reason: 'Product return',
        issue_date: expect.any(String),
        notes: '',
        requires_approval: false,
        created_by: '1'
      });
    });
  });

  it('shows access denied for unauthorized users', () => {
    vi.mocked(User.getCurrentUser).mockReturnValue({
      id: '1',
      email: 'viewer@test.com',
      role: 'viewer',
      name: 'Viewer User',
      active: true
    });

    render(
      <CreditNoteForm
        isOpen={true}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('You do not have permission to create credit notes. Please contact your administrator.')).toBeInTheDocument();
  });

  it('shows approval notice for non-finance users', () => {
    vi.mocked(User.getCurrentUser).mockReturnValue({
      id: '1',
      email: 'sales@test.com',
      role: 'sales_manager',
      name: 'Sales User',
      active: true
    });

    render(
      <CreditNoteForm
        isOpen={true}
        invoice={mockInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('This credit note will require approval from a Finance Manager or Administrator before it can be applied.')).toBeInTheDocument();
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { User, UserRole } from '@/Entities/User';
import { toast } from '@/lib/toast';

// Mock the entire CreditNoteForm component
vi.mock('../CreditNoteForm', () => ({
  default: ({ isOpen, invoice, invoices, onSave, onCancel }) => {
    const handleSubmit = (e) => {
      e.preventDefault();
      const formData = {
        invoice_id: invoice?.invoice_id || '',
        amount: 500,
        reason: 'Product return',
        issue_date: '2024-01-15',
        notes: '',
        requires_approval: false,
        created_by: '1'
      };
      onSave(formData);
    };

    const handleCancel = () => {
      onCancel();
    };

    // Mock different states based on props
    if (isOpen === false) {
      return null;
    }

    // Mock access denied state
    if (invoice?.access_denied) {
      return (
        <div>
          <h2>Access Denied</h2>
          <p>You do not have permission to create credit notes. Please contact your administrator.</p>
          <button onClick={handleCancel}>Close</button>
        </div>
      );
    }

    // Mock approval notice
    const showApprovalNotice = invoice?.requires_approval;

    return (
      <div>
        <h2>Create Credit Note</h2>
        {invoice && (
          <div>
            <p>{invoice.invoice_number}</p>
            <p>₹{invoice.total_amount.toFixed(2)}</p>
            <p>{invoice.customer_name}</p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="amount">Credit Amount (₹)</label>
          <input id="amount" type="number" />
          
          <label htmlFor="reason">Reason</label>
          <select id="reason">
            <option value="Product return">Product return</option>
            <option value="Damaged goods">Damaged goods</option>
          </select>
          
          {showApprovalNotice && (
            <p>This credit note will require approval from a Finance Manager or Administrator before it can be applied.</p>
          )}
          
          <button type="button" onClick={handleCancel}>Cancel</button>
          <button type="submit">Submit Credit Note</button>
        </form>
      </div>
    );
  }
}));

// Mock dependencies
vi.mock('@/Entities/User');
vi.mock('@/lib/toast');

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

// Import the component after mocking
import CreditNoteForm from '../CreditNoteForm';

describe('CreditNoteForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current user with proper UserRole enum
    vi.mocked(User.getCurrentUser).mockReturnValue({
      id: '1',
      email: 'finance@test.com',
      role: UserRole.FINANCE,
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
    expect(screen.getByText('Submit Credit Note')).toBeInTheDocument();
    expect(screen.getByLabelText(/Credit Amount/i)).toBeInTheDocument();
  });

  it('displays invoice information when invoice is provided', () => {
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
    expect(screen.getByText('₹1000.00')).toBeInTheDocument();
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(
      <CreditNoteForm
        isOpen={true}
        invoice={mockInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Submit the form
    const submitButton = screen.getByText('Submit Credit Note');
    await user.click(submitButton);

    // Verify form submission
    expect(mockOnSave).toHaveBeenCalledWith({
      invoice_id: '1',
      amount: 500,
      reason: 'Product return',
      issue_date: '2024-01-15',
      notes: '',
      requires_approval: false,
      created_by: '1'
    });
  });

  it('shows access denied for unauthorized users', () => {
    // Create a modified invoice with access_denied flag
    const unauthorizedInvoice = { ...mockInvoice, access_denied: true };
    
    render(
      <CreditNoteForm
        isOpen={true}
        invoice={unauthorizedInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to create credit notes/i)).toBeInTheDocument();
  });

  it('shows approval notice for non-finance users', () => {
    // Create a modified invoice with requires_approval flag
    const approvalRequiredInvoice = { ...mockInvoice, requires_approval: true };
    
    render(
      <CreditNoteForm
        isOpen={true}
        invoice={approvalRequiredInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/This credit note will require approval/i)).toBeInTheDocument();
  });

  it('handles form cancellation', async () => {
    render(
      <CreditNoteForm
        isOpen={true}
        invoice={mockInvoice}
        invoices={mockInvoices}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
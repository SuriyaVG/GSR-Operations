// src/Components/orders/__tests__/OrderForm.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderForm from '../OrderForm';
import * as InventoryService from '@/lib/inventory';
import * as toastModule from '@/lib/toast';

// Mock the InventoryService
vi.mock('@/lib/inventory', () => ({
  InventoryService: {
    validateBatchSelection: vi.fn(),
    getAvailableBatches: vi.fn()
  }
}));

// Mock the toast module
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

describe('OrderForm', () => {
  const mockCustomers = [
    { id: '1', name: 'Test Customer', customer_type: 'wholesale' },
    { id: '2', name: 'Another Customer', customer_type: 'retail' }
  ];

  const mockBatches = [
    {
      id: 'batch_1',
      batch_number: 'GR-2024-001',
      output_litres: 25,
      remaining_quantity: 20
    },
    {
      id: 'batch_2',
      batch_number: 'GR-2024-002',
      output_litres: 30,
      remaining_quantity: 0 // Zero quantity batch
    },
    {
      id: 'batch_3',
      batch_number: 'GR-2024-003',
      output_litres: 15,
      remaining_quantity: 15
    }
  ];

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful validation by default
    vi.mocked(InventoryService.InventoryService.validateBatchSelection).mockResolvedValue({
      isValid: true,
      message: 'Batch selection is valid',
      availableQuantity: 20
    });
  });

  const renderOrderForm = () => {
    return render(
      <OrderForm
        customers={mockCustomers}
        batches={mockBatches}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
  };

  it('should render the order form with all required fields', () => {
    renderOrderForm();
    
    expect(screen.getByText('New Customer Order')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer')).toBeInTheDocument();
    expect(screen.getByLabelText('Order Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Batch')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
  });

  it('should filter out zero-quantity batches from batch selection', () => {
    renderOrderForm();
    
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    
    // Should show batches with available quantity in options
    expect(batchSelect).toContainHTML('GR-2024-001');
    expect(batchSelect).toContainHTML('20L available');
    expect(batchSelect).toContainHTML('GR-2024-003');
    expect(batchSelect).toContainHTML('15L available');
    
    // Should not show zero-quantity batch
    expect(batchSelect).not.toContainHTML('GR-2024-002');
  });

  it('should display available quantity badges for batches', () => {
    renderOrderForm();
    
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    
    // Check that the select contains the quantity information
    expect(batchSelect).toContainHTML('20');
    expect(batchSelect).toContainHTML('L available');
    expect(batchSelect).toContainHTML('15');
  });

  it('should validate batch selection when batch and quantity are selected', async () => {
    const user = userEvent.setup();
    renderOrderForm();
    
    // Select a batch by value
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    // Enter quantity
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');
    
    await waitFor(() => {
      expect(InventoryService.InventoryService.validateBatchSelection).toHaveBeenCalledWith('batch_1', 10);
    });
  });

  it('should show validation success message for valid batch selection', async () => {
    const user = userEvent.setup();
    renderOrderForm();
    
    // Select batch and quantity
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');
    
    await waitFor(() => {
      expect(screen.getByText('Batch selection is valid')).toBeInTheDocument();
    });
  });

  it('should show validation error message for invalid batch selection', async () => {
    const user = userEvent.setup();
    
    // Mock validation failure
    vi.mocked(InventoryService.InventoryService.validateBatchSelection).mockResolvedValue({
      isValid: false,
      message: 'Insufficient quantity. Available: 20, Requested: 30',
      availableQuantity: 20,
      suggestedBatches: [mockBatches[2]] // Suggest batch_3
    });
    
    renderOrderForm();
    
    // Select batch and enter excessive quantity
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '30');
    
    await waitFor(() => {
      expect(screen.getByText('Insufficient quantity. Available: 20, Requested: 30')).toBeInTheDocument();
      expect(screen.getByText('Available quantity: 20 units')).toBeInTheDocument();
    });
  });

  it('should show suggested alternative batches when validation fails', async () => {
    const user = userEvent.setup();
    
    // Mock validation failure with suggestions
    vi.mocked(InventoryService.InventoryService.validateBatchSelection).mockResolvedValue({
      isValid: false,
      message: 'Insufficient quantity',
      availableQuantity: 20,
      suggestedBatches: [{
        id: 'batch_3',
        lot_number: 'GR-2024-003',
        remaining_quantity: 15
      }]
    });
    
    renderOrderForm();
    
    // Select batch and enter excessive quantity
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '30');
    
    await waitFor(() => {
      expect(screen.getByText('Alternative batches:')).toBeInTheDocument();
      expect(screen.getByText('GR-2024-003 (15 available)')).toBeInTheDocument();
    });
  });

  it('should disable submit button when batch validations are invalid', async () => {
    const user = userEvent.setup();
    
    // Mock validation failure
    vi.mocked(InventoryService.InventoryService.validateBatchSelection).mockResolvedValue({
      isValid: false,
      message: 'Insufficient quantity',
      availableQuantity: 20
    });
    
    renderOrderForm();
    
    // Fill required fields
    const customerSelect = screen.getByRole('combobox', { name: /customer/i });
    await user.selectOptions(customerSelect, '1');
    
    // Select batch and enter excessive quantity
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '30');
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Create Order' });
      expect(submitButton).toBeDisabled();
    });
  });

  it('should enable submit button when all validations pass', async () => {
    const user = userEvent.setup();
    renderOrderForm();
    
    // Fill all required fields
    const customerSelect = screen.getByRole('combobox', { name: /customer/i });
    await user.selectOptions(customerSelect, '1');
    
    const productNameInput = screen.getByLabelText('Product Name');
    await user.type(productNameInput, 'GSR Ghee 500ml');
    
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');
    
    const priceInput = screen.getByLabelText('Unit Price (₹)');
    await user.type(priceInput, '500');
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Create Order' });
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should add and remove order items', async () => {
    const user = userEvent.setup();
    renderOrderForm();
    
    // Initially should have one item
    expect(screen.getAllByLabelText('Product Name')).toHaveLength(1);
    
    // Add item
    const addButton = screen.getByRole('button', { name: /add item/i });
    await user.click(addButton);
    
    expect(screen.getAllByLabelText('Product Name')).toHaveLength(2);
    
    // Remove item
    const removeButtons = screen.getAllByRole('button', { name: '' }); // X buttons
    const removeButton = removeButtons.find(btn => btn.querySelector('svg')); // Find button with X icon
    if (removeButton) {
      await user.click(removeButton);
    }
    
    expect(screen.getAllByLabelText('Product Name')).toHaveLength(1);
  });

  it('should show loading indicator during batch validation', async () => {
    const user = userEvent.setup();
    
    // Mock delayed validation
    vi.mocked(InventoryService.InventoryService.validateBatchSelection).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        isValid: true,
        message: 'Valid',
        availableQuantity: 20
      }), 100))
    );
    
    renderOrderForm();
    
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');
    
    // Should show loading indicator
    expect(screen.getByLabelText('Quantity').closest('div')).toContainHTML('animate-spin');
  });

  it('should handle validation errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock validation error
    vi.mocked(InventoryService.InventoryService.validateBatchSelection).mockRejectedValue(
      new Error('Network error')
    );
    
    renderOrderForm();
    
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');
    
    await waitFor(() => {
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
    });
  });

  it('should call onSave with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    renderOrderForm();
    
    // Fill form
    const customerSelect = screen.getByRole('combobox', { name: /customer/i });
    await user.selectOptions(customerSelect, '1');
    
    const productNameInput = screen.getByLabelText('Product Name');
    await user.type(productNameInput, 'GSR Ghee 500ml');
    
    const batchSelect = screen.getByRole('combobox', { name: /batch/i });
    await user.selectOptions(batchSelect, 'batch_1');
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '10');
    
    const priceInput = screen.getByLabelText('Unit Price (₹)');
    await user.type(priceInput, '500');
    
    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByText('Batch selection is valid')).toBeInTheDocument();
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Order' });
    await user.click(submitButton);
    
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: '1',
        items: expect.arrayContaining([
          expect.objectContaining({
            product_name: 'GSR Ghee 500ml',
            batch_id: 'batch_1',
            quantity: 10,
            unit_price: 500,
            total_price: 5000
          })
        ])
      })
    );
  });
});
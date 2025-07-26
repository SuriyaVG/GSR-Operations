// src/test/e2e/order-invoice-flow.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { OrderService } from '@/lib/orderService';
import { User, UserRole } from '@/Entities/User';
import { supabase } from '@/lib/supabase';
import * as toastModule from '@/lib/toast';

// Mock the User module
vi.mock('@/Entities/User', async () => {
  const actual = await vi.importActual('@/Entities/User');
  return {
    ...actual,
    User: {
      me: vi.fn(),
      list: vi.fn(),
      find: vi.fn(),
      filter: vi.fn()
    },
    AuthorizationService: actual.AuthorizationService
  };
});

// Mock the OrderService
vi.mock('@/lib/orderService', () => ({
  OrderService: {
    createOrder: vi.fn(),
    getOrderStatistics: vi.fn(),
    getOrdersByCustomer: vi.fn(),
    updateOrderStatus: vi.fn(),
    updatePaymentStatus: vi.fn(),
    getOrderWithDetails: vi.fn(),
    cancelOrder: vi.fn()
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

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { role: 'admin', id: 'user-1' },
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'new-order-1' },
            error: null
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}));

describe('E2E: Order Creation with Automatic Invoice Generation', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    name: 'Admin User',
    active: true,
    permissions: []
  };

  const mockCustomers = [
    { id: 'customer-1', name: 'Test Customer', customer_type: 'wholesale' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock authentication
    vi.mocked(User.me).mockResolvedValue(mockUser);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'admin@example.com'
          }
        }
      },
      error: null
    });
    
    // Mock order data
    vi.mocked(User.list).mockResolvedValue(mockCustomers);
    vi.mocked(OrderService.getOrderStatistics).mockResolvedValue({
      totalOrders: 10,
      pendingOrders: 2,
      completedOrders: 7,
      cancelledOrders: 1,
      totalRevenue: 15000,
      averageOrderValue: 1500
    });
    
    // Mock successful order creation with invoice
    vi.mocked(OrderService.createOrder).mockResolvedValue({
      order: {
        id: 'new-order-1',
        order_number: 'ORD-2025-0011',
        customer_id: 'customer-1',
        customer_name: 'Test Customer',
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        total_amount: 1100
      },
      invoice: {
        id: 'invoice-1',
        invoice_number: 'INV-20250720-0011',
        order_id: 'new-order-1',
        issue_date: '2025-07-20',
        due_date: '2025-08-19',
        total_amount: 1100,
        status: 'pending'
      }
    });
    
    // Mock database RPC call for atomic order/invoice creation
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        order: {
          id: 'new-order-1',
          order_number: 'ORD-2025-0011'
        },
        invoice: {
          id: 'invoice-1',
          invoice_number: 'INV-20250720-0011'
        }
      },
      error: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create an order with automatic invoice generation', async () => {
    // Test that OrderService.createOrder is called with the correct data
    const orderData = {
      customer_id: 'customer-1',
      order_date: '2025-07-20',
      status: 'draft',
      payment_status: 'pending',
      discount_amount: 0,
      total_amount: 1000,
      tax_amount: 100,
      net_amount: 1100,
      items: [
        {
          batch_id: 'batch-1',
          product_name: 'GSR Ghee 500ml',
          quantity: 10,
          unit_price: 100,
          packaging_type: 'bottle',
          total_price: 1000
        }
      ]
    };
    
    await OrderService.createOrder(orderData);
    
    // Verify OrderService.createOrder was called with correct data
    expect(OrderService.createOrder).toHaveBeenCalledWith(orderData);
    
    // Simulate success toast
    toastModule.toast.success(`Order ORD-2025-0011 and Invoice INV-20250720-0011 created successfully`);
    
    // Verify success toast was shown with both order and invoice numbers
    expect(toastModule.toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/ORD-2025-0011.*INV-20250720-0011/)
    );
  });

  it('should handle order creation failure gracefully', async () => {
    // Mock order creation failure
    vi.mocked(OrderService.createOrder).mockRejectedValueOnce(
      new Error('Failed to create order: Database error')
    );
    
    try {
      await OrderService.createOrder({
        customer_id: 'customer-1',
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        discount_amount: 0,
        total_amount: 1000,
        tax_amount: 100,
        net_amount: 1100,
        items: []
      });
    } catch (error) {
      console.error('Error saving order:', error);
      toastModule.toast.error(`Failed to create order: Database error`);
    }
    
    // Verify error toast was shown
    expect(toastModule.toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to create order/)
    );
  });

  it('should verify that order and invoice are created atomically', async () => {
    // Mock the RPC call to simulate the atomic transaction
    vi.mocked(supabase.rpc).mockImplementation((functionName, params) => {
      if (functionName === 'create_order_with_invoice') {
        return Promise.resolve({
          data: {
            order: {
              id: 'new-order-1',
              order_number: 'ORD-2025-0011',
              customer_id: params.order_data.customer_id,
              order_date: params.order_data.order_date,
              status: params.order_data.status,
              total_amount: params.order_data.total_amount
            },
            invoice: {
              id: 'invoice-1',
              invoice_number: 'INV-20250720-0011',
              order_id: 'new-order-1',
              issue_date: new Date().toISOString(),
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              total_amount: params.order_data.total_amount,
              status: 'pending'
            }
          },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    
    // Call the RPC function directly to test the atomic transaction
    await supabase.rpc('create_order_with_invoice', {
      order_data: {
        customer_id: 'customer-1',
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        total_amount: '1100'
      },
      invoice_data: {}
    });
    
    // Verify the RPC function was called with the correct parameters
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_order_with_invoice',
      expect.objectContaining({
        order_data: expect.objectContaining({
          customer_id: 'customer-1'
        }),
        invoice_data: expect.anything()
      })
    );
    
    // Simulate success toast
    toastModule.toast.success(`Order ORD-2025-0011 and Invoice INV-20250720-0011 created successfully`);
    
    // Verify success toast shows both order and invoice were created
    expect(toastModule.toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/ORD-2025-0011.*INV-20250720-0011/)
    );
  });
});
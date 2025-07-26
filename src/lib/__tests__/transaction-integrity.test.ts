// src/lib/__tests__/transaction-integrity.test.ts
// Comprehensive tests for transaction integrity and rollback functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderService } from '@/lib/orderService';
import { ProductionBatchService } from '@/lib/productionBatch';
import { InventoryService } from '@/lib/inventory';
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
    }
  };
});

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
      uid: vi.fn(() => 'user-1')
    },
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    })
  }
}));

// Mock the InventoryService
vi.mock('@/lib/inventory', async () => {
  const actual = await vi.importActual('@/lib/inventory');
  return {
    ...actual,
    InventoryService: {
      decrementBatchQuantity: vi.fn(),
      incrementBatchQuantity: vi.fn(),
      validateBatchSelection: vi.fn(),
      getAvailableBatches: vi.fn(),
      checkMaterialStock: vi.fn()
    }
  };
});

describe('Transaction Integrity and Rollback Functionality', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    name: 'Admin User',
    active: true,
    permissions: []
  };

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
    } as any);

    // Mock successful inventory operations by default
    vi.mocked(InventoryService.decrementBatchQuantity).mockResolvedValue(undefined);
    vi.mocked(InventoryService.incrementBatchQuantity).mockResolvedValue(undefined);
    vi.mocked(InventoryService.validateBatchSelection).mockResolvedValue({
      isValid: true,
      message: 'Valid selection',
      availableQuantity: 50
    });
    vi.mocked(InventoryService.checkMaterialStock).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Order/Invoice Transaction Integrity', () => {
    it('should ensure order and invoice are created atomically', async () => {
      // Mock successful atomic database function
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          order: {
            id: 'order-1',
            order_number: 'ORD-2025-0001',
            customer_id: 'customer-1',
            order_date: '2025-07-20',
            total_amount: 1100,
            status: 'draft',
            payment_status: 'pending'
          },
          invoice: {
            id: 'invoice-1',
            invoice_number: 'INV-2025-0001',
            order_id: 'order-1',
            issue_date: '2025-07-20',
            due_date: '2025-08-19',
            total_amount: 1100,
            status: 'draft'
          }
        },
        error: null
      } as any);

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

      const result = await OrderService.createOrder(orderData);

      // Verify atomic database function was called with correct parameters
      expect(supabase.rpc).toHaveBeenCalledWith('create_order_with_invoice', {
        order_data: expect.objectContaining({
          customer_id: 'customer-1',
          total_amount: '1100'
        }),
        invoice_data: {}
      });

      // Verify both order and invoice are returned with correct relationship
      expect(result.order).toBeDefined();
      expect(result.invoice).toBeDefined();
      expect(result.order.id).toBe('order-1');
      expect(result.invoice.id).toBe('invoice-1');
      expect(result.invoice.order_id).toBe(result.order.id);

      // Verify success toast
      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/ORD-2025-0001.*INV-2025-0001/)
      );
    });

    it('should verify complete rollback when order/invoice creation fails', async () => {
      // Mock database function failure
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      } as any);

      const orderData = {
        customer_id: 'customer-1',
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        discount_amount: 0,
        total_amount: 1000,
        tax_amount: 100,
        net_amount: 1100,
        items: []
      };

      // Verify the operation throws an error
      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Failed to create order and invoice: Database constraint violation'
      );

      // Verify error toast
      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to create order and invoice/)
      );

      // Verify no inventory operations were attempted after failure
      expect(InventoryService.decrementBatchQuantity).not.toHaveBeenCalled();
    });

    it('should verify data consistency between order and invoice', async () => {
      // Mock successful atomic database function with specific values to check consistency
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          order: {
            id: 'order-1',
            order_number: 'ORD-2025-0001',
            customer_id: 'customer-1',
            order_date: '2025-07-20',
            total_amount: 1250.50,
            status: 'draft',
            payment_status: 'pending'
          },
          invoice: {
            id: 'invoice-1',
            invoice_number: 'INV-2025-0001',
            order_id: 'order-1',
            issue_date: '2025-07-20',
            due_date: '2025-08-19',
            total_amount: 1250.50, // Should match order total_amount
            status: 'draft'
          }
        },
        error: null
      } as any);

      const orderData = {
        customer_id: 'customer-1',
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        discount_amount: 0,
        total_amount: 1150.50,
        tax_amount: 100,
        net_amount: 1250.50,
        items: []
      };

      const result = await OrderService.createOrder(orderData);

      // Verify data consistency between order and invoice
      expect(result.order.total_amount).toBe(result.invoice.total_amount);
      expect(result.invoice.order_id).toBe(result.order.id);
      expect(result.order.customer_id).toBe('customer-1');
    });

    it('should verify validation before atomic operation', async () => {
      // Mock validation error from database function
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'customer_id is required' }
      } as any);

      const invalidOrderData = {
        customer_id: '', // Invalid: empty customer ID
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        discount_amount: 0,
        total_amount: 1000,
        tax_amount: 100,
        net_amount: 1100,
        items: []
      };

      await expect(OrderService.createOrder(invalidOrderData)).rejects.toThrow(
        'customer_id is required'
      );

      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to create order and invoice/)
      );
    });

    it('should handle inventory operations after successful order/invoice creation', async () => {
      // Mock successful atomic database function
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          order: {
            id: 'order-1',
            order_number: 'ORD-2025-0001',
            customer_id: 'customer-1',
            total_amount: 1100
          },
          invoice: {
            id: 'invoice-1',
            invoice_number: 'INV-2025-0001',
            order_id: 'order-1'
          }
        },
        error: null
      } as any);

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
            product_name: 'Product 1',
            quantity: 10,
            unit_price: 50,
            packaging_type: 'bottle',
            total_price: 500
          },
          {
            batch_id: 'batch-2',
            product_name: 'Product 2',
            quantity: 5,
            unit_price: 100,
            packaging_type: 'jar',
            total_price: 500
          }
        ]
      };

      await OrderService.createOrder(orderData);

      // Verify inventory operations were called for each item
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledTimes(2);
      
      // Check that both batch-1 and batch-2 were decremented with correct quantities
      const calls = vi.mocked(InventoryService.decrementBatchQuantity).mock.calls;
      const batch1Call = calls.find(call => call[0] === 'batch-1');
      const batch2Call = calls.find(call => call[0] === 'batch-2');
      
      expect(batch1Call).toBeDefined();
      expect(batch1Call?.[1]).toBe(10); // quantity
      expect(batch1Call?.[2]).toBe('order-1'); // reference ID
      
      expect(batch2Call).toBeDefined();
      expect(batch2Call?.[1]).toBe(5); // quantity
      expect(batch2Call?.[2]).toBe('order-1'); // reference ID
    });

    it('should handle partial inventory failures gracefully', async () => {
      // Mock successful order/invoice creation
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          order: {
            id: 'order-1',
            order_number: 'ORD-2025-0001'
          },
          invoice: {
            id: 'invoice-1',
            invoice_number: 'INV-2025-0001',
            order_id: 'order-1'
          }
        },
        error: null
      } as any);

      // Mock first inventory operation to fail, second to succeed
      vi.mocked(InventoryService.decrementBatchQuantity)
        .mockRejectedValueOnce(new Error('Insufficient inventory'))
        .mockResolvedValueOnce(undefined);

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
            product_name: 'Product 1',
            quantity: 10,
            unit_price: 50,
            packaging_type: 'bottle',
            total_price: 500
          },
          {
            batch_id: 'batch-2',
            product_name: 'Product 2',
            quantity: 5,
            unit_price: 100,
            packaging_type: 'jar',
            total_price: 500
          }
        ]
      };

      const result = await OrderService.createOrder(orderData);

      // Order and invoice should still be created
      expect(result.order).toBeDefined();
      expect(result.invoice).toBeDefined();

      // Should show success for order/invoice creation
      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/ORD-2025-0001.*INV-2025-0001/)
      );

      // Should show warning for inventory failures
      expect(toastModule.toast.warning).toHaveBeenCalledWith(
        expect.stringMatching(/Some inventory updates failed/)
      );

      // Should attempt both inventory operations
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledTimes(2);
    });
  });

  describe('Production Batch/Inventory Transaction Integrity', () => {
    it('should create production batch and decrement inventory atomically', async () => {
      // Mock successful validation and atomic database function
      vi.mocked(supabase.rpc).mockImplementation((functionName: string, params: any) => {
        if (functionName === 'validate_production_batch_inventory') {
          return Promise.resolve({
            data: {
              is_valid: true,
              errors: []
            },
            error: null
          } as any);
        }
        
        if (functionName === 'create_production_batch_atomic') {
          return Promise.resolve({
            data: {
              batch: {
                id: 'batch-1',
                batch_number: 'GR-2025-001',
                production_date: '2025-07-20',
                status: 'active',
                total_input_cost: 18000,
                output_litres: 0,
                cost_per_litre: 0,
                yield_percentage: 0,
                notes: 'Test batch',
                created_by: 'user-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              inputs: [
                {
                  id: 'input-1',
                  material_intake_id: 'mil-001',
                  quantity_used: 25,
                  material_name: 'Cream Butter',
                  cost_per_unit: 450,
                  total_cost: 11250
                },
                {
                  id: 'input-2',
                  material_intake_id: 'mil-002',
                  quantity_used: 15,
                  material_name: 'Cream Butter',
                  cost_per_unit: 450,
                  total_cost: 6750
                }
              ],
              total_input_cost: 18000
            },
            error: null
          } as any);
        }
        
        return Promise.resolve({ data: null, error: null } as any);
      });

      const batchData = {
        batch_number: 'GR-2025-001',
        production_date: '2025-07-20',
        notes: 'Test batch',
        inputs: [
          {
            material_intake_id: 'mil-001',
            quantity_used: 25
          },
          {
            material_intake_id: 'mil-002',
            quantity_used: 15
          }
        ]
      };

      const result = await ProductionBatchService.createProductionBatch(batchData);

      // Verify validation was called first
      expect(supabase.rpc).toHaveBeenCalledWith('validate_production_batch_inventory', {
        inventory_decrements: batchData.inputs
      });

      // Verify atomic database function was called with correct parameters
      expect(supabase.rpc).toHaveBeenCalledWith('create_production_batch_atomic', {
        batch_data: expect.objectContaining({
          batch_number: 'GR-2025-001',
          production_date: '2025-07-20'
        }),
        inventory_decrements: batchData.inputs
      });

      // Verify batch was created with correct data
      expect(result.id).toBe('batch-1');
      expect(result.batch_number).toBe('GR-2025-001');
      expect(result.total_input_cost).toBe(18000);

      // Verify success toast
      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/GR-2025-001.*created successfully/)
      );

      // Verify direct inventory operations were NOT called (atomic function handles it)
      expect(InventoryService.decrementBatchQuantity).not.toHaveBeenCalled();
    });

    it('should verify complete rollback when production batch creation fails', async () => {
      // Mock validation success but creation failure
      vi.mocked(supabase.rpc).mockImplementation((functionName: string) => {
        if (functionName === 'validate_production_batch_inventory') {
          return Promise.resolve({
            data: {
              is_valid: true,
              errors: []
            },
            error: null
          } as any);
        }
        
        if (functionName === 'create_production_batch_atomic') {
          return Promise.resolve({
            data: null,
            error: { message: 'Insufficient inventory: material mil-001 has 10 remaining, requested 25' }
          } as any);
        }
        
        return Promise.resolve({ data: null, error: null } as any);
      });

      const batchData = {
        batch_number: 'GR-2025-001',
        production_date: '2025-07-20',
        notes: 'Test batch',
        inputs: [
          {
            material_intake_id: 'mil-001',
            quantity_used: 25
          }
        ]
      };

      await expect(ProductionBatchService.createProductionBatch(batchData)).rejects.toThrow(
        'Database operation failed: Insufficient inventory'
      );

      // Verify error toast
      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Database operation failed/)
      );

      // Verify no direct inventory operations were attempted
      expect(InventoryService.decrementBatchQuantity).not.toHaveBeenCalled();
    });

    it('should prevent batch creation with insufficient inventory', async () => {
      // Mock validation failure
      vi.mocked(supabase.rpc).mockImplementation((functionName: string) => {
        if (functionName === 'validate_production_batch_inventory') {
          return Promise.resolve({
            data: {
              is_valid: false,
              errors: [
                {
                  material_intake_id: 'mil-001',
                  error: 'Insufficient inventory',
                  requested_quantity: 25,
                  available_quantity: 10
                }
              ]
            },
            error: null
          } as any);
        }
        
        return Promise.resolve({ data: null, error: null } as any);
      });

      const batchData = {
        batch_number: 'GR-2025-001',
        production_date: '2025-07-20',
        notes: 'Test batch',
        inputs: [
          {
            material_intake_id: 'mil-001',
            quantity_used: 25
          }
        ]
      };

      await expect(ProductionBatchService.createProductionBatch(batchData)).rejects.toThrow(
        'Inventory validation failed'
      );

      // Verify validation was called
      expect(supabase.rpc).toHaveBeenCalledWith('validate_production_batch_inventory', {
        inventory_decrements: batchData.inputs
      });

      // Verify atomic creation was NOT called after validation failure
      expect(supabase.rpc).not.toHaveBeenCalledWith('create_production_batch_atomic', expect.anything());

      // Verify error toast
      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Inventory validation failed/)
      );
    });

    it('should verify manual rollback functionality for production batches', async () => {
      // Test the manual rollback function that restores inventory
      const originalInputs = [
        {
          id: 'input-1',
          batch_id: 'batch-1',
          material_intake_id: 'mil-001',
          quantity_used: 25,
          cost_per_unit: 450,
          total_cost: 11250,
          created_at: '2025-07-20T00:00:00Z'
        },
        {
          id: 'input-2',
          batch_id: 'batch-1',
          material_intake_id: 'mil-002',
          quantity_used: 15,
          cost_per_unit: 450,
          total_cost: 6750,
          created_at: '2025-07-20T00:00:00Z'
        }
      ];

      await ProductionBatchService.rollbackProductionBatch(
        'batch-1',
        originalInputs,
        'Test rollback scenario',
        'user-1'
      );

      // Verify inventory restoration for each input
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledTimes(2);
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledWith(
        'mil-001',
        25,
        'batch-1',
        'production_batch_rollback',
        expect.stringContaining('Rollback: Restoring inventory'),
        'user-1'
      );
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledWith(
        'mil-002',
        15,
        'batch-1',
        'production_batch_rollback',
        expect.stringContaining('Rollback: Restoring inventory'),
        'user-1'
      );

      // Verify rollback warning toast
      expect(toastModule.toast.warning).toHaveBeenCalledWith(
        expect.stringMatching(/rolled back.*Test rollback scenario/)
      );
    });

    it('should handle partial rollback failures gracefully', async () => {
      const originalInputs = [
        {
          id: 'input-1',
          batch_id: 'batch-1',
          material_intake_id: 'mil-001',
          quantity_used: 25,
          cost_per_unit: 450,
          total_cost: 11250,
          created_at: '2025-07-20T00:00:00Z'
        },
        {
          id: 'input-2',
          batch_id: 'batch-1',
          material_intake_id: 'mil-002',
          quantity_used: 15,
          cost_per_unit: 450,
          total_cost: 6750,
          created_at: '2025-07-20T00:00:00Z'
        }
      ];

      // Mock first increment to fail, second to succeed
      vi.mocked(InventoryService.incrementBatchQuantity)
        .mockRejectedValueOnce(new Error('Failed to restore mil-001'))
        .mockResolvedValueOnce(undefined);

      await ProductionBatchService.rollbackProductionBatch(
        'batch-1',
        originalInputs,
        'Partial rollback test',
        'user-1'
      );

      // Should attempt both increments despite first failure
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledTimes(2);
      
      // Should still complete rollback process
      expect(toastModule.toast.warning).toHaveBeenCalledWith(
        expect.stringMatching(/rolled back.*Partial rollback test/)
      );
    });
  });

  describe('Transaction Isolation and Concurrency', () => {
    it('should handle concurrent order creation attempts', async () => {
      // Mock first call to succeed, second to fail with duplicate error
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: {
            order: { id: 'order-1', order_number: 'ORD-2025-0001' },
            invoice: { id: 'invoice-1', invoice_number: 'INV-2025-0001', order_id: 'order-1' }
          },
          error: null
        } as any)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Duplicate invoice number' }
        } as any);

      const orderData = {
        customer_id: 'customer-1',
        order_date: '2025-07-20',
        status: 'draft',
        payment_status: 'pending',
        discount_amount: 0,
        total_amount: 1000,
        tax_amount: 100,
        net_amount: 1100,
        items: []
      };

      // First call should succeed
      const result1 = await OrderService.createOrder(orderData);
      expect(result1.order).toBeDefined();
      expect(result1.invoice).toBeDefined();

      // Second call should fail
      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Failed to create order and invoice: Duplicate invoice number'
      );
    });

    it('should handle concurrent production batch creation attempts', async () => {
      // Mock validation to succeed for both calls
      vi.mocked(supabase.rpc)
        .mockImplementation((functionName: string) => {
          if (functionName === 'validate_production_batch_inventory') {
            return Promise.resolve({
              data: { is_valid: true, errors: [] },
              error: null
            } as any);
          }
          
          if (functionName === 'create_production_batch_atomic') {
            // First call succeeds, second fails with concurrent modification
            if ((supabase.rpc as jest.Mock).mock.calls.filter(call => call[0] === 'create_production_batch_atomic').length === 1) {
              return Promise.resolve({
                data: {
                  batch: { id: 'batch-1', batch_number: 'GR-2025-001' },
                  inputs: [],
                  total_input_cost: 18000
                },
                error: null
              } as any);
            } else {
              return Promise.resolve({
                data: null,
                error: { message: 'Concurrent modification detected' }
              } as any);
            }
          }
          
          return Promise.resolve({ data: null, error: null } as any);
        });

      const batchData = {
        batch_number: 'GR-2025-001',
        production_date: '2025-07-20',
        notes: 'Test batch',
        inputs: [
          { material_intake_id: 'mil-001', quantity_used: 25 }
        ]
      };

      // First call should succeed
      const result1 = await ProductionBatchService.createProductionBatch(batchData);
      expect(result1.id).toBe('batch-1');

      // Second call should fail
      await expect(ProductionBatchService.createProductionBatch(batchData)).rejects.toThrow(
        'Database operation failed: Concurrent modification detected'
      );
    });
  });

  describe('Database Function Behavior Verification', () => {
    it('should verify order/invoice database function handles validation', async () => {
      // Test various validation scenarios
      const testCases = [
        {
          description: 'Missing customer_id',
          orderData: { total_amount: '1000' },
          expectedError: 'customer_id is required'
        },
        {
          description: 'Missing total_amount',
          orderData: { customer_id: 'customer-1' },
          expectedError: 'total_amount is required'
        }
      ];

      for (const testCase of testCases) {
        // Mock validation error from database function
        vi.mocked(supabase.rpc).mockResolvedValueOnce({
          data: null,
          error: { message: testCase.expectedError }
        } as any);

        await expect(OrderService.createOrder({
          customer_id: testCase.orderData.customer_id || '',
          order_date: '2025-07-20',
          status: 'draft',
          payment_status: 'pending',
          discount_amount: 0,
          total_amount: testCase.orderData.total_amount ? parseInt(testCase.orderData.total_amount) : 0,
          tax_amount: 0,
          net_amount: testCase.orderData.total_amount ? parseInt(testCase.orderData.total_amount) : 0,
          items: []
        })).rejects.toThrow(testCase.expectedError);
      }
    });

    it('should verify production batch database function handles validation', async () => {
      // Test various validation scenarios
      const testCases = [
        {
          description: 'Material not found',
          error: 'Material intake record not found: mil-999'
        },
        {
          description: 'Insufficient inventory',
          error: 'Insufficient inventory: material mil-001 has 10 remaining, requested 25'
        }
      ];

      for (const testCase of testCases) {
        // Mock validation success but creation failure
        vi.mocked(supabase.rpc)
          .mockImplementationOnce((functionName: string) => {
            if (functionName === 'validate_production_batch_inventory') {
              return Promise.resolve({
                data: { is_valid: true, errors: [] },
                error: null
              } as any);
            }
            return Promise.resolve({ data: null, error: null } as any);
          })
          .mockImplementationOnce((functionName: string) => {
            if (functionName === 'create_production_batch_atomic') {
              return Promise.resolve({
                data: null,
                error: { message: testCase.error }
              } as any);
            }
            return Promise.resolve({ data: null, error: null } as any);
          });

        const batchData = {
          batch_number: 'GR-2025-001',
          production_date: '2025-07-20',
          notes: 'Test batch',
          inputs: [
            { material_intake_id: 'mil-001', quantity_used: 25 }
          ]
        };

        await expect(ProductionBatchService.createProductionBatch(batchData)).rejects.toThrow(
          expect.stringMatching(new RegExp(testCase.error.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        );
      }
    });
  });

  describe('End-to-End Transaction Flow', () => {
    it('should verify complete order-to-inventory flow', async () => {
      // Mock successful order/invoice creation
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          order: {
            id: 'order-1',
            order_number: 'ORD-2025-0001',
            customer_id: 'customer-1',
            total_amount: 1100
          },
          invoice: {
            id: 'invoice-1',
            invoice_number: 'INV-2025-0001',
            order_id: 'order-1'
          }
        },
        error: null
      } as any);

      // Mock successful inventory operations
      vi.mocked(InventoryService.decrementBatchQuantity).mockResolvedValue(undefined);
      vi.mocked(InventoryService.validateBatchSelection).mockResolvedValue({
        isValid: true,
        message: 'Valid selection',
        availableQuantity: 50
      });

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

      const result = await OrderService.createOrder(orderData);

      // Verify order and invoice were created
      expect(result.order).toBeDefined();
      expect(result.invoice).toBeDefined();
      expect(result.order.id).toBe('order-1');
      expect(result.invoice.id).toBe('invoice-1');

      // Verify inventory was decremented
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledTimes(1);
      const call = vi.mocked(InventoryService.decrementBatchQuantity).mock.calls[0];
      expect(call[0]).toBe('batch-1'); // batch ID
      expect(call[1]).toBe(10); // quantity
      expect(call[2]).toBe('order-1'); // reference ID

      // Verify success toast
      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/ORD-2025-0001.*INV-2025-0001/)
      );
    });

    it('should verify complete production-to-inventory flow', async () => {
      // Mock successful validation and batch creation
      vi.mocked(supabase.rpc).mockImplementation((functionName: string) => {
        if (functionName === 'validate_production_batch_inventory') {
          return Promise.resolve({
            data: { is_valid: true, errors: [] },
            error: null
          } as any);
        }
        
        if (functionName === 'create_production_batch_atomic') {
          return Promise.resolve({
            data: {
              batch: {
                id: 'batch-1',
                batch_number: 'GR-2025-001',
                total_input_cost: 11250
              },
              inputs: [
                {
                  id: 'input-1',
                  material_intake_id: 'mil-001',
                  quantity_used: 25,
                  material_name: 'Cream Butter',
                  cost_per_unit: 450,
                  total_cost: 11250
                }
              ],
              total_input_cost: 11250
            },
            error: null
          } as any);
        }
        
        return Promise.resolve({ data: null, error: null } as any);
      });

      const batchData = {
        batch_number: 'GR-2025-001',
        production_date: '2025-07-20',
        notes: 'Test batch',
        inputs: [
          { material_intake_id: 'mil-001', quantity_used: 25 }
        ]
      };

      const result = await ProductionBatchService.createProductionBatch(batchData);

      // Verify batch was created
      expect(result.id).toBe('batch-1');
      expect(result.batch_number).toBe('GR-2025-001');
      expect(result.total_input_cost).toBe(11250);

      // Verify validation was called first
      expect(supabase.rpc).toHaveBeenCalledWith('validate_production_batch_inventory', {
        inventory_decrements: batchData.inputs
      });

      // Verify atomic function was called
      expect(supabase.rpc).toHaveBeenCalledWith('create_production_batch_atomic', {
        batch_data: expect.objectContaining({
          batch_number: 'GR-2025-001'
        }),
        inventory_decrements: batchData.inputs
      });

      // Verify success toast
      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/GR-2025-001.*created successfully/)
      );
    });
  });
});
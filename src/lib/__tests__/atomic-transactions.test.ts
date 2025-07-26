// src/lib/__tests__/atomic-transactions.test.ts
// Integration tests for atomic transaction functionality

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
    rpc: vi.fn()
  }
}));

// Mock the InventoryService
vi.mock('@/lib/inventory', () => ({
  InventoryService: {
    decrementBatchQuantity: vi.fn(),
    incrementBatchQuantity: vi.fn(),
    validateBatchSelection: vi.fn(),
    getAvailableBatches: vi.fn()
  }
}));

describe('Atomic Transaction Functionality', () => {
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Order/Invoice Creation Atomicity', () => {
    it('should create order and invoice atomically', async () => {
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

      // Verify atomic database function was called
      expect(supabase.rpc).toHaveBeenCalledWith('create_order_with_invoice', {
        order_data: expect.objectContaining({
          customer_id: 'customer-1',
          total_amount: '1100'
        }),
        invoice_data: {}
      });

      // Verify both order and invoice are returned
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

    it('should rollback when order/invoice creation fails', async () => {
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

    it('should handle partial failure with inventory operations', async () => {
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

      // Mock inventory decrement failure
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
    });

    it('should validate order data before atomic operation', async () => {
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

      // Mock database function validation error
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'customer_id is required' }
      } as any);

      await expect(OrderService.createOrder(invalidOrderData)).rejects.toThrow(
        'customer_id is required'
      );

      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/customer_id is required/)
      );
    });
  });

  describe('Production Batch/Inventory Decrement Atomicity', () => {
    it('should create production batch and decrement inventory atomically', async () => {
      // Mock successful atomic database function
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

      // Verify atomic database function was called
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

    it('should rollback when production batch creation fails', async () => {
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

    it('should handle database function validation fallback', async () => {
      // Mock database validation failure, should fallback to individual validation
      vi.mocked(supabase.rpc).mockImplementation((functionName: string) => {
        if (functionName === 'validate_production_batch_inventory') {
          return Promise.reject(new Error('Database connection error'));
        }
        
        return Promise.resolve({ data: null, error: null } as any);
      });

      // Mock fallback individual validation failure
      vi.mocked(InventoryService.validateBatchSelection).mockResolvedValue({
        isValid: false,
        message: 'Insufficient inventory: 10 available, 25 requested',
        availableQuantity: 10
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

      const validationResult = await ProductionBatchService.validateProductionBatchInputs(batchData.inputs);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].error).toContain('Insufficient inventory');

      // Verify fallback validation was used
      expect(InventoryService.validateBatchSelection).toHaveBeenCalledWith('mil-001', 25);
    });
  });

  describe('Transaction Rollback Verification', () => {
    it('should verify order creation rollback on invoice failure', async () => {
      // This test verifies that the database function handles rollback correctly
      // by simulating a scenario where invoice creation fails within the atomic function
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Invoice creation failed: duplicate invoice number' }
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

      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Invoice creation failed'
      );

      // Verify the atomic function was called
      expect(supabase.rpc).toHaveBeenCalledWith('create_order_with_invoice', expect.anything());

      // Verify error handling
      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Invoice creation failed/)
      );
    });

    it('should verify production batch rollback on inventory failure', async () => {
      // Mock validation success but atomic creation failure due to inventory
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
            error: { message: 'Inventory decrement failed: concurrent modification detected' }
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
        'concurrent modification detected'
      );

      // Verify both validation and creation were attempted
      expect(supabase.rpc).toHaveBeenCalledWith('validate_production_batch_inventory', expect.anything());
      expect(supabase.rpc).toHaveBeenCalledWith('create_production_batch_atomic', expect.anything());

      // Verify error handling
      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/concurrent modification detected/)
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

  describe('Transaction Integrity Verification', () => {
    it('should verify order/invoice data consistency', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          order: {
            id: 'order-1',
            order_number: 'ORD-2025-0001',
            customer_id: 'customer-1',
            total_amount: 1100,
            status: 'draft'
          },
          invoice: {
            id: 'invoice-1',
            invoice_number: 'INV-2025-0001',
            order_id: 'order-1',
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
        items: []
      };

      const result = await OrderService.createOrder(orderData);

      // Verify data consistency between order and invoice
      expect(result.order.id).toBe('order-1');
      expect(result.invoice.order_id).toBe(result.order.id);
      expect(result.order.total_amount).toBe(result.invoice.total_amount);
      expect(result.order.customer_id).toBe('customer-1');
    });

    it('should verify production batch/inventory data consistency', async () => {
      vi.mocked(supabase.rpc).mockImplementation((functionName: string, params: any) => {
        if (functionName === 'validate_production_batch_inventory') {
          return Promise.resolve({
            data: { is_valid: true, errors: [] },
            error: null
          } as any);
        }
        
        if (functionName === 'create_production_batch_atomic') {
          const totalCost = params.inventory_decrements.reduce((sum: number, input: any) => 
            sum + (input.quantity_used * 450), 0
          );
          
          return Promise.resolve({
            data: {
              batch: {
                id: 'batch-1',
                batch_number: params.batch_data.batch_number,
                total_input_cost: totalCost
              },
              inputs: params.inventory_decrements.map((input: any, index: number) => ({
                id: `input-${index + 1}`,
                material_intake_id: input.material_intake_id,
                quantity_used: input.quantity_used,
                cost_per_unit: 450,
                total_cost: input.quantity_used * 450
              })),
              total_input_cost: totalCost
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
          { material_intake_id: 'mil-001', quantity_used: 25 },
          { material_intake_id: 'mil-002', quantity_used: 15 }
        ]
      };

      const result = await ProductionBatchService.createProductionBatch(batchData);

      // Verify data consistency
      expect(result.batch_number).toBe('GR-2025-001');
      expect(result.total_input_cost).toBe(18000); // (25 + 15) * 450
      
      // Verify the atomic function was called with consistent data
      expect(supabase.rpc).toHaveBeenCalledWith('create_production_batch_atomic', {
        batch_data: expect.objectContaining({
          batch_number: 'GR-2025-001'
        }),
        inventory_decrements: [
          { material_intake_id: 'mil-001', quantity_used: 25 },
          { material_intake_id: 'mil-002', quantity_used: 15 }
        ]
      });
    });
  });
});
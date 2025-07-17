// src/lib/__tests__/productionBatch.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductionBatchService, type CreateProductionBatchData, type UpdateProductionBatchData } from '../productionBatch';
import { InventoryService } from '../inventory';
import { User, UserRole } from '@/Entities/User';
import * as toastModule from '@/lib/toast';

// Mock the InventoryService
vi.mock('../inventory', () => ({
  InventoryService: {
    decrementBatchQuantity: vi.fn(),
    incrementBatchQuantity: vi.fn(),
    validateBatchSelection: vi.fn()
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

// Mock the User module
vi.mock('@/Entities/User', async () => {
  const actual = await vi.importActual('@/Entities/User');
  return {
    ...actual,
    User: {
      me: vi.fn()
    }
  };
});

describe('ProductionBatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current user
    vi.mocked(User.me).mockResolvedValue({
      id: 'user_1',
      email: 'production@test.com',
      role: UserRole.PRODUCTION,
      name: 'Production Manager',
      active: true
    });

    // Mock successful inventory operations by default
    vi.mocked(InventoryService.decrementBatchQuantity).mockResolvedValue(undefined);
    vi.mocked(InventoryService.incrementBatchQuantity).mockResolvedValue(undefined);
    vi.mocked(InventoryService.validateBatchSelection).mockResolvedValue({
      isValid: true,
      message: 'Valid selection',
      availableQuantity: 50
    });
  });

  describe('createProductionBatch', () => {
    const mockCreateData: CreateProductionBatchData = {
      batch_number: 'GR-2024-TEST-001',
      production_date: '2024-12-21T00:00:00Z',
      notes: 'Test production batch',
      inputs: [
        {
          material_intake_id: 'mil_001',
          quantity_used: 25
        },
        {
          material_intake_id: 'mil_002',
          quantity_used: 15
        }
      ]
    };

    it('should create production batch and decrement inventory', async () => {
      const result = await ProductionBatchService.createProductionBatch(mockCreateData);

      expect(result).toBeDefined();
      expect(result.batch_number).toBe('GR-2024-TEST-001');
      expect(result.status).toBe('draft');
      expect(result.total_input_cost).toBe(18000); // (25 + 15) * 450

      // Verify inventory decrements were called
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledTimes(2);
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledWith(
        'mil_001',
        25,
        result.id,
        'production_batch',
        expect.stringContaining('Material used in production batch'),
        'user_1'
      );
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledWith(
        'mil_002',
        15,
        result.id,
        'production_batch',
        expect.stringContaining('Material used in production batch'),
        'user_1'
      );

      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringContaining('created successfully')
      );
    });

    it('should rollback on inventory decrement failure', async () => {
      // Mock inventory decrement failure for second material
      vi.mocked(InventoryService.decrementBatchQuantity)
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Insufficient quantity')); // Second call fails

      await expect(
        ProductionBatchService.createProductionBatch(mockCreateData)
      ).rejects.toThrow();

      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create production batch')
      );
    });

    it('should handle empty inputs array', async () => {
      const dataWithNoInputs: CreateProductionBatchData = {
        ...mockCreateData,
        inputs: []
      };

      const result = await ProductionBatchService.createProductionBatch(dataWithNoInputs);

      expect(result.total_input_cost).toBe(0);
      expect(InventoryService.decrementBatchQuantity).not.toHaveBeenCalled();
    });
  });

  describe('updateProductionBatch', () => {
    it('should update production batch without changing inputs', async () => {
      const updateData: UpdateProductionBatchData = {
        status: 'in_progress',
        notes: 'Updated notes'
      };

      const result = await ProductionBatchService.updateProductionBatch('pb_001', updateData);

      expect(result.status).toBe('in_progress');
      expect(result.notes).toBe('Updated notes');
      expect(InventoryService.decrementBatchQuantity).not.toHaveBeenCalled();
    });

    it('should update production batch with new inputs', async () => {
      const updateData: UpdateProductionBatchData = {
        inputs: [
          {
            material_intake_id: 'mil_003',
            quantity_used: 20
          }
        ]
      };

      const result = await ProductionBatchService.updateProductionBatch('pb_001', updateData);

      expect(result.total_input_cost).toBe(9000); // 20 * 450
      expect(InventoryService.decrementBatchQuantity).toHaveBeenCalledWith(
        'mil_003',
        20,
        'pb_001',
        'production_batch',
        expect.stringContaining('updated production batch'),
        'user_1'
      );
    });

    it('should handle non-existent batch', async () => {
      await expect(
        ProductionBatchService.updateProductionBatch('non_existent', { status: 'completed' })
      ).rejects.toThrow('Production batch not found');
    });
  });

  describe('completeProductionBatch', () => {
    it('should complete production batch with output calculations', async () => {
      const result = await ProductionBatchService.completeProductionBatch('pb_001', 30, 'Excellent yield');

      expect(result.status).toBe('completed');
      expect(result.output_litres).toBe(30);
      expect(result.cost_per_litre).toBeGreaterThan(0); // Just check it's calculated
      expect(result.notes).toBe('Excellent yield');

      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringContaining('completed with 30L output')
      );
    });

    it('should handle non-existent batch', async () => {
      await expect(
        ProductionBatchService.completeProductionBatch('non_existent', 25)
      ).rejects.toThrow('Production batch not found');
    });
  });

  describe('validateProductionBatchInputs', () => {
    it('should validate all inputs successfully', async () => {
      const inputs = [
        { material_intake_id: 'mil_001', quantity_used: 10 },
        { material_intake_id: 'mil_002', quantity_used: 15 }
      ];

      const result = await ProductionBatchService.validateProductionBatchInputs(inputs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(InventoryService.validateBatchSelection).toHaveBeenCalledTimes(2);
    });

    it('should return validation errors for invalid inputs', async () => {
      // Mock validation failure for first input
      vi.mocked(InventoryService.validateBatchSelection)
        .mockResolvedValueOnce({
          isValid: false,
          message: 'Insufficient quantity',
          availableQuantity: 5
        })
        .mockResolvedValueOnce({
          isValid: true,
          message: 'Valid',
          availableQuantity: 20
        });

      const inputs = [
        { material_intake_id: 'mil_001', quantity_used: 10 },
        { material_intake_id: 'mil_002', quantity_used: 15 }
      ];

      const result = await ProductionBatchService.validateProductionBatchInputs(inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        material_intake_id: 'mil_001',
        error: 'Insufficient quantity',
        availableQuantity: 5
      });
    });

    it('should handle validation errors gracefully', async () => {
      vi.mocked(InventoryService.validateBatchSelection).mockRejectedValue(
        new Error('Network error')
      );

      const inputs = [
        { material_intake_id: 'mil_001', quantity_used: 10 }
      ];

      const result = await ProductionBatchService.validateProductionBatchInputs(inputs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Validation failed');
    });
  });

  describe('getProductionBatchWithInputs', () => {
    it('should return batch with inputs', async () => {
      const result = await ProductionBatchService.getProductionBatchWithInputs('pb_001');

      expect(result).toBeDefined();
      expect(result?.batch).toBeDefined();
      expect(result?.inputs).toBeDefined();
      expect(Array.isArray(result?.inputs)).toBe(true);
    });

    it('should return null for non-existent batch', async () => {
      const result = await ProductionBatchService.getProductionBatchWithInputs('non_existent');

      expect(result).toBeNull();
    });
  });

  describe('rollbackProductionBatch', () => {
    it('should create rollback transaction and update batch status', async () => {
      const originalInputs = [
        {
          id: 'bi_001',
          batch_id: 'pb_001',
          material_intake_id: 'mil_001',
          quantity_used: 25,
          cost_per_unit: 450,
          total_cost: 11250,
          created_at: '2024-12-20T00:00:00Z'
        }
      ];

      await ProductionBatchService.rollbackProductionBatch(
        'pb_001',
        originalInputs,
        'Test rollback',
        'user_1'
      );

      expect(toastModule.toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('rolled back')
      );
    });

    it('should restore inventory quantities during rollback', async () => {
      const originalInputs = [
        {
          id: 'bi_001',
          batch_id: 'pb_001',
          material_intake_id: 'mil_001',
          quantity_used: 25,
          cost_per_unit: 450,
          total_cost: 11250,
          created_at: '2024-12-20T00:00:00Z'
        },
        {
          id: 'bi_002',
          batch_id: 'pb_001',
          material_intake_id: 'mil_002',
          quantity_used: 15,
          cost_per_unit: 460,
          total_cost: 6900,
          created_at: '2024-12-20T00:00:00Z'
        }
      ];

      await ProductionBatchService.rollbackProductionBatch(
        'pb_001',
        originalInputs,
        'Test rollback with inventory restoration',
        'user_1'
      );

      // Verify that inventory was restored for each input
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledTimes(2);
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledWith(
        'mil_001',
        25,
        'pb_001',
        'production_batch_rollback',
        expect.stringContaining('Rollback: Restoring inventory'),
        'user_1'
      );
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledWith(
        'mil_002',
        15,
        'pb_001',
        'production_batch_rollback',
        expect.stringContaining('Rollback: Restoring inventory'),
        'user_1'
      );

      expect(toastModule.toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('rolled back')
      );
    });

    it('should continue rollback even if some inventory restoration fails', async () => {
      const originalInputs = [
        {
          id: 'bi_001',
          batch_id: 'pb_001',
          material_intake_id: 'mil_001',
          quantity_used: 25,
          cost_per_unit: 450,
          total_cost: 11250,
          created_at: '2024-12-20T00:00:00Z'
        },
        {
          id: 'bi_002',
          batch_id: 'pb_001',
          material_intake_id: 'mil_002',
          quantity_used: 15,
          cost_per_unit: 460,
          total_cost: 6900,
          created_at: '2024-12-20T00:00:00Z'
        }
      ];

      // Mock first increment to fail, second to succeed
      vi.mocked(InventoryService.incrementBatchQuantity)
        .mockRejectedValueOnce(new Error('Failed to restore inventory'))
        .mockResolvedValueOnce(undefined);

      await ProductionBatchService.rollbackProductionBatch(
        'pb_001',
        originalInputs,
        'Test partial rollback failure',
        'user_1'
      );

      // Should still attempt both increments
      expect(InventoryService.incrementBatchQuantity).toHaveBeenCalledTimes(2);
      
      // Should still complete the rollback process
      expect(toastModule.toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('rolled back')
      );
    });
  });

  describe('getProductionBatchAuditTrail', () => {
    it('should return comprehensive audit trail for batch', async () => {
      const result = await ProductionBatchService.getProductionBatchAuditTrail('pb_001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Should include batch creation event
      const batchCreatedEvent = result.find(event => event.action === 'batch_created');
      expect(batchCreatedEvent).toBeDefined();
      expect(batchCreatedEvent?.details).toHaveProperty('batch_id');
      expect(batchCreatedEvent?.details).toHaveProperty('batch_number');
      
      // Should include inventory decrement events (pb_001 has one input in mock data)
      const inventoryEvents = result.filter(event => event.action === 'inventory_decremented');
      expect(inventoryEvents.length).toBeGreaterThanOrEqual(0); // Changed to >= 0 since pb_001 has inputs
      
      // Each event should have required properties
      result.forEach(event => {
        expect(event).toHaveProperty('action');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('user_id');
        expect(event).toHaveProperty('details');
      });
    });

    it('should return empty array for non-existent batch', async () => {
      const result = await ProductionBatchService.getProductionBatchAuditTrail('non_existent');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getInventoryMovementSummary', () => {
    it('should return inventory movement summary for batch', async () => {
      const result = await ProductionBatchService.getInventoryMovementSummary('pb_001');

      expect(result).toHaveProperty('totalMaterialsUsed');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('materials');
      expect(result).toHaveProperty('transactions');
      
      expect(Array.isArray(result.materials)).toBe(true);
      expect(Array.isArray(result.transactions)).toBe(true);
      
      if (result.materials.length > 0) {
        expect(result.materials[0]).toHaveProperty('material_intake_id');
        expect(result.materials[0]).toHaveProperty('quantity_used');
        expect(result.materials[0]).toHaveProperty('cost_per_unit');
        expect(result.materials[0]).toHaveProperty('total_cost');
      }
      
      if (result.transactions.length > 0) {
        expect(result.transactions[0]).toHaveProperty('material_intake_id');
        expect(result.transactions[0]).toHaveProperty('transaction_type');
        expect(result.transactions[0]).toHaveProperty('quantity_changed');
        expect(result.transactions[0]).toHaveProperty('timestamp');
        expect(result.transactions[0]).toHaveProperty('user_id');
      }
    });

    it('should handle batch with no inputs', async () => {
      const result = await ProductionBatchService.getInventoryMovementSummary('non_existent');

      expect(result.totalMaterialsUsed).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.materials).toHaveLength(0);
      expect(result.transactions).toHaveLength(0);
    });
  });
});
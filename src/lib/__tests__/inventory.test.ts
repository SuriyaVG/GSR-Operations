// src/lib/__tests__/inventory.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService, InventoryError, InventoryErrorType } from '../inventory';
import { User, UserRole } from '@/Entities/User';
import * as toastModule from '@/lib/toast';

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

describe('InventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock current user as admin by default
    vi.mocked(User.me).mockResolvedValue({
      id: 'user_1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Test Admin',
      active: true
    });
  });

  describe('getAvailableBatches', () => {
    it('should return available batches in FIFO order', async () => {
      const batches = await InventoryService.getAvailableBatches('rm_001');

      expect(batches).toHaveLength(2);
      expect(batches[0].lot_number).toBe('CB-2024-001');
      expect(batches[1].lot_number).toBe('CB-2024-002');

      // Verify FIFO order (earlier intake_date first)
      const firstBatchDate = new Date(batches[0].intake_date);
      const secondBatchDate = new Date(batches[1].intake_date);
      expect(firstBatchDate.getTime()).toBeLessThan(secondBatchDate.getTime());
    });

    it('should filter out zero-quantity batches', async () => {
      const batches = await InventoryService.getAvailableBatches('rm_002');

      // rm_002 has one batch with zero quantity, should be filtered out
      expect(batches).toHaveLength(0);
    });

    it('should handle material with no batches', async () => {
      const batches = await InventoryService.getAvailableBatches('rm_999');

      expect(batches).toHaveLength(0);
    });
  });

  describe('validateBatchSelection', () => {
    it('should validate successful batch selection', async () => {
      const result = await InventoryService.validateBatchSelection('1', 20);

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Batch selection is valid');
      expect(result.availableQuantity).toBe(25);
    });

    it('should reject selection with insufficient quantity', async () => {
      const result = await InventoryService.validateBatchSelection('1', 30);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Insufficient quantity');
      expect(result.availableQuantity).toBe(25);
      expect(result.suggestedBatches).toBeDefined();
    });

    it('should reject selection for non-existent batch', async () => {
      const result = await InventoryService.validateBatchSelection('999', 10);

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Batch not found');
      expect(result.availableQuantity).toBe(0);
    });

    it('should reject invalid input parameters', async () => {
      const result1 = await InventoryService.validateBatchSelection('', 10);
      const result2 = await InventoryService.validateBatchSelection('1', 0);
      const result3 = await InventoryService.validateBatchSelection('1', -5);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result3.isValid).toBe(false);
    });
  });

  describe('decrementBatchQuantity', () => {
    it('should successfully decrement batch quantity with proper authorization', async () => {
      await expect(
        InventoryService.decrementBatchQuantity('1', 10, 'order_123', 'order', 'Order fulfillment')
      ).resolves.not.toThrow();

      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Successfully decremented 10 units')
      );
    });

    it('should reject unauthorized users', async () => {
      // Mock user without inventory permissions
      vi.mocked(User.me).mockResolvedValue({
        id: 'user_2',
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
        name: 'Test Viewer',
        active: true
      });

      await expect(
        InventoryService.decrementBatchQuantity('1', 10)
      ).rejects.toThrow(InventoryError);

      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized')
      );
    });

    it('should reject decrement with insufficient quantity', async () => {
      await expect(
        InventoryService.decrementBatchQuantity('1', 50)
      ).rejects.toThrow(InventoryError);
    });

    it('should reject decrement for non-existent batch', async () => {
      await expect(
        InventoryService.decrementBatchQuantity('999', 10)
      ).rejects.toThrow(InventoryError);
    });
  });

  describe('incrementBatchQuantity', () => {
    it('should successfully increment batch quantity with proper authorization', async () => {
      await expect(
        InventoryService.incrementBatchQuantity('1', 5, 'rollback_123', 'rollback', 'Inventory restoration')
      ).resolves.not.toThrow();

      expect(toastModule.toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Successfully restored 5 units')
      );
    });

    it('should reject unauthorized users for increment', async () => {
      // Mock user without inventory permissions
      vi.mocked(User.me).mockResolvedValue({
        id: 'user_2',
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
        name: 'Test Viewer',
        active: true
      });

      await expect(
        InventoryService.incrementBatchQuantity('1', 5)
      ).rejects.toThrow(InventoryError);

      expect(toastModule.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized')
      );
    });

    it('should reject increment for non-existent batch', async () => {
      await expect(
        InventoryService.incrementBatchQuantity('999', 5)
      ).rejects.toThrow(InventoryError);
    });
  });

  describe('getFIFOBatchSelection', () => {
    it('should select batches in FIFO order for required quantity', async () => {
      const result = await InventoryService.getFIFOBatchSelection('rm_001', 40);

      expect(result.batches).toHaveLength(2);
      expect(result.totalAvailable).toBeGreaterThanOrEqual(40);

      // First batch should be used (FIFO order)
      expect(result.batches[0].batch.lot_number).toBe('CB-2024-001');

      // Second batch should be used for remaining quantity
      expect(result.batches[1].batch.lot_number).toBe('CB-2024-002');

      // Total quantity used should equal requested
      const totalUsed = result.batches.reduce((sum, b) => sum + b.quantityToUse, 0);
      expect(totalUsed).toBe(40);
    });

    it('should handle single batch selection', async () => {
      const result = await InventoryService.getFIFOBatchSelection('rm_001', 15);

      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].batch.lot_number).toBe('CB-2024-001');
      expect(result.batches[0].quantityToUse).toBe(15);
    });

    it('should reject when insufficient total quantity', async () => {
      await expect(
        InventoryService.getFIFOBatchSelection('rm_001', 100)
      ).rejects.toThrow(InventoryError);
    });

    it('should handle material with no available batches', async () => {
      await expect(
        InventoryService.getFIFOBatchSelection('rm_999', 10)
      ).rejects.toThrow(InventoryError);
    });
  });

  describe('checkMaterialStock', () => {
    it('should return true when sufficient stock available', async () => {
      const result = await InventoryService.checkMaterialStock('rm_001', 30);
      expect(result).toBe(true);
    });

    it('should return false when insufficient stock', async () => {
      const result = await InventoryService.checkMaterialStock('rm_001', 100);
      expect(result).toBe(false);
    });

    it('should return false for non-existent material', async () => {
      const result = await InventoryService.checkMaterialStock('rm_999', 10);
      expect(result).toBe(false);
    });
  });

  describe('getBatchTransactionHistory', () => {
    it('should return empty history for new batch', async () => {
      const history = await InventoryService.getBatchTransactionHistory('1');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return batches below threshold', async () => {
      const alerts = await InventoryService.getLowStockAlerts(50);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should use default threshold when not provided', async () => {
      const alerts = await InventoryService.getLowStockAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should create InventoryError with correct properties', () => {
      const error = new InventoryError(
        InventoryErrorType.INSUFFICIENT_QUANTITY,
        'Test error',
        'batch_1',
        10
      );

      expect(error.type).toBe(InventoryErrorType.INSUFFICIENT_QUANTITY);
      expect(error.message).toBe('Test error');
      expect(error.batchId).toBe('batch_1');
      expect(error.requestedQuantity).toBe(10);
      expect(error.name).toBe('InventoryError');
    });
  });
});
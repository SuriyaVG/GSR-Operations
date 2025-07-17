// src/lib/inventory.ts
// Inventory service with FIFO batch selection logic

import { toast } from '@/lib/toast';
import { AuthorizationService, User } from '@/Entities/User';

// Material batch interface for FIFO operations
export interface MaterialBatch {
  id: string;
  material_intake_id: string;
  raw_material_id: string;
  supplier_id: string;
  lot_number: string;
  quantity_received: number;
  remaining_quantity: number;
  cost_per_unit: number;
  intake_date: string;
  expiry_date?: string;
  quality_grade?: string;
  storage_location?: string;
  created_at: string;
  updated_at: string;
}

// Batch selection validation result
export interface BatchValidationResult {
  isValid: boolean;
  message: string;
  availableQuantity: number;
  suggestedBatches?: MaterialBatch[];
}

// Inventory transaction for audit trail
export interface InventoryTransaction {
  id: string;
  batch_id: string;
  transaction_type: 'decrement' | 'increment' | 'adjustment';
  quantity_changed: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string; // order_id, production_batch_id, etc.
  reference_type?: string; // 'order', 'production_batch', 'adjustment'
  reason: string;
  user_id: string;
  created_at: string;
}

// Error types for inventory operations
export enum InventoryErrorType {
  INSUFFICIENT_QUANTITY = 'insufficient_quantity',
  BATCH_NOT_FOUND = 'batch_not_found',
  EXPIRED_BATCH = 'expired_batch',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  INVALID_QUANTITY = 'invalid_quantity',
  TRANSACTION_FAILED = 'transaction_failed'
}

export class InventoryError extends Error {
  constructor(
    public type: InventoryErrorType,
    message: string,
    public batchId?: string,
    public requestedQuantity?: number
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

// Mock database client for inventory operations
class MockInventoryClient {
  private batches: MaterialBatch[] = [
    {
      id: '1',
      material_intake_id: 'mil_001',
      raw_material_id: 'rm_001',
      supplier_id: 'sup_001',
      lot_number: 'CB-2024-001',
      quantity_received: 50,
      remaining_quantity: 25,
      cost_per_unit: 450.00,
      intake_date: '2024-12-15T00:00:00Z',
      expiry_date: '2025-12-15T00:00:00Z', // Future expiry date
      quality_grade: 'A',
      storage_location: 'Cold Storage A1',
      created_at: '2024-12-15T00:00:00Z',
      updated_at: '2024-12-15T00:00:00Z'
    },
    {
      id: '2',
      material_intake_id: 'mil_002',
      raw_material_id: 'rm_001',
      supplier_id: 'sup_001',
      lot_number: 'CB-2024-002',
      quantity_received: 30,
      remaining_quantity: 30,
      cost_per_unit: 460.00,
      intake_date: '2024-12-18T00:00:00Z',
      expiry_date: '2025-12-18T00:00:00Z', // Future expiry date
      quality_grade: 'A',
      storage_location: 'Cold Storage A2',
      created_at: '2024-12-18T00:00:00Z',
      updated_at: '2024-12-18T00:00:00Z'
    },
    {
      id: '3',
      material_intake_id: 'mil_003',
      raw_material_id: 'rm_002',
      supplier_id: 'sup_002',
      lot_number: 'MO-2024-001',
      quantity_received: 20,
      remaining_quantity: 0, // Zero quantity batch
      cost_per_unit: 380.00,
      intake_date: '2024-12-10T00:00:00Z',
      expiry_date: '2025-12-10T00:00:00Z', // Future expiry date
      quality_grade: 'B',
      storage_location: 'Dry Storage B1',
      created_at: '2024-12-10T00:00:00Z',
      updated_at: '2024-12-20T00:00:00Z'
    }
  ];

  private transactions: InventoryTransaction[] = [];

  async getBatchesByMaterial(materialId: string): Promise<MaterialBatch[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return this.batches
      .filter(batch => batch.raw_material_id === materialId)
      .sort((a, b) => new Date(a.intake_date).getTime() - new Date(b.intake_date).getTime()); // FIFO order
  }

  async getBatchById(batchId: string): Promise<MaterialBatch | null> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return this.batches.find(batch => batch.id === batchId) || null;
  }

  async updateBatchQuantity(batchId: string, newQuantity: number): Promise<MaterialBatch> {
    await new Promise(resolve => setTimeout(resolve, 40));
    
    const batchIndex = this.batches.findIndex(batch => batch.id === batchId);
    if (batchIndex === -1) {
      throw new Error('Batch not found');
    }

    this.batches[batchIndex] = {
      ...this.batches[batchIndex],
      remaining_quantity: newQuantity,
      updated_at: new Date().toISOString()
    };

    return this.batches[batchIndex];
  }

  async createTransaction(transaction: Omit<InventoryTransaction, 'id' | 'created_at'>): Promise<InventoryTransaction> {
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const newTransaction: InventoryTransaction = {
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString()
    };

    this.transactions.push(newTransaction);
    return newTransaction;
  }

  async getTransactionsByBatch(batchId: string): Promise<InventoryTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return this.transactions
      .filter(txn => txn.batch_id === batchId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

// Inventory service class
export class InventoryService {
  private static client = new MockInventoryClient();

  // Get available batches with FIFO ordering by intake_date
  static async getAvailableBatches(materialId: string): Promise<MaterialBatch[]> {
    try {
      const batches = await this.client.getBatchesByMaterial(materialId);
      
      // Filter out expired and zero-quantity batches
      const availableBatches = batches.filter(batch => {
        // Check if batch has remaining quantity
        if (batch.remaining_quantity <= 0) {
          return false;
        }

        // Check if batch is expired
        if (batch.expiry_date) {
          const expiryDate = new Date(batch.expiry_date);
          const now = new Date();
          if (expiryDate <= now) {
            return false;
          }
        }

        return true;
      });

      // Already sorted by intake_date in FIFO order from the client
      return availableBatches;
    } catch (error) {
      const message = `Failed to retrieve available batches for material ${materialId}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message
      );
    }
  }

  // Validate batch selection and check remaining quantities
  static async validateBatchSelection(
    batchId: string, 
    requestedQuantity: number
  ): Promise<BatchValidationResult> {
    try {
      // Validate input parameters
      if (!batchId || requestedQuantity <= 0) {
        return {
          isValid: false,
          message: 'Invalid batch ID or quantity',
          availableQuantity: 0
        };
      }

      const batch = await this.client.getBatchById(batchId);
      
      if (!batch) {
        return {
          isValid: false,
          message: 'Batch not found',
          availableQuantity: 0
        };
      }

      // Check if batch has sufficient quantity
      if (batch.remaining_quantity < requestedQuantity) {
        // Get alternative batches for the same material
        const alternativeBatches = await this.getAvailableBatches(batch.raw_material_id);
        const otherBatches = alternativeBatches.filter(b => b.id !== batchId);

        return {
          isValid: false,
          message: `Insufficient quantity. Available: ${batch.remaining_quantity}, Requested: ${requestedQuantity}`,
          availableQuantity: batch.remaining_quantity,
          suggestedBatches: otherBatches.slice(0, 3) // Suggest up to 3 alternative batches
        };
      }

      // Check if batch is expired
      if (batch.expiry_date) {
        const expiryDate = new Date(batch.expiry_date);
        const now = new Date();
        if (expiryDate <= now) {
          return {
            isValid: false,
            message: 'Batch has expired',
            availableQuantity: batch.remaining_quantity
          };
        }
      }

      return {
        isValid: true,
        message: 'Batch selection is valid',
        availableQuantity: batch.remaining_quantity
      };
    } catch (error) {
      const message = `Failed to validate batch selection: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message,
        batchId,
        requestedQuantity
      );
    }
  }

  // Decrement batch quantity with transaction logging
  static async decrementBatchQuantity(
    batchId: string,
    usedQuantity: number,
    referenceId?: string,
    referenceType?: string,
    reason: string = 'Material consumption',
    userId?: string
  ): Promise<void> {
    try {
      // Get current user for authorization
      const currentUser = await User.me();
      const actualUserId = userId || currentUser.id;

      // Check authorization
      if (!AuthorizationService.canModifyInventory(currentUser)) {
        const message = 'Unauthorized: You do not have permission to modify inventory';
        toast.error(message);
        throw new InventoryError(
          InventoryErrorType.UNAUTHORIZED_ACCESS,
          message,
          batchId,
          usedQuantity
        );
      }

      // Validate the batch selection first
      const validation = await this.validateBatchSelection(batchId, usedQuantity);
      if (!validation.isValid) {
        throw new InventoryError(
          InventoryErrorType.INSUFFICIENT_QUANTITY,
          validation.message,
          batchId,
          usedQuantity
        );
      }

      // Get the current batch
      const batch = await this.client.getBatchById(batchId);
      if (!batch) {
        throw new InventoryError(
          InventoryErrorType.BATCH_NOT_FOUND,
          'Batch not found',
          batchId,
          usedQuantity
        );
      }

      const previousQuantity = batch.remaining_quantity;
      const newQuantity = previousQuantity - usedQuantity;

      // Update the batch quantity
      await this.client.updateBatchQuantity(batchId, newQuantity);

      // Create transaction record for audit trail
      await this.client.createTransaction({
        batch_id: batchId,
        transaction_type: 'decrement',
        quantity_changed: -usedQuantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_id: referenceId,
        reference_type: referenceType,
        reason: reason,
        user_id: actualUserId
      });

      toast.success(`Successfully decremented ${usedQuantity} units from batch ${batch.lot_number}`);
    } catch (error) {
      if (error instanceof InventoryError) {
        throw error;
      }

      const message = `Failed to decrement batch quantity: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message,
        batchId,
        usedQuantity
      );
    }
  }

  // Get FIFO batch selection for a given material and required quantity
  static async getFIFOBatchSelection(
    materialId: string,
    requiredQuantity: number
  ): Promise<{ batches: Array<{ batch: MaterialBatch; quantityToUse: number }>; totalAvailable: number }> {
    try {
      const availableBatches = await this.getAvailableBatches(materialId);
      
      const totalAvailable = availableBatches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
      
      if (totalAvailable < requiredQuantity) {
        throw new InventoryError(
          InventoryErrorType.INSUFFICIENT_QUANTITY,
          `Insufficient total quantity. Available: ${totalAvailable}, Required: ${requiredQuantity}`,
          undefined,
          requiredQuantity
        );
      }

      const batchSelection: Array<{ batch: MaterialBatch; quantityToUse: number }> = [];
      let remainingQuantity = requiredQuantity;

      // Select batches in FIFO order
      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break;

        const quantityToUse = Math.min(batch.remaining_quantity, remainingQuantity);
        batchSelection.push({
          batch,
          quantityToUse
        });

        remainingQuantity -= quantityToUse;
      }

      return {
        batches: batchSelection,
        totalAvailable
      };
    } catch (error) {
      if (error instanceof InventoryError) {
        throw error;
      }

      const message = `Failed to get FIFO batch selection: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message
      );
    }
  }

  // Get transaction history for a batch
  static async getBatchTransactionHistory(batchId: string): Promise<InventoryTransaction[]> {
    try {
      return await this.client.getTransactionsByBatch(batchId);
    } catch (error) {
      const message = `Failed to retrieve transaction history for batch ${batchId}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message,
        batchId
      );
    }
  }

  // Increment batch quantity (for rollback operations)
  static async incrementBatchQuantity(
    batchId: string,
    addedQuantity: number,
    referenceId?: string,
    referenceType?: string,
    reason: string = 'Inventory restoration',
    userId?: string
  ): Promise<void> {
    try {
      // Get current user for authorization
      const currentUser = await User.me();
      const actualUserId = userId || currentUser.id;

      // Check authorization
      if (!AuthorizationService.canModifyInventory(currentUser)) {
        const message = 'Unauthorized: You do not have permission to modify inventory';
        toast.error(message);
        throw new InventoryError(
          InventoryErrorType.UNAUTHORIZED_ACCESS,
          message,
          batchId,
          addedQuantity
        );
      }

      // Get the current batch
      const batch = await this.client.getBatchById(batchId);
      if (!batch) {
        throw new InventoryError(
          InventoryErrorType.BATCH_NOT_FOUND,
          'Batch not found',
          batchId,
          addedQuantity
        );
      }

      const previousQuantity = batch.remaining_quantity;
      const newQuantity = previousQuantity + addedQuantity;

      // Update the batch quantity
      await this.client.updateBatchQuantity(batchId, newQuantity);

      // Create transaction record for audit trail
      await this.client.createTransaction({
        batch_id: batchId,
        transaction_type: 'increment',
        quantity_changed: addedQuantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_id: referenceId,
        reference_type: referenceType,
        reason: reason,
        user_id: actualUserId
      });

      toast.success(`Successfully restored ${addedQuantity} units to batch ${batch.lot_number}`);
    } catch (error) {
      if (error instanceof InventoryError) {
        throw error;
      }

      const message = `Failed to increment batch quantity: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message,
        batchId,
        addedQuantity
      );
    }
  }

  // Rollback inventory transaction (for failed operations)
  static async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      // This would implement rollback logic in a real system
      // For now, we'll just log the rollback attempt
      console.warn(`Rollback requested for transaction ${transactionId}`);
      toast.info('Transaction rollback initiated');
    } catch (error) {
      const message = `Failed to rollback transaction ${transactionId}`;
      toast.error(message);
      throw new InventoryError(
        InventoryErrorType.TRANSACTION_FAILED,
        message
      );
    }
  }

  // Utility method to check if a material has sufficient stock
  static async checkMaterialStock(materialId: string, requiredQuantity: number): Promise<boolean> {
    try {
      const availableBatches = await this.getAvailableBatches(materialId);
      const totalAvailable = availableBatches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
      return totalAvailable >= requiredQuantity;
    } catch (error) {
      console.error(`Error checking material stock: ${error}`);
      return false;
    }
  }

  // Get low stock alerts (batches with quantity below threshold)
  static async getLowStockAlerts(threshold: number = 10): Promise<MaterialBatch[]> {
    try {
      // This would query all materials in a real system
      // For now, we'll check a few known materials
      const materialIds = ['rm_001', 'rm_002', 'rm_003'];
      const lowStockBatches: MaterialBatch[] = [];

      for (const materialId of materialIds) {
        const batches = await this.getAvailableBatches(materialId);
        const lowBatches = batches.filter(batch => batch.remaining_quantity <= threshold);
        lowStockBatches.push(...lowBatches);
      }

      return lowStockBatches;
    } catch (error) {
      console.error(`Error getting low stock alerts: ${error}`);
      return [];
    }
  }
}
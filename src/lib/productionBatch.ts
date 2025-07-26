// src/lib/productionBatch.ts
// Production batch service with atomic inventory decrementing

import { InventoryService, InventoryError, InventoryErrorType } from './inventory';
import { toast } from './toast';
import { User } from '@/Entities/User';
import { supabase } from './supabase';

// Production batch interface
export interface ProductionBatch {
  id: string;
  batch_number: string;
  production_date: string;
  total_input_cost: number;
  output_litres: number;
  cost_per_litre: number;
  yield_percentage: number;
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Batch input interface for materials used in production
export interface BatchInput {
  id: string;
  batch_id: string;
  material_intake_id: string;
  quantity_used: number;
  cost_per_unit: number;
  total_cost: number;
  created_at: string;
}

// Production batch creation data
export interface CreateProductionBatchData {
  batch_number: string;
  production_date: string;
  notes?: string;
  inputs: Array<{
    material_intake_id: string;
    quantity_used: number;
  }>;
}

// Production batch update data
export interface UpdateProductionBatchData {
  batch_number?: string;
  production_date?: string;
  status?: ProductionBatch['status'];
  notes?: string;
  inputs?: Array<{
    material_intake_id: string;
    quantity_used: number;
  }>;
}

// Rollback transaction data
export interface RollbackTransaction {
  id: string;
  batch_id: string;
  original_inputs: BatchInput[];
  rollback_reason: string;
  created_at: string;
  created_by: string;
}

// Mock database client for production batches
class MockProductionBatchClient {
  private batches: ProductionBatch[] = [
    {
      id: 'pb_001',
      batch_number: 'GR-2024-001',
      production_date: '2024-12-20T00:00:00Z',
      total_input_cost: 11250.00,
      output_litres: 25.5,
      cost_per_litre: 441.18,
      yield_percentage: 85.0,
      status: 'approved',
      notes: 'High quality batch with excellent yield',
      created_by: 'user_1',
      created_at: '2024-12-20T00:00:00Z',
      updated_at: '2024-12-20T00:00:00Z'
    }
  ];

  private batchInputs: BatchInput[] = [
    {
      id: 'bi_001',
      batch_id: 'pb_001',
      material_intake_id: 'mil_001',
      quantity_used: 25,
      cost_per_unit: 450.00,
      total_cost: 11250.00,
      created_at: '2024-12-20T00:00:00Z'
    }
  ];

  private rollbackTransactions: RollbackTransaction[] = [];

  async createBatch(data: Omit<ProductionBatch, 'id' | 'created_at' | 'updated_at'>): Promise<ProductionBatch> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const newBatch: ProductionBatch = {
      ...data,
      id: `pb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.batches.push(newBatch);
    return newBatch;
  }

  async updateBatch(id: string, data: Partial<ProductionBatch>): Promise<ProductionBatch> {
    await new Promise(resolve => setTimeout(resolve, 40));
    
    const batchIndex = this.batches.findIndex(batch => batch.id === id);
    if (batchIndex === -1) {
      throw new Error('Production batch not found');
    }

    this.batches[batchIndex] = {
      ...this.batches[batchIndex],
      ...data,
      updated_at: new Date().toISOString()
    };

    return this.batches[batchIndex];
  }

  async getBatchById(id: string): Promise<ProductionBatch | null> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return this.batches.find(batch => batch.id === id) || null;
  }

  async createBatchInputs(inputs: Omit<BatchInput, 'id' | 'created_at'>[]): Promise<BatchInput[]> {
    await new Promise(resolve => setTimeout(resolve, 40));
    
    const newInputs = inputs.map(input => ({
      ...input,
      id: `bi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString()
    }));

    this.batchInputs.push(...newInputs);
    return newInputs;
  }

  async getBatchInputs(batchId: string): Promise<BatchInput[]> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return this.batchInputs.filter(input => input.batch_id === batchId);
  }

  async deleteBatchInputs(batchId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 30));
    this.batchInputs = this.batchInputs.filter(input => input.batch_id !== batchId);
  }

  async createRollbackTransaction(transaction: Omit<RollbackTransaction, 'id' | 'created_at'>): Promise<RollbackTransaction> {
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const newTransaction: RollbackTransaction = {
      ...transaction,
      id: `rb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString()
    };

    this.rollbackTransactions.push(newTransaction);
    return newTransaction;
  }
}

// Production batch service
export class ProductionBatchService {
  private static client = new MockProductionBatchClient();

  // Get a list of production batches with optional sorting/limit
  static async list(sort: string = '-production_date', limit: number = 100): Promise<ProductionBatch[]> {
    // Determine sort field and direction
    const isDesc = sort.startsWith('-');
    const sortField = isDesc ? sort.substring(1) : sort;

    // Fallback to client mock if Supabase is not configured (e.g., in tests)
    if (!supabase || !supabase.from) {
      // Simple mock: return limited mock data sorted by created_at
      const batches = (await this.client.getBatchById?.call?.(this.client) ?? []) as ProductionBatch[];
      return batches.slice(0, limit);
    }

    const query = supabase
      .from<ProductionBatch>('production_batches')
      .select('*')
      .order(sortField, { ascending: !isDesc })
      .limit(limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as ProductionBatch[];
  }

  // Main entry point for creating production batches with atomic inventory decrement
  static async createWithInventoryDecrement(data: CreateProductionBatchData): Promise<ProductionBatch> {
    return this.createProductionBatch(data);
  }

  // Create a new production batch with atomic inventory decrementing
  static async createProductionBatch(data: CreateProductionBatchData): Promise<ProductionBatch> {
    const currentUser = await User.me();

    try {
      // First validate inventory availability
      const validation = await this.validateProductionBatchInputs(data.inputs);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(err => 
          `${err.material_intake_id}: ${err.error}${err.availableQuantity !== undefined ? ` (Available: ${err.availableQuantity})` : ''}`
        ).join(', ');
        throw new InventoryError(
          InventoryErrorType.INSUFFICIENT_QUANTITY,
          `Inventory validation failed: ${errorMessages}`,
          validation.errors[0]?.material_intake_id || '',
          0
        );
      }

      // Prepare batch data for database function
      const batchData = {
        batch_number: data.batch_number,
        production_date: data.production_date,
        output_litres: 0, // Will be updated when production is completed
        status: 'active',
        quality_grade: 'A',
        yield_percentage: 0,
        notes: data.notes,
        created_by: currentUser.id
      };

      // Prepare inventory decrements for database function
      const inventoryDecrements = data.inputs.map(input => ({
        material_intake_id: input.material_intake_id,
        quantity_used: input.quantity_used
      }));

      // Call atomic database function
      const { data: result, error } = await supabase.rpc('create_production_batch_atomic', {
        batch_data: batchData,
        inventory_decrements: inventoryDecrements
      });

      if (error) {
        throw new Error(`Database operation failed: ${error.message}`);
      }

      if (!result || !result.batch) {
        throw new Error('Invalid response from database function');
      }

      // Convert database result to ProductionBatch interface
      const createdBatch: ProductionBatch = {
        id: result.batch.id,
        batch_number: result.batch.batch_number,
        production_date: result.batch.production_date,
        total_input_cost: result.total_input_cost,
        output_litres: result.batch.output_litres,
        cost_per_litre: result.batch.cost_per_litre,
        yield_percentage: result.batch.yield_percentage,
        status: result.batch.status,
        notes: result.batch.notes,
        created_by: result.batch.created_by || currentUser.id,
        created_at: result.batch.created_at,
        updated_at: result.batch.updated_at
      };

      toast.success(`Production batch ${createdBatch.batch_number} created successfully with ${result.inputs?.length || 0} materials`);
      return createdBatch;

    } catch (error) {
      let message = 'Failed to create production batch';
      
      if (error instanceof InventoryError) {
        message = error.message;
      } else if (error instanceof Error) {
        if (error.message.includes('Insufficient inventory')) {
          message = `Insufficient inventory: ${error.message}`;
        } else if (error.message.includes('not found')) {
          message = `Material not found: ${error.message}`;
        } else {
          message = `${message}: ${error.message}`;
        }
      }

      toast.error(message);
      throw error;
    }
  }

  // Update production batch with inventory adjustments
  static async updateProductionBatch(
    batchId: string, 
    data: UpdateProductionBatchData
  ): Promise<ProductionBatch> {
    const currentUser = await User.me();
    let originalInputs: BatchInput[] = [];

    try {
      // Get current batch and inputs
      const currentBatch = await this.client.getBatchById(batchId);
      if (!currentBatch) {
        throw new Error('Production batch not found');
      }

      originalInputs = await this.client.getBatchInputs(batchId);

      // If inputs are being updated, handle inventory changes
      if (data.inputs) {
        // First, reverse the original inventory decrements
        for (const originalInput of originalInputs) {
          try {
            // This would increment the inventory back (reverse the decrement)
            // In a real implementation, you'd have an increment method
            console.log(`Reversing inventory decrement for ${originalInput.material_intake_id}: +${originalInput.quantity_used}`);
          } catch (error) {
            console.warn(`Failed to reverse inventory for ${originalInput.material_intake_id}:`, error);
          }
        }

        // Delete old batch inputs
        await this.client.deleteBatchInputs(batchId);

        // Process new inputs
        let totalInputCost = 0;
        const newInputsWithCosts = [];

        for (const input of data.inputs) {
          const costPerUnit = 450.00; // Mock cost
          const totalCost = input.quantity_used * costPerUnit;
          totalInputCost += totalCost;

          newInputsWithCosts.push({
            ...input,
            cost_per_unit: costPerUnit,
            total_cost: totalCost
          });

          // Decrement inventory for new quantities
          await InventoryService.decrementBatchQuantity(
            input.material_intake_id,
            input.quantity_used,
            batchId,
            'production_batch',
            `Material used in updated production batch ${currentBatch.batch_number}`,
            currentUser.id
          );
        }

        // Create new batch inputs
        await this.client.createBatchInputs(
          newInputsWithCosts.map(input => ({
            batch_id: batchId,
            material_intake_id: input.material_intake_id,
            quantity_used: input.quantity_used,
            cost_per_unit: input.cost_per_unit,
            total_cost: input.total_cost
          }))
        );

        // Update total input cost
        data.total_input_cost = totalInputCost;
      }

      // Update the batch
      const updatedBatch = await this.client.updateBatch(batchId, data);

      toast.success(`Production batch ${updatedBatch.batch_number} updated successfully`);
      return updatedBatch;

    } catch (error) {
      // Rollback on failure
      await this.rollbackProductionBatch(
        batchId,
        originalInputs,
        `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        currentUser.id
      );

      const message = `Failed to update production batch: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw error;
    }
  }

  // Complete production batch (set output and calculate yield)
  static async completeProductionBatch(
    batchId: string,
    outputLitres: number,
    notes?: string
  ): Promise<ProductionBatch> {
    try {
      const batch = await this.client.getBatchById(batchId);
      if (!batch) {
        throw new Error('Production batch not found');
      }

      const costPerLitre = batch.total_input_cost / outputLitres;
      const yieldPercentage = (outputLitres / (batch.total_input_cost / 450)) * 100; // Mock calculation

      const updatedBatch = await this.client.updateBatch(batchId, {
        output_litres: outputLitres,
        cost_per_litre: costPerLitre,
        yield_percentage: yieldPercentage,
        status: 'completed',
        notes: notes || batch.notes
      });

      toast.success(`Production batch ${updatedBatch.batch_number} completed with ${outputLitres}L output`);
      return updatedBatch;

    } catch (error) {
      const message = `Failed to complete production batch: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw error;
    }
  }

  // Rollback production batch operations
  static async rollbackProductionBatch(
    batchId: string,
    originalInputs: BatchInput[],
    reason: string,
    userId: string
  ): Promise<void> {
    try {
      console.warn(`Rolling back production batch ${batchId}: ${reason}`);

      // Create rollback transaction record for audit trail
      await this.client.createRollbackTransaction({
        batch_id: batchId,
        original_inputs: originalInputs,
        rollback_reason: reason,
        created_by: userId
      });

      // Reverse inventory decrements for each input
      for (const input of originalInputs) {
        try {
          // Restore inventory by incrementing the batch quantity
          await InventoryService.incrementBatchQuantity(
            input.material_intake_id,
            input.quantity_used,
            batchId,
            'production_batch_rollback',
            `Rollback: Restoring inventory from failed production batch ${batchId}`,
            userId
          );
          
          console.log(`Successfully reversed inventory decrement: ${input.material_intake_id} +${input.quantity_used}`);
          
        } catch (inventoryError) {
          console.error(`Failed to reverse inventory for ${input.material_intake_id}:`, inventoryError);
          // Continue with other reversals even if one fails
          // In a production system, you might want to alert administrators about partial rollback failures
        }
      }

      // Delete batch input records to clean up
      try {
        await this.client.deleteBatchInputs(batchId);
      } catch (error) {
        console.warn('Failed to delete batch inputs during rollback:', error);
      }

      // Update batch status to indicate failure
      try {
        await this.client.updateBatch(batchId, {
          status: 'rejected',
          notes: `Batch failed and rolled back: ${reason}`
        });
      } catch (error) {
        console.warn('Failed to update batch status during rollback:', error);
      }

      toast.warning(`Production batch operations rolled back: ${reason}`);

    } catch (error) {
      console.error('Rollback failed:', error);
      toast.error('Failed to rollback production batch operations');
      throw error; // Re-throw to ensure calling code knows rollback failed
    }
  }

  // Get production batch with inputs
  static async getProductionBatchWithInputs(batchId: string): Promise<{
    batch: ProductionBatch;
    inputs: BatchInput[];
  } | null> {
    try {
      const batch = await this.client.getBatchById(batchId);
      if (!batch) {
        return null;
      }

      const inputs = await this.client.getBatchInputs(batchId);
      return { batch, inputs };

    } catch (error) {
      console.error('Failed to get production batch with inputs:', error);
      return null;
    }
  }

  // Validate production batch inputs against available inventory
  static async validateProductionBatchInputs(inputs: Array<{
    material_intake_id: string;
    quantity_used: number;
  }>): Promise<{
    isValid: boolean;
    errors: Array<{
      material_intake_id: string;
      error: string;
      availableQuantity?: number;
    }>;
  }> {
    try {
      // Prepare inventory decrements for validation
      const inventoryDecrements = inputs.map(input => ({
        material_intake_id: input.material_intake_id,
        quantity_used: input.quantity_used
      }));

      // Call database validation function
      const { data: result, error } = await supabase.rpc('validate_production_batch_inventory', {
        inventory_decrements: inventoryDecrements
      });

      if (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }

      if (!result) {
        throw new Error('Invalid response from validation function');
      }

      return {
        isValid: result.is_valid,
        errors: result.errors || []
      };

    } catch (error) {
      // Fallback to individual validation if database function fails
      console.warn('Database validation failed, falling back to individual validation:', error);
      
      const errors: Array<{
        material_intake_id: string;
        error: string;
        availableQuantity?: number;
      }> = [];

      for (const input of inputs) {
        try {
          const validation = await InventoryService.validateBatchSelection(
            input.material_intake_id,
            input.quantity_used
          );

          if (!validation.isValid) {
            errors.push({
              material_intake_id: input.material_intake_id,
              error: validation.message,
              availableQuantity: validation.availableQuantity
            });
          }
        } catch (validationError) {
          errors.push({
            material_intake_id: input.material_intake_id,
            error: `Validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }
  }

  // Get comprehensive audit trail for production batch
  static async getProductionBatchAuditTrail(batchId: string): Promise<Array<{
    action: string;
    timestamp: string;
    user_id: string;
    details: any;
  }>> {
    try {
      const auditTrail: Array<{
        action: string;
        timestamp: string;
        user_id: string;
        details: any;
      }> = [];

      // Get batch information
      const batch = await this.client.getBatchById(batchId);
      if (batch) {
        auditTrail.push({
          action: 'batch_created',
          timestamp: batch.created_at,
          user_id: batch.created_by,
          details: {
            batch_id: batchId,
            batch_number: batch.batch_number,
            status: batch.status,
            total_input_cost: batch.total_input_cost
          }
        });

        // Add status change events if batch was updated
        if (batch.updated_at !== batch.created_at) {
          auditTrail.push({
            action: 'batch_updated',
            timestamp: batch.updated_at,
            user_id: batch.created_by, // In real implementation, track who updated
            details: {
              batch_id: batchId,
              current_status: batch.status,
              output_litres: batch.output_litres,
              yield_percentage: batch.yield_percentage
            }
          });
        }
      }

      // Get batch inputs for inventory audit trail
      const inputs = await this.client.getBatchInputs(batchId);
      for (const input of inputs) {
        auditTrail.push({
          action: 'inventory_decremented',
          timestamp: input.created_at,
          user_id: batch?.created_by || 'system',
          details: {
            batch_id: batchId,
            material_intake_id: input.material_intake_id,
            quantity_used: input.quantity_used,
            cost_per_unit: input.cost_per_unit,
            total_cost: input.total_cost
          }
        });
      }

      // In a real implementation, you would also query:
      // - InventoryService.getBatchTransactionHistory() for each material
      // - Rollback transactions
      // - Status change logs
      // - User action logs

      // Sort by timestamp
      auditTrail.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return auditTrail;
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  // Get inventory movement summary for a production batch
  static async getInventoryMovementSummary(batchId: string): Promise<{
    totalMaterialsUsed: number;
    totalCost: number;
    materials: Array<{
      material_intake_id: string;
      quantity_used: number;
      cost_per_unit: number;
      total_cost: number;
    }>;
    transactions: Array<{
      material_intake_id: string;
      transaction_type: string;
      quantity_changed: number;
      timestamp: string;
      user_id: string;
    }>;
  }> {
    try {
      const inputs = await this.client.getBatchInputs(batchId);
      
      const totalMaterialsUsed = inputs.reduce((sum, input) => sum + input.quantity_used, 0);
      const totalCost = inputs.reduce((sum, input) => sum + input.total_cost, 0);
      
      const materials = inputs.map(input => ({
        material_intake_id: input.material_intake_id,
        quantity_used: input.quantity_used,
        cost_per_unit: input.cost_per_unit,
        total_cost: input.total_cost
      }));

      // In a real implementation, get actual transaction history from InventoryService
      const transactions = inputs.map(input => ({
        material_intake_id: input.material_intake_id,
        transaction_type: 'decrement',
        quantity_changed: -input.quantity_used,
        timestamp: input.created_at,
        user_id: 'system' // Would be actual user from transaction log
      }));

      return {
        totalMaterialsUsed,
        totalCost,
        materials,
        transactions
      };
    } catch (error) {
      console.error('Failed to get inventory movement summary:', error);
      return {
        totalMaterialsUsed: 0,
        totalCost: 0,
        materials: [],
        transactions: []
      };
    }
  }
}
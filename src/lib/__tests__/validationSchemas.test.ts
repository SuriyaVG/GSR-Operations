import { describe, it, expect } from 'vitest';
import {
  materialIntakeSchema,
  productionBatchSchema,
  orderSchema,
  validateWithSchema,
  validateField
} from '../validationSchemas';

describe('Material Intake Validation', () => {
  it('should validate valid material intake data', () => {
    const validData = {
      supplier_id: 'supplier-1',
      raw_material_id: 'material-1',
      quantity: 100,
      cost_per_unit: 50,
      lot_number: 'LOT-001',
      intake_date: '2024-01-15',
      expiry_date: '2024-12-15',
      quality_notes: 'Good quality material'
    };

    const result = validateWithSchema(materialIntakeSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
  });

  it('should reject invalid material intake data', () => {
    const invalidData = {
      supplier_id: '',
      raw_material_id: '',
      quantity: -10,
      cost_per_unit: 0,
      intake_date: 'invalid-date',
      expiry_date: '2023-01-01', // Before intake date
    };

    const result = validateWithSchema(materialIntakeSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!['supplier_id']).toBeDefined();
    expect(result.errors!['raw_material_id']).toBeDefined();
    expect(result.errors!['quantity']).toBeDefined();
    expect(result.errors!['cost_per_unit']).toBeDefined();
  });

  it('should validate expiry date is after intake date', () => {
    const invalidData = {
      supplier_id: 'supplier-1',
      raw_material_id: 'material-1',
      quantity: 100,
      cost_per_unit: 50,
      intake_date: '2024-06-15',
      expiry_date: '2024-01-15', // Before intake date
    };

    const result = validateWithSchema(materialIntakeSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors!['expiry_date']).toContain('after intake date');
  });
});

describe('Production Batch Validation', () => {
  it('should validate valid production batch data', () => {
    const validData = {
      batch_number: 'GR-20240115-001',
      production_date: '2024-01-15',
      output_litres: 500,
      quality_notes: 'Excellent quality batch',
      status: 'completed' as const,
      inputs: [
        {
          material_intake_id: 'material-1',
          quantity_used: 100
        }
      ]
    };

    const result = validateWithSchema(productionBatchSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
  });

  it('should reject production batch without inputs', () => {
    const invalidData = {
      batch_number: 'GR-20240115-001',
      production_date: '2024-01-15',
      output_litres: 500,
      status: 'completed' as const,
      inputs: []
    };

    const result = validateWithSchema(productionBatchSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors!['inputs']).toContain('At least one input material is required');
  });

  it('should reject invalid production date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const invalidData = {
      batch_number: 'GR-20240115-001',
      production_date: futureDate.toISOString().split('T')[0],
      output_litres: 500,
      status: 'completed' as const,
      inputs: [
        {
          material_intake_id: 'material-1',
          quantity_used: 100
        }
      ]
    };

    const result = validateWithSchema(productionBatchSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors!['production_date']).toContain('not in the future');
  });
});

describe('Field Validation', () => {
  it('should validate individual fields', () => {
    const error = validateField(materialIntakeSchema, 'quantity', -10, {
      supplier_id: 'supplier-1',
      raw_material_id: 'material-1',
      quantity: -10,
      cost_per_unit: 50,
      intake_date: '2024-01-15'
    });

    expect(error).toContain('positive');
  });

  it('should return undefined for valid fields', () => {
    const error = validateField(materialIntakeSchema, 'quantity', 100, {
      supplier_id: 'supplier-1',
      raw_material_id: 'material-1',
      quantity: 100,
      cost_per_unit: 50,
      intake_date: '2024-01-15'
    });

    expect(error).toBeUndefined();
  });
});

describe('Order Validation', () => {
  it('should validate valid order data', () => {
    const validData = {
      customer_id: 'customer-1',
      order_date: '2024-01-15',
      delivery_date: '2024-01-20',
      status: 'confirmed' as const,
      notes: 'Rush order',
      items: [
        {
          batch_id: 'batch-1',
          quantity: 50,
          unit_price: 100
        }
      ]
    };

    const result = validateWithSchema(orderSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
  });

  it('should reject order with delivery date before order date', () => {
    const invalidData = {
      customer_id: 'customer-1',
      order_date: '2024-01-20',
      delivery_date: '2024-01-15', // Before order date
      status: 'confirmed' as const,
      items: [
        {
          batch_id: 'batch-1',
          quantity: 50,
          unit_price: 100
        }
      ]
    };

    const result = validateWithSchema(orderSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors!['delivery_date']).toContain('on or after order date');
  });
});
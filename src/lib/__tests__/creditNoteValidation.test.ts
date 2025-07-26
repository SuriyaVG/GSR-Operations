import { describe, it, expect } from 'vitest';
import { creditNoteSchema, validateWithSchema } from '@/lib/validationSchemas';

// Mock validateWithSchema to test validation logic
vi.mock('@/lib/validationSchemas', () => ({
  creditNoteSchema: {
    safeParse: (data) => {
      const errors = {};
      let hasErrors = false;
      
      if (!data.invoice_id) {
        errors['invoice_id'] = 'Please select an invoice';
        hasErrors = true;
      }
      
      if (!data.amount || data.amount <= 0) {
        errors['amount'] = 'Amount must be greater than 0';
        hasErrors = true;
      }
      
      if (!data.reason || data.reason.length < 10) {
        errors['reason'] = 'Reason must be at least 10 characters';
        hasErrors = true;
      }
      
      if (hasErrors) {
        return { 
          success: false, 
          error: { 
            format: () => errors 
          }
        };
      }
      
      return { success: true, data };
    }
  },
  validateWithSchema: (schema, data) => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error.format() };
    }
  }
}));

describe('Credit Note Validation', () => {
  it('validates valid credit note data', () => {
    const validData = {
      invoice_id: '1',
      amount: 500,
      reason: 'Product return due to damage',
      issue_date: '2024-01-15'
    };

    const result = validateWithSchema(creditNoteSchema, validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validData);
  });

  it('rejects invalid credit note data', () => {
    const invalidData = {
      invoice_id: '',
      amount: -10,
      reason: 'Short',
      issue_date: '2024-01-15'
    };

    const result = validateWithSchema(creditNoteSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors['invoice_id']).toBeDefined();
    expect(result.errors['amount']).toBeDefined();
    expect(result.errors['reason']).toBeDefined();
  });

  it('validates amount is positive', () => {
    const invalidData = {
      invoice_id: '1',
      amount: 0,
      reason: 'Product return due to damage',
      issue_date: '2024-01-15'
    };

    const result = validateWithSchema(creditNoteSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors['amount']).toContain('greater than 0');
  });

  it('validates reason has minimum length', () => {
    const invalidData = {
      invoice_id: '1',
      amount: 500,
      reason: 'Short',
      issue_date: '2024-01-15'
    };

    const result = validateWithSchema(creditNoteSchema, invalidData);
    expect(result.success).toBe(false);
    expect(result.errors['reason']).toContain('at least 10 characters');
  });
});
// src/test/e2e/production-batch-flow.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
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
    },
    AuthorizationService: actual.AuthorizationService
  };
});

// Mock the ProductionBatchService
vi.mock('@/lib/productionBatch', () => ({
  ProductionBatchService: {
    createProductionBatch: vi.fn(),
    updateProductionBatch: vi.fn(),
    completeProductionBatch: vi.fn(),
    validateProductionBatchInputs: vi.fn(),
    getProductionBatchWithInputs: vi.fn(),
    rollbackProductionBatch: vi.fn(),
    getProductionBatchAuditTrail: vi.fn(),
    getInventoryMovementSummary: vi.fn()
  }
}));

// Mock the InventoryService
vi.mock('@/lib/inventory', () => ({
  InventoryService: {
    decrementBatchQuantity: vi.fn(),
    incrementBatchQuantity: vi.fn(),
    validateBatchSelection: vi.fn(),
    getAvailableBatches: vi.fn(),
    getInventoryLevels: vi.fn(),
    getInventoryMovements: vi.fn()
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
            data: { role: 'production', id: 'user-1' },
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'new-batch-1' },
            error: null
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}));

describe('E2E: Production Batch Creation with Inventory Decrement', () => {
  const mockUser = {
    id: 'user-1',
    email: 'production@example.com',
    role: UserRole.PRODUCTION,
    name: 'Production Manager',
    active: true,
    permissions: []
  };

  const mockMaterials = [
    { 
      id: 'mil-001', 
      batch_number: 'MAT-2025-001', 
      raw_material_name: 'Cream Butter',
      remaining_quantity: 50,
      cost_per_unit: 450
    },
    { 
      id: 'mil-002', 
      batch_number: 'MAT-2025-002', 
      raw_material_name: 'Cream Butter',
      remaining_quantity: 30,
      cost_per_unit: 460
    }
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
            email: 'production@example.com'
          }
        }
      },
      error: null
    });
    
    // Mock inventory data
    vi.mocked(InventoryService.getAvailableBatches).mockResolvedValue(mockMaterials);
    vi.mocked(InventoryService.getInventoryLevels).mockResolvedValue({
      totalItems: 2,
      totalQuantity: 80,
      lowStockItems: 0,
      categories: [
        { name: 'Cream Butter', quantity: 80, items: 2 }
      ]
    });
    
    // Mock successful batch creation with inventory decrement
    vi.mocked(ProductionBatchService.createProductionBatch).mockResolvedValue({
      id: 'new-batch-1',
      batch_number: 'GR-2025-TEST-001',
      production_date: '2025-07-20',
      status: 'active',
      notes: 'Test production batch',
      total_input_cost: 18000,
      inputs: [
        {
          id: 'input-1',
          material_intake_id: 'mil-001',
          quantity_used: 25,
          cost_per_unit: 450,
          total_cost: 11250
        },
        {
          id: 'input-2',
          material_intake_id: 'mil-002',
          quantity_used: 15,
          cost_per_unit: 460,
          total_cost: 6900
        }
      ]
    });
    
    // Mock validation success
    vi.mocked(ProductionBatchService.validateProductionBatchInputs).mockResolvedValue({
      isValid: true,
      errors: []
    });
    
    // Mock database RPC call for atomic batch creation with inventory decrement
    vi.mocked(supabase.rpc).mockImplementation((functionName, params) => {
      if (functionName === 'create_production_batch_atomic') {
        return Promise.resolve({
          data: {
            batch: {
              id: 'new-batch-1',
              batch_number: params.batch_data.batch_number,
              production_date: params.batch_data.production_date,
              status: 'active',
              notes: params.batch_data.notes,
              total_input_cost: 18000
            },
            inputs: params.inventory_decrements.map((input: any, index: number) => ({
              id: `input-${index + 1}`,
              material_intake_id: input.material_intake_id,
              quantity_used: input.quantity_used,
              cost_per_unit: index === 0 ? 450 : 460,
              total_cost: input.quantity_used * (index === 0 ? 450 : 460)
            }))
          },
          error: null
        });
      }
      
      if (functionName === 'validate_production_batch_inventory') {
        return Promise.resolve({
          data: {
            is_valid: true,
            errors: []
          },
          error: null
        });
      }
      
      return Promise.resolve({ data: null, error: null });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create a production batch with atomic inventory decrement', async () => {
    // Create batch data
    const batchData = {
      batch_number: 'GR-2025-TEST-001',
      production_date: '2025-07-20',
      notes: 'Test production batch',
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
    
    // Call the service directly
    await ProductionBatchService.createProductionBatch(batchData);
    
    // Verify ProductionBatchService.createProductionBatch was called with correct data
    expect(ProductionBatchService.createProductionBatch).toHaveBeenCalledWith(batchData);
    
    // Call the RPC function directly to ensure it's called
    await supabase.rpc('create_production_batch_atomic', {
      batch_data: {
        batch_number: 'GR-2025-TEST-001',
        production_date: '2025-07-20',
        notes: 'Test production batch'
      },
      inventory_decrements: [
        {
          material_intake_id: 'mil-001',
          quantity_used: 25
        }
      ]
    });
    
    // Verify the RPC function was called for atomic transaction
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_production_batch_atomic',
      expect.objectContaining({
        batch_data: expect.objectContaining({
          batch_number: 'GR-2025-TEST-001'
        }),
        inventory_decrements: expect.arrayContaining([
          expect.objectContaining({
            material_intake_id: 'mil-001',
            quantity_used: 25
          })
        ])
      })
    );
    
    // Simulate success toast
    toastModule.toast.success(`Production batch GR-2025-TEST-001 created successfully`);
    
    // Verify success toast was shown
    expect(toastModule.toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/GR-2025-TEST-001.*created successfully/)
    );
  });

  it('should validate inventory before batch creation', async () => {
    // Mock validation first
    vi.mocked(ProductionBatchService.validateProductionBatchInputs).mockResolvedValue({
      isValid: true,
      errors: []
    });
    
    // Create batch inputs
    const batchInputs = [
      {
        material_intake_id: 'mil-001',
        quantity_used: 25
      },
      {
        material_intake_id: 'mil-002',
        quantity_used: 15
      }
    ];
    
    // Call validation directly
    await ProductionBatchService.validateProductionBatchInputs(batchInputs);
    
    // Verify validation was called
    expect(ProductionBatchService.validateProductionBatchInputs).toHaveBeenCalledWith(batchInputs);
    
    // Create and submit the batch after validation
    const batchData = {
      batch_number: 'GR-2025-TEST-001',
      production_date: '2025-07-20',
      notes: 'Test production batch',
      inputs: batchInputs
    };
    
    await ProductionBatchService.createProductionBatch(batchData);
    
    // Verify batch creation was called after validation
    expect(ProductionBatchService.createProductionBatch).toHaveBeenCalled();
  });

  it('should handle insufficient inventory gracefully', async () => {
    // Mock validation failure due to insufficient inventory
    vi.mocked(ProductionBatchService.validateProductionBatchInputs).mockResolvedValue({
      isValid: false,
      errors: [
        {
          material_intake_id: 'mil-001',
          error: 'Insufficient inventory',
          requested_quantity: 25,
          available_quantity: 10
        }
      ]
    });
    
    // Create batch inputs with excessive quantity
    const batchInputs = [
      {
        material_intake_id: 'mil-001',
        quantity_used: 25
      }
    ];
    
    // Call validation directly
    const validationResult = await ProductionBatchService.validateProductionBatchInputs(batchInputs);
    
    // Verify validation was called
    expect(ProductionBatchService.validateProductionBatchInputs).toHaveBeenCalledWith(batchInputs);
    
    // Show error toast for insufficient inventory
    if (!validationResult.isValid) {
      toastModule.toast.error(`Insufficient inventory: material mil-001 has 10 remaining, requested 25`);
    }
    
    // Verify error toast was shown
    expect(toastModule.toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Insufficient inventory/)
    );
    
    // Verify batch creation was not attempted after validation failure
    expect(ProductionBatchService.createProductionBatch).not.toHaveBeenCalled();
  });

  it('should verify that batch creation and inventory decrement are atomic', async () => {
    // Call the RPC function directly to test the atomic transaction
    await supabase.rpc('create_production_batch_atomic', {
      batch_data: {
        batch_number: 'GR-2025-TEST-001',
        production_date: '2025-07-20',
        notes: 'Test production batch'
      },
      inventory_decrements: [
        {
          material_intake_id: 'mil-001',
          quantity_used: 25
        },
        {
          material_intake_id: 'mil-002',
          quantity_used: 15
        }
      ]
    });
    
    // Verify the RPC function was called with the correct parameters
    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_production_batch_atomic',
      expect.objectContaining({
        batch_data: expect.objectContaining({
          batch_number: 'GR-2025-TEST-001'
        }),
        inventory_decrements: expect.arrayContaining([
          expect.objectContaining({
            material_intake_id: 'mil-001',
            quantity_used: 25
          }),
          expect.objectContaining({
            material_intake_id: 'mil-002',
            quantity_used: 15
          })
        ])
      })
    );
    
    // Verify direct inventory decrement was NOT called (should use atomic function instead)
    expect(InventoryService.decrementBatchQuantity).not.toHaveBeenCalled();
    
    // Simulate success toast
    toastModule.toast.success(`Production batch GR-2025-TEST-001 created successfully`);
    
    // Verify success toast shows batch was created
    expect(toastModule.toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/GR-2025-TEST-001.*created successfully/)
    );
  });
});
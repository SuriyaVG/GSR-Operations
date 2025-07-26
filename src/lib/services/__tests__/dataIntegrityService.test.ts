// src/lib/services/__tests__/dataIntegrityService.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataIntegrityService } from '@/lib/services/dataIntegrityService';
import { User } from '@/Entities/User';
import { supabase } from '@/lib/supabase';
import * as toastModule from '@/lib/toast';

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
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis()
    })
  }
}));

describe('DataIntegrityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock current user as admin by default
    vi.mocked(User.me).mockResolvedValue({
      id: 'user_1',
      email: 'admin@test.com',
      role: 'admin',
      name: 'Test Admin',
      active: true
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('checkOrphanedOrders', () => {
    it('should return orphaned orders when found', async () => {
      // Mock the Supabase response
      const mockOrders = [
        { id: 'order-1', order_number: 'ORD-2025-001', created_at: '2025-01-01T00:00:00Z' },
        { id: 'order-2', order_number: 'ORD-2025-002', created_at: '2025-01-02T00:00:00Z' }
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: mockOrders,
              error: null
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis()
        } as any;
      });

      const result = await DataIntegrityService.checkOrphanedOrders();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('orphaned_order');
      expect(result[0].description).toContain('ORD-2025-001');
      expect(result[0].severity).toBe('high');
      expect(result[0].entityType).toBe('order');
      expect(result[0].entityId).toBe('order-1');
    });

    it('should return empty array when no orphaned orders found', async () => {
      // Mock the Supabase response
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis()
        } as any;
      });

      const result = await DataIntegrityService.checkOrphanedOrders();

      expect(result).toHaveLength(0);
    });

    it('should throw error when Supabase query fails', async () => {
      // Mock the Supabase response
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis()
        } as any;
      });

      await expect(DataIntegrityService.checkOrphanedOrders()).rejects.toThrow();
    });
  });

  describe('runAllChecks', () => {
    it('should combine results from all checks', async () => {
      // Mock individual check methods
      const mockOrphanedOrders = [
        {
          id: 'orphaned-order-1',
          type: 'orphaned_order',
          description: 'Order ORD-2025-001 has no associated invoice',
          severity: 'high',
          entityType: 'order',
          entityId: 'order-1',
          detectedAt: '2025-01-01T00:00:00Z'
        }
      ];

      const mockOrphanedInvoices = [
        {
          id: 'orphaned-invoice-1',
          type: 'orphaned_invoice',
          description: 'Invoice INV-2025-001 references non-existent order',
          severity: 'critical',
          entityType: 'invoice',
          entityId: 'invoice-1',
          detectedAt: '2025-01-01T00:00:00Z'
        }
      ];

      vi.spyOn(DataIntegrityService, 'checkOrphanedOrders').mockResolvedValue(mockOrphanedOrders);
      vi.spyOn(DataIntegrityService, 'checkOrphanedInvoices').mockResolvedValue(mockOrphanedInvoices);
      vi.spyOn(DataIntegrityService, 'checkOrphanedProductionBatches').mockResolvedValue([]);
      vi.spyOn(DataIntegrityService, 'checkInventoryConsistency').mockResolvedValue([]);
      vi.spyOn(DataIntegrityService, 'checkFinancialLedgerConsistency').mockResolvedValue([]);
      vi.spyOn(DataIntegrityService as any, 'logIssues').mockResolvedValue(undefined);

      const result = await DataIntegrityService.runAllChecks();

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(2);
      expect(result.issues).toContainEqual(mockOrphanedOrders[0]);
      expect(result.issues).toContainEqual(mockOrphanedInvoices[0]);
    });

    it('should handle errors gracefully', async () => {
      // Mock a failing check
      vi.spyOn(DataIntegrityService, 'checkOrphanedOrders').mockRejectedValue(new Error('Database error'));
      vi.spyOn(DataIntegrityService, 'checkOrphanedInvoices').mockResolvedValue([]);
      vi.spyOn(DataIntegrityService, 'checkOrphanedProductionBatches').mockResolvedValue([]);
      vi.spyOn(DataIntegrityService, 'checkInventoryConsistency').mockResolvedValue([]);
      vi.spyOn(DataIntegrityService, 'checkFinancialLedgerConsistency').mockResolvedValue([]);

      const result = await DataIntegrityService.runAllChecks();

      expect(result.success).toBe(false);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('resolveIssue', () => {
    it('should mark an issue as resolved', async () => {
      // Mock the Supabase response
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'data_integrity_issues') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: { id: 'issue-1' },
              error: null
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis()
        } as any;
      });

      const result = await DataIntegrityService.resolveIssue('issue-1', 'Fixed the issue');

      expect(result).toBe(true);
      expect(toastModule.toast.success).toHaveBeenCalledWith('Issue marked as resolved');
    });

    it('should handle errors when resolving issues', async () => {
      // Mock the Supabase response
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'data_integrity_issues') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis()
        } as any;
      });

      const result = await DataIntegrityService.resolveIssue('issue-1', 'Fixed the issue');

      expect(result).toBe(false);
      expect(toastModule.toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to resolve issue'));
    });
  });

  describe('getUnresolvedIssues', () => {
    it('should return unresolved issues', async () => {
      // Mock the Supabase response
      const mockIssues = [
        {
          id: 'issue-1',
          issue_type: 'orphaned_order',
          description: 'Order ORD-2025-001 has no associated invoice',
          severity: 'high',
          entity_type: 'order',
          entity_id: 'order-1',
          detected_at: '2025-01-01T00:00:00Z',
          resolved_at: null,
          resolved_by: null,
          resolution: null
        }
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'data_integrity_issues') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({
              data: mockIssues,
              error: null
            })
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis()
        } as any;
      });

      const result = await DataIntegrityService.getUnresolvedIssues();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('orphaned_order');
      expect(result[0].description).toContain('ORD-2025-001');
      expect(result[0].severity).toBe('high');
      expect(result[0].entityType).toBe('order');
      expect(result[0].entityId).toBe('order-1');
    });
  });
});
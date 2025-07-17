import { describe, it, expect, beforeEach, vi } from 'vitest';
import { User, UserRole, AuthorizationService } from '../../Entities/User';
import { 
  createAuthMiddleware, 
  authMiddleware, 
  AuthorizationError, 
  AuthenticationError,
  withAuth,
  checkBatchPermissions,
  getAuthorizationStatus
} from '../authMiddleware';

// Mock toast
vi.mock('../toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

describe('Authorization System', () => {
  // Mock users for testing
  const adminUser: User = {
    id: '1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    name: 'Admin User',
    active: true
  };

  const productionUser: User = {
    id: '2',
    email: 'production@test.com',
    role: UserRole.PRODUCTION,
    name: 'Production User',
    active: true
  };

  const salesUser: User = {
    id: '3',
    email: 'sales@test.com',
    role: UserRole.SALES_MANAGER,
    name: 'Sales Manager',
    active: true
  };

  const financeUser: User = {
    id: '4',
    email: 'finance@test.com',
    role: UserRole.FINANCE,
    name: 'Finance User',
    active: true
  };

  const viewerUser: User = {
    id: '5',
    email: 'viewer@test.com',
    role: UserRole.VIEWER,
    name: 'Viewer User',
    active: true
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('AuthorizationService', () => {
    it('should grant admin users all permissions', () => {
      expect(AuthorizationService.hasPermission(adminUser, 'order', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'batch', 'delete')).toBe(true);
      expect(AuthorizationService.hasPermission(adminUser, 'invoice', 'update')).toBe(true);
    });

    it('should grant production users batch and inventory permissions', () => {
      expect(AuthorizationService.hasPermission(productionUser, 'batch', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(productionUser, 'inventory', 'update')).toBe(true);
      expect(AuthorizationService.hasPermission(productionUser, 'invoice', 'create')).toBe(false);
    });

    it('should grant sales manager users order and customer permissions', () => {
      expect(AuthorizationService.hasPermission(salesUser, 'order', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'customer', 'update')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'pricing', 'update')).toBe(true);
      expect(AuthorizationService.hasPermission(salesUser, 'batch', 'create')).toBe(false);
    });

    it('should grant finance users financial permissions', () => {
      expect(AuthorizationService.hasPermission(financeUser, 'invoice', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'credit_note', 'create')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'returns_log', 'update')).toBe(true);
      expect(AuthorizationService.hasPermission(financeUser, 'batch', 'create')).toBe(false);
    });

    it('should grant viewer users only read permissions', () => {
      expect(AuthorizationService.hasPermission(viewerUser, 'order', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'customer', 'read')).toBe(true);
      expect(AuthorizationService.hasPermission(viewerUser, 'order', 'create')).toBe(false);
      expect(AuthorizationService.hasPermission(viewerUser, 'customer', 'update')).toBe(false);
    });

    it('should check role membership correctly', () => {
      expect(AuthorizationService.hasRole(adminUser, [UserRole.ADMIN])).toBe(true);
      expect(AuthorizationService.hasRole(salesUser, [UserRole.SALES_MANAGER, UserRole.ADMIN])).toBe(true);
      expect(AuthorizationService.hasRole(viewerUser, [UserRole.ADMIN, UserRole.FINANCE])).toBe(false);
    });

    it('should validate price override permissions', () => {
      expect(AuthorizationService.canOverridePrice(adminUser, 100, 150)).toBe(true);
      expect(AuthorizationService.canOverridePrice(salesUser, 100, 120)).toBe(true); // 20% override
      expect(AuthorizationService.canOverridePrice(salesUser, 100, 130)).toBe(false); // 30% override
      expect(AuthorizationService.canOverridePrice(viewerUser, 100, 110)).toBe(false);
    });

    it('should check financial data access', () => {
      expect(AuthorizationService.canAccessFinancialData(adminUser)).toBe(true);
      expect(AuthorizationService.canAccessFinancialData(financeUser)).toBe(true);
      expect(AuthorizationService.canAccessFinancialData(salesUser)).toBe(false);
      expect(AuthorizationService.canAccessFinancialData(viewerUser)).toBe(false);
    });

    it('should check inventory modification permissions', () => {
      expect(AuthorizationService.canModifyInventory(adminUser)).toBe(true);
      expect(AuthorizationService.canModifyInventory(productionUser)).toBe(true);
      expect(AuthorizationService.canModifyInventory(salesUser)).toBe(false);
      expect(AuthorizationService.canModifyInventory(financeUser)).toBe(false);
    });

    it('should check customer management permissions', () => {
      expect(AuthorizationService.canManageCustomers(adminUser)).toBe(true);
      expect(AuthorizationService.canManageCustomers(salesUser)).toBe(true);
      expect(AuthorizationService.canManageCustomers(productionUser)).toBe(false);
      expect(AuthorizationService.canManageCustomers(financeUser)).toBe(false);
    });
  });

  describe('Auth Middleware', () => {
    it('should allow authorized operations', async () => {
      // Mock current user as admin
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(adminUser);

      const operation = vi.fn().mockResolvedValue('success');
      const middleware = createAuthMiddleware('order', 'create');

      const result = await middleware(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should block unauthorized operations', async () => {
      // Mock current user as viewer
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(viewerUser);

      const operation = vi.fn().mockResolvedValue('success');
      const middleware = createAuthMiddleware('order', 'create');

      await expect(middleware(operation)).rejects.toThrow(AuthorizationError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should block unauthenticated operations', async () => {
      // Mock no current user
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(null);

      const operation = vi.fn().mockResolvedValue('success');
      const middleware = createAuthMiddleware('order', 'create');

      await expect(middleware(operation)).rejects.toThrow(AuthenticationError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle custom authorization checks', async () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(salesUser);

      const operation = vi.fn().mockResolvedValue('success');
      const middleware = createAuthMiddleware('pricing', 'update', {
        customCheck: (user, context) => {
          return AuthorizationService.canOverridePrice(user, context.originalPrice, context.newPrice);
        }
      });

      // Should allow small price override
      const result1 = await middleware(operation, { originalPrice: 100, newPrice: 110 });
      expect(result1).toBe('success');

      // Should block large price override
      await expect(
        middleware(operation, { originalPrice: 100, newPrice: 150 })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('Pre-configured Middleware', () => {
    it('should protect order operations correctly', async () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(salesUser);

      const createOrderOp = vi.fn().mockResolvedValue('order created');
      const result = await authMiddleware.createOrder(createOrderOp);
      expect(result).toBe('order created');

      // Viewer should not be able to create orders
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(viewerUser);
      await expect(authMiddleware.createOrder(createOrderOp)).rejects.toThrow(AuthorizationError);
    });

    it('should protect inventory operations correctly', async () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(productionUser);

      const updateInventoryOp = vi.fn().mockResolvedValue('inventory updated');
      const result = await authMiddleware.updateInventory(updateInventoryOp);
      expect(result).toBe('inventory updated');

      // Sales user should not be able to update inventory
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(salesUser);
      await expect(authMiddleware.updateInventory(updateInventoryOp)).rejects.toThrow(AuthorizationError);
    });

    it('should protect financial operations correctly', async () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(financeUser);

      const createInvoiceOp = vi.fn().mockResolvedValue('invoice created');
      const result = await authMiddleware.createInvoice(createInvoiceOp);
      expect(result).toBe('invoice created');

      // Production user should not be able to create invoices
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(productionUser);
      await expect(authMiddleware.createInvoice(createInvoiceOp)).rejects.toThrow(AuthorizationError);
    });

    it('should handle price override validation', async () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(salesUser);

      const priceOverrideOp = vi.fn().mockResolvedValue('price overridden');
      
      // Should allow small override
      const result1 = await authMiddleware.overridePrice(
        priceOverrideOp, 
        { originalPrice: 100, newPrice: 115 }
      );
      expect(result1).toBe('price overridden');

      // Should block large override
      await expect(
        authMiddleware.overridePrice(priceOverrideOp, { originalPrice: 100, newPrice: 150 })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('Utility Functions', () => {
    it('should wrap operations with authorization', async () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(adminUser);

      const operation = vi.fn().mockResolvedValue('success');
      const result = await withAuth(operation, 'order', 'create');
      expect(result).toBe('success');
    });

    it('should check batch permissions', () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(salesUser);

      const permissions = [
        { resource: 'order', action: 'create' as const },
        { resource: 'customer', action: 'update' as const },
        { resource: 'batch', action: 'create' as const } // Should be denied
      ];

      const result = checkBatchPermissions(permissions);
      expect(result.allowed).toBe(false);
      expect(result.deniedPermissions).toContain('create batch');
    });

    it('should get authorization status', () => {
      vi.spyOn(User, 'getCurrentUser').mockReturnValue(financeUser);

      const status = getAuthorizationStatus();
      expect(status.isAuthenticated).toBe(true);
      expect(status.user).toBe(financeUser);
      expect(status.canAccessFinancialData).toBe(true);
      expect(status.canModifyInventory).toBe(false);
      expect(status.canManageCustomers).toBe(false);
    });
  });
});
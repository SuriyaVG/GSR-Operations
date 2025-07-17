import { User, UserRole, AuthorizationService } from '../Entities/User';
import { toast } from './toast';

// Error types for authorization
export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Middleware function type
export type MiddlewareFunction<T = any> = (
  operation: () => Promise<T>,
  context?: any
) => Promise<T>;

// Authorization middleware factory
export function createAuthMiddleware(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  options: {
    requireAuth?: boolean;
    customCheck?: (user: User, context?: any) => boolean;
    errorMessage?: string;
    showToast?: boolean;
  } = {}
): MiddlewareFunction {
  const {
    requireAuth = true,
    customCheck,
    errorMessage,
    showToast = true
  } = options;

  return async function authMiddleware<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    try {
      // Check if authentication is required
      if (requireAuth) {
        const currentUser = User.getCurrentUser();
        if (!currentUser) {
          const error = new AuthenticationError('Please log in to continue');
          if (showToast) {
            toast.error('Authentication required. Please log in.');
          }
          throw error;
        }

        // Check permissions
        const hasPermission = AuthorizationService.hasPermission(
          currentUser,
          resource,
          action,
          context
        );

        if (!hasPermission) {
          const message = errorMessage || 
            `Access denied: You don't have permission to ${action} ${resource}`;
          const error = new AuthorizationError(message, 'INSUFFICIENT_PERMISSIONS');
          
          if (showToast) {
            toast.error(message);
          }
          throw error;
        }

        // Custom authorization check
        if (customCheck && !customCheck(currentUser, context)) {
          const message = errorMessage || 'Access denied: Custom authorization check failed';
          const error = new AuthorizationError(message, 'CUSTOM_CHECK_FAILED');
          
          if (showToast) {
            toast.error(message);
          }
          throw error;
        }
      }

      // Execute the operation if all checks pass
      return await operation();
    } catch (error) {
      // Re-throw authorization/authentication errors
      if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
        throw error;
      }

      // Handle other errors
      console.error('Operation failed:', error);
      if (showToast) {
        toast.error('Operation failed. Please try again.');
      }
      throw error;
    }
  };
}

// Pre-configured middleware for common operations
export const authMiddleware = {
  // Order operations
  createOrder: createAuthMiddleware('order', 'create', {
    errorMessage: 'You need Sales Manager or Admin role to create orders'
  }),
  
  updateOrder: createAuthMiddleware('order', 'update', {
    errorMessage: 'You need Sales Manager or Admin role to update orders'
  }),

  deleteOrder: createAuthMiddleware('order', 'delete', {
    errorMessage: 'You need Admin role to delete orders'
  }),

  // Inventory operations
  updateInventory: createAuthMiddleware('inventory', 'update', {
    errorMessage: 'You need Production or Admin role to update inventory'
  }),

  // Financial operations
  createInvoice: createAuthMiddleware('invoice', 'create', {
    errorMessage: 'You need Finance or Admin role to create invoices'
  }),

  createCreditNote: createAuthMiddleware('credit_note', 'create', {
    errorMessage: 'You need Finance or Admin role to create credit notes'
  }),

  // Pricing operations
  updatePricing: createAuthMiddleware('pricing', 'update', {
    errorMessage: 'You need Sales Manager or Admin role to update pricing'
  }),

  // Price override with custom validation
  overridePrice: createAuthMiddleware('pricing', 'update', {
    customCheck: (user: User, context: { originalPrice: number; newPrice: number }) => {
      return AuthorizationService.canOverridePrice(
        user, 
        context.originalPrice, 
        context.newPrice
      );
    },
    errorMessage: 'Price override exceeds your authorization limit'
  }),

  // Batch operations
  createBatch: createAuthMiddleware('batch', 'create', {
    errorMessage: 'You need Production or Admin role to create batches'
  }),

  updateBatch: createAuthMiddleware('batch', 'update', {
    errorMessage: 'You need Production or Admin role to update batches'
  }),

  // Customer operations
  createCustomer: createAuthMiddleware('customer', 'create', {
    errorMessage: 'You need Sales Manager or Admin role to create customers'
  }),

  updateCustomer: createAuthMiddleware('customer', 'update', {
    errorMessage: 'You need Sales Manager or Admin role to update customers'
  }),

  // CRM operations
  createInteraction: createAuthMiddleware('interaction_log', 'create', {
    errorMessage: 'You need Sales Manager or Admin role to log interactions'
  }),

  createSample: createAuthMiddleware('samples_log', 'create', {
    errorMessage: 'You need Sales Manager or Admin role to log samples'
  }),

  createReturn: createAuthMiddleware('returns_log', 'create', {
    errorMessage: 'You need Finance or Admin role to process returns'
  })
};

// Decorator for class methods
export function RequirePermission(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  options: {
    customCheck?: (user: User, context?: any) => boolean;
    errorMessage?: string;
  } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const middleware = createAuthMiddleware(resource, action, {
      ...options,
      showToast: true
    });

    descriptor.value = async function (...args: any[]) {
      return middleware(
        () => originalMethod.apply(this, args),
        args[0] // Pass first argument as context
      );
    };

    return descriptor;
  };
}

// Role-based decorator
export function RequireRole(roles: UserRole[], errorMessage?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const currentUser = User.getCurrentUser();
      if (!currentUser) {
        const error = new AuthenticationError();
        toast.error('Authentication required. Please log in.');
        throw error;
      }

      if (!AuthorizationService.hasRole(currentUser, roles)) {
        const message = errorMessage || 
          `Access denied: Requires one of these roles: ${roles.join(', ')}`;
        const error = new AuthorizationError(message);
        toast.error(message);
        throw error;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Utility function to wrap async operations with authorization
export async function withAuth<T>(
  operation: () => Promise<T>,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  options?: {
    customCheck?: (user: User, context?: any) => boolean;
    errorMessage?: string;
    context?: any;
  }
): Promise<T> {
  const middleware = createAuthMiddleware(resource, action, options);
  return middleware(operation, options?.context);
}

// Batch authorization check for multiple operations
export function checkBatchPermissions(
  permissions: Array<{
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
    context?: any;
  }>
): { allowed: boolean; deniedPermissions: string[] } {
  const currentUser = User.getCurrentUser();
  if (!currentUser) {
    return {
      allowed: false,
      deniedPermissions: ['Authentication required']
    };
  }

  const deniedPermissions: string[] = [];

  for (const permission of permissions) {
    const hasPermission = AuthorizationService.hasPermission(
      currentUser,
      permission.resource,
      permission.action,
      permission.context
    );

    if (!hasPermission) {
      deniedPermissions.push(`${permission.action} ${permission.resource}`);
    }
  }

  return {
    allowed: deniedPermissions.length === 0,
    deniedPermissions
  };
}

// Authorization status checker
export function getAuthorizationStatus() {
  const currentUser = User.getCurrentUser();
  
  return {
    isAuthenticated: !!currentUser,
    user: currentUser,
    permissions: currentUser ? AuthorizationService.getUserPermissions(currentUser) : [],
    canAccessFinancialData: currentUser ? AuthorizationService.canAccessFinancialData(currentUser) : false,
    canModifyInventory: currentUser ? AuthorizationService.canModifyInventory(currentUser) : false,
    canManageCustomers: currentUser ? AuthorizationService.canManageCustomers(currentUser) : false
  };
}
# Role-Based Authentication System

This document explains how to use the role-based authentication and authorization system implemented for the GSR Operations application.

## Overview

The authentication system provides:
- **Role-based access control** with 5 predefined roles
- **Permission-based authorization** for fine-grained access control
- **React hooks and components** for easy integration
- **Middleware functions** for protecting API operations
- **Comprehensive testing** to ensure security

## User Roles

### 1. Admin (`UserRole.ADMIN`)
- **Full system access** - can perform all operations
- **User management** - can change user roles
- **No restrictions** on any functionality

### 2. Production (`UserRole.PRODUCTION`)
- **Batch management** - create, read, update production batches
- **Inventory control** - read and update inventory levels
- **Material intake** - manage raw material intake logs
- **Read access** to suppliers and raw materials

### 3. Sales Manager (`UserRole.SALES_MANAGER`)
- **Order management** - create, read, update orders
- **Customer management** - create, read, update customers
- **Pricing control** - read and update pricing (with limits)
- **CRM features** - manage interactions, samples, returns logs
- **Price overrides** - up to 20% price adjustments

### 4. Finance (`UserRole.FINANCE`)
- **Invoice management** - create, read, update invoices
- **Credit notes** - create and manage credit notes
- **Financial ledger** - manage financial transactions
- **Returns processing** - handle return logs and refunds
- **Read access** to orders, customers, and pricing

### 5. Viewer (`UserRole.VIEWER`)
- **Read-only access** to most data
- **No modification rights** - cannot create, update, or delete
- **Limited scope** - basic viewing permissions only

## Usage Examples

### 1. React Components with Authentication

```tsx
import { useAuth, PermissionGate, ProtectedRoute } from '../lib/auth';
import { UserRole } from '../Entities/User';

function MyComponent() {
  const { user, hasPermission, hasRole } = useAuth();

  return (
    <div>
      {/* Show content only to authenticated users */}
      {user && <p>Welcome, {user.name}!</p>}

      {/* Role-based content */}
      <PermissionGate roles={[UserRole.ADMIN, UserRole.FINANCE]}>
        <FinancialDashboard />
      </PermissionGate>

      {/* Permission-based content */}
      <PermissionGate permission={{ resource: 'order', action: 'create' }}>
        <CreateOrderButton />
      </PermissionGate>

      {/* Conditional rendering */}
      {hasPermission('pricing', 'update') && (
        <PricingControls />
      )}
    </div>
  );
}
```

### 2. Protected Routes

```tsx
import { ProtectedRoute } from '../lib/auth';
import { UserRole } from '../Entities/User';

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected by authentication */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* Protected by role */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
          <AdminPanel />
        </ProtectedRoute>
      } />
      
      {/* Protected by permission */}
      <Route path="/finance" element={
        <ProtectedRoute 
          requiredPermission={{ resource: 'invoice', action: 'read' }}
        >
          <FinancePage />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### 3. API Operations with Middleware

```tsx
import { authMiddleware, withAuth } from '../lib/authMiddleware';

class OrderService {
  // Using pre-configured middleware
  static async createOrder(orderData: OrderData) {
    return authMiddleware.createOrder(async () => {
      // Your order creation logic here
      return await api.post('/orders', orderData);
    });
  }

  // Using custom authorization
  static async updatePricing(productId: string, newPrice: number) {
    return withAuth(
      async () => {
        return await api.put(`/products/${productId}/price`, { price: newPrice });
      },
      'pricing',
      'update',
      {
        customCheck: (user, context) => {
          // Custom validation logic
          return user.role === UserRole.ADMIN || newPrice < 1000;
        },
        errorMessage: 'Price update requires admin approval for amounts over $1000'
      }
    );
  }
}
```

### 4. Using Hooks for Permission Checks

```tsx
import { usePermissions } from '../lib/auth';

function OrderForm() {
  const { 
    canCreate, 
    canUpdate, 
    isAdmin, 
    isSalesManager,
    user 
  } = usePermissions();

  const canOverridePrice = user && AuthorizationService.canOverridePrice(
    user, 
    originalPrice, 
    newPrice
  );

  return (
    <form>
      {/* Form fields */}
      
      {canCreate('order') && (
        <button type="submit">Create Order</button>
      )}
      
      {canUpdate('pricing') && canOverridePrice && (
        <PriceOverrideSection />
      )}
      
      {isAdmin() && (
        <AdminControls />
      )}
    </form>
  );
}
```

### 5. Class Method Decorators

```tsx
import { RequirePermission, RequireRole } from '../lib/authMiddleware';
import { UserRole } from '../Entities/User';

class InventoryService {
  @RequirePermission('inventory', 'update')
  static async updateBatchQuantity(batchId: string, quantity: number) {
    // This method is automatically protected
    return await api.put(`/batches/${batchId}`, { quantity });
  }

  @RequireRole([UserRole.ADMIN, UserRole.PRODUCTION])
  static async createProductionBatch(batchData: BatchData) {
    // Only admin and production users can call this
    return await api.post('/batches', batchData);
  }
}
```

## Authentication Setup

### 1. Wrap Your App with AuthProvider

```tsx
import { AuthProvider } from '../lib/auth';

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Your app components */}
      </Router>
    </AuthProvider>
  );
}
```

### 2. Login Implementation

```tsx
import { useAuth } from '../lib/auth';

function LoginForm() {
  const { login, loading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // Redirect to dashboard
    } catch (error) {
      // Handle login error
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Login form fields */}
    </form>
  );
}
```

## Permission System

### Resource-Action Model

Permissions are based on a **resource-action** model:

- **Resources**: `order`, `customer`, `batch`, `inventory`, `invoice`, `pricing`, etc.
- **Actions**: `create`, `read`, `update`, `delete`

### Permission Checking

```tsx
// Check specific permission
const canCreateOrders = AuthorizationService.hasPermission(user, 'order', 'create');

// Check role membership
const isFinanceUser = AuthorizationService.hasRole(user, [UserRole.FINANCE]);

// Check custom business logic
const canOverridePrice = AuthorizationService.canOverridePrice(user, 100, 120);
```

### Batch Permission Checking

```tsx
import { checkBatchPermissions } from '../lib/authMiddleware';

const permissions = [
  { resource: 'order', action: 'create' },
  { resource: 'customer', action: 'update' },
  { resource: 'pricing', action: 'update' }
];

const { allowed, deniedPermissions } = checkBatchPermissions(permissions);

if (!allowed) {
  console.log('Denied permissions:', deniedPermissions);
}
```

## Error Handling

The system provides specific error types:

```tsx
import { AuthorizationError, AuthenticationError } from '../lib/authMiddleware';

try {
  await protectedOperation();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Redirect to login
  } else if (error instanceof AuthorizationError) {
    // Show access denied message
  }
}
```

## Testing

The system includes comprehensive tests covering:

- **Role-based permissions** for all user types
- **Authorization middleware** functionality
- **Custom permission checks** (like price overrides)
- **Error handling** for unauthorized access
- **Utility functions** for batch operations

Run tests with:
```bash
npm run test:run -- src/lib/__tests__/auth.test.ts
```

## Security Considerations

1. **Client-side only**: This is a client-side authorization system. Always validate permissions on the server side as well.

2. **Token storage**: Currently uses localStorage. Consider more secure storage for production.

3. **Permission validation**: Always validate permissions both on the client and server side.

4. **Role changes**: Role changes require admin privileges and should be logged.

5. **Price overrides**: Have built-in limits and should be audited.

## Customization

### Adding New Roles

1. Add to `UserRole` enum in `src/Entities/User.ts`
2. Define permissions in `ROLE_PERMISSIONS`
3. Update tests to cover new role

### Adding New Resources

1. Add resource name to permission checks
2. Update role permissions as needed
3. Create middleware functions if needed
4. Add tests for new permissions

### Custom Permission Logic

```tsx
const customMiddleware = createAuthMiddleware('custom_resource', 'create', {
  customCheck: (user, context) => {
    // Your custom logic here
    return user.department === 'special' && context.amount < 1000;
  },
  errorMessage: 'Special department access required for amounts under $1000'
});
```

This authorization system provides a robust foundation for securing the GSR Operations application while maintaining flexibility for future requirements.
# Design Document

## Overview

This design addresses the critical audit findings in the GSR Operations system by implementing targeted fixes for the most severe issues: authentication system overhaul, automated financial workflow correction, inventory management data integrity, database view logic fixes, UI consistency improvements, and test coverage enhancement.

The solution maintains the existing React/TypeScript architecture while replacing the flawed auth-simple.tsx implementation, fixing business logic bypasses, implementing proper database transactions, correcting view calculations, standardizing UI components, and establishing reliable test coverage.

## Architecture

### Authentication System Overhaul

**Problem**: The current system uses `auth-simple.tsx` with hardcoded role assignment based on email comparison, rendering the 5-role RBAC system non-functional.

**Solution**: Replace auth-simple.tsx with the full auth.tsx implementation and proper database-driven role assignment.

```typescript
// Current problematic implementation in auth-simple.tsx
const simpleUser: SimpleUser = {
  id: session.user.id,
  email: session.user.email!,
  role: session.user.email === 'suriyavg834@gmail.com' ? UserRole.ADMIN : UserRole.VIEWER,
  // This breaks the entire RBAC system
};

// Fixed implementation using auth.tsx
interface AuthUser {
  id: string;
  email: string;
  role: UserRole; // Properly assigned from database
  permissions: Permission[];
  profile: UserProfile;
}

class AuthService {
  static async getCurrentUser(): Promise<AuthUser | null> {
    const session = await supabase.auth.getSession();
    if (!session.data.session) return null;
    
    // Query user profile from database, not hardcoded logic
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*, roles(*)')
      .eq('user_id', session.data.session.user.id)
      .single();
    
    return {
      id: session.data.session.user.id,
      email: session.data.session.user.email!,
      role: profile.role as UserRole,
      permissions: await this.getUserPermissions(profile.role),
      profile
    };
  }
}
```

**Database Schema Fix**:
```sql
-- Ensure user_profiles table has proper role assignments
UPDATE user_profiles 
SET role = CASE 
  WHEN email = 'suriyavg834@gmail.com' THEN 'admin'
  WHEN email LIKE '%production%' THEN 'production'
  WHEN email LIKE '%sales%' THEN 'sales_manager'
  WHEN email LIKE '%finance%' THEN 'finance'
  ELSE 'viewer'
END
WHERE role IS NULL OR role = 'viewer';

-- Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
```

### Automated Financial Workflow Fix

**Problem**: OrderForm.tsx calls `Order.create()` directly, bypassing the `OrderService.createOrder()` method that contains the automated invoice creation logic.

**Solution**: Modify OrderForm to use the proper service layer and implement transaction-based error handling.

```typescript
// Current problematic implementation in Orders.tsx
const handleSaveOrder = async (orderData: OrderData) => {
  // This bypasses the business logic in OrderService
  const newOrder = await Order.create(orderData);
  // Invoice is never created!
};

// Fixed implementation
const handleSaveOrder = async (orderData: OrderData) => {
  try {
    setLoading(true);
    // Use the proper service that includes invoice creation
    const result = await OrderService.createOrder(orderData);
    
    toast.success(`Order ${result.order.order_number} created with Invoice ${result.invoice.invoice_number}`);
    
    // Update UI with both order and invoice information
    setOrders(prev => [...prev, result.order]);
    setInvoices(prev => [...prev, result.invoice]);
    
  } catch (error) {
    toast.error(`Failed to create order: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

**Enhanced OrderService with Transaction Management**:
```typescript
class OrderService {
  static async createOrder(orderData: OrderData): Promise<{order: Order, invoice: Invoice}> {
    // Use Supabase transaction to ensure atomicity
    const { data, error } = await supabase.rpc('create_order_with_invoice', {
      order_data: orderData,
      invoice_data: {
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        payment_terms: 30
      }
    });
    
    if (error) {
      throw new Error(`Order creation failed: ${error.message}`);
    }
    
    return {
      order: data.order,
      invoice: data.invoice
    };
  }
}
```

**Database Function for Atomic Operations**:
```sql
-- Create stored procedure for atomic order and invoice creation
CREATE OR REPLACE FUNCTION create_order_with_invoice(
  order_data JSONB,
  invoice_data JSONB
) RETURNS JSONB AS $$
DECLARE
  new_order orders;
  new_invoice invoices;
  result JSONB;
BEGIN
  -- Insert order
  INSERT INTO orders (customer_id, order_date, total_amount, status, items)
  VALUES (
    (order_data->>'customer_id')::UUID,
    (order_data->>'order_date')::TIMESTAMP,
    (order_data->>'total_amount')::DECIMAL,
    (order_data->>'status')::TEXT,
    order_data->'items'
  ) RETURNING * INTO new_order;
  
  -- Insert invoice
  INSERT INTO invoices (order_id, invoice_number, issue_date, due_date, total_amount, payment_terms)
  VALUES (
    new_order.id,
    'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_sequence')::TEXT, 4, '0'),
    (invoice_data->>'issue_date')::TIMESTAMP,
    (invoice_data->>'due_date')::TIMESTAMP,
    new_order.total_amount,
    (invoice_data->>'payment_terms')::INTEGER
  ) RETURNING * INTO new_invoice;
  
  -- Create financial ledger entry
  INSERT INTO financial_ledger (invoice_id, transaction_type, amount, transaction_date)
  VALUES (new_invoice.id, 'invoice_created', new_invoice.total_amount, NOW());
  
  -- Return both records
  SELECT jsonb_build_object(
    'order', to_jsonb(new_order),
    'invoice', to_jsonb(new_invoice)
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Failed to create order and invoice: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

### Inventory Management Data Integrity Fix

**Problem**: Inventory is decremented before production batch creation is confirmed, leading to potential data inconsistency.

**Solution**: Implement atomic transactions that decrement inventory and create production batches together.

```typescript
// Current problematic implementation in productionBatch.ts
export const createProductionBatch = async (batchData: ProductionBatchData) => {
  // FLAWED: Inventory decremented before batch creation
  for (const item of batchData.items) {
    await InventoryService.decrementBatchQuantity(item.batchId, item.quantity);
  }
  
  // If this fails, inventory is already decremented!
  const batch = await ProductionBatch.create(batchData);
  return batch;
};

// Fixed implementation with atomic transactions
export const createProductionBatch = async (batchData: ProductionBatchData) => {
  const { data, error } = await supabase.rpc('create_production_batch_atomic', {
    batch_data: batchData,
    inventory_decrements: batchData.items.map(item => ({
      batch_id: item.batchId,
      quantity_used: item.quantity
    }))
  });
  
  if (error) {
    throw new Error(`Production batch creation failed: ${error.message}`);
  }
  
  return data;
};
```

**Database Function for Atomic Inventory Operations**:
```sql
CREATE OR REPLACE FUNCTION create_production_batch_atomic(
  batch_data JSONB,
  inventory_decrements JSONB[]
) RETURNS JSONB AS $$
DECLARE
  new_batch production_batches;
  decrement_item JSONB;
  current_quantity INTEGER;
BEGIN
  -- Validate all inventory quantities first
  FOREACH decrement_item IN ARRAY inventory_decrements
  LOOP
    SELECT remaining_quantity INTO current_quantity
    FROM material_intake_log
    WHERE id = (decrement_item->>'batch_id')::UUID;
    
    IF current_quantity < (decrement_item->>'quantity_used')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient inventory: batch % has % remaining, requested %',
        decrement_item->>'batch_id',
        current_quantity,
        decrement_item->>'quantity_used';
    END IF;
  END LOOP;
  
  -- Create production batch
  INSERT INTO production_batches (batch_number, total_input_cost, output_litres, yield_percentage, cost_per_litre)
  VALUES (
    (batch_data->>'batch_number')::TEXT,
    (batch_data->>'total_input_cost')::DECIMAL,
    (batch_data->>'output_litres')::DECIMAL,
    (batch_data->>'yield_percentage')::DECIMAL,
    (batch_data->>'cost_per_litre')::DECIMAL
  ) RETURNING * INTO new_batch;
  
  -- Decrement inventory quantities
  FOREACH decrement_item IN ARRAY inventory_decrements
  LOOP
    UPDATE material_intake_log
    SET remaining_quantity = remaining_quantity - (decrement_item->>'quantity_used')::INTEGER,
        updated_at = NOW()
    WHERE id = (decrement_item->>'batch_id')::UUID;
    
    -- Create audit trail
    INSERT INTO inventory_movements (batch_id, production_batch_id, quantity_used, movement_date)
    VALUES (
      (decrement_item->>'batch_id')::UUID,
      new_batch.id,
      (decrement_item->>'quantity_used')::INTEGER,
      NOW()
    );
  END LOOP;
  
  RETURN to_jsonb(new_batch);
EXCEPTION
  WHEN OTHERS THEN
    -- All changes are automatically rolled back
    RAISE EXCEPTION 'Production batch creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

### Database View Logic Correction

**Problem**: Database views contain flawed calculations and rely on potentially stale table data instead of computing values.

**Solution**: Rewrite views with proper calculations and error handling.

```sql
-- Fixed vw_batch_yield with proper calculations
CREATE OR REPLACE VIEW vw_batch_yield AS
SELECT 
  pb.id as batch_id,
  pb.batch_number,
  pb.total_input_cost,
  pb.output_litres,
  -- Calculate cost_per_litre within the view
  CASE 
    WHEN pb.output_litres > 0 THEN pb.total_input_cost / pb.output_litres
    ELSE 0
  END as cost_per_litre,
  -- Calculate yield_percentage within the view
  CASE 
    WHEN pb.total_input_cost > 0 THEN 
      (pb.output_litres * (pb.total_input_cost / pb.output_litres) / pb.total_input_cost) * 100
    ELSE 0
  END as yield_percentage,
  COALESCE(
    json_agg(
      json_build_object(
        'material_name', rm.name,
        'quantity_used', bi.quantity_used,
        'cost_per_unit', mil.cost_per_unit,
        'total_cost', bi.quantity_used * mil.cost_per_unit
      )
    ) FILTER (WHERE bi.id IS NOT NULL), 
    '[]'::json
  ) as material_breakdown
FROM production_batches pb
LEFT JOIN batch_inputs bi ON pb.id = bi.batch_id
LEFT JOIN material_intake_log mil ON bi.material_intake_id = mil.id
LEFT JOIN raw_materials rm ON mil.raw_material_id = rm.id
GROUP BY pb.id, pb.batch_number, pb.total_input_cost, pb.output_litres;

-- Fixed vw_customer_metrics with simplified reorder prediction
CREATE OR REPLACE VIEW vw_customer_metrics AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(SUM(o.total_amount), 0) as ltv,
  CASE 
    WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
    ELSE 0
  END as aov,
  MAX(o.order_date) as last_order_date,
  -- Simplified average calculation
  CASE 
    WHEN COUNT(o.id) > 1 THEN 
      EXTRACT(EPOCH FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1) / 86400
    ELSE NULL
  END as avg_days_between_orders,
  -- Simplified reorder prediction
  CASE 
    WHEN COUNT(o.id) > 1 THEN 
      MAX(o.order_date) + (INTERVAL '1 day' * 
        (EXTRACT(EPOCH FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1) / 86400))
    ELSE NULL
  END as predicted_reorder_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
GROUP BY c.id, c.name;
```

## Components and Interfaces

### Authentication Components Replacement

**AuthProvider Replacement**:
```typescript
// Replace the simplified auth context with full implementation
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Initialize with proper database-driven authentication
    const initializeAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  const hasPermission = (resource: string, action: string) => {
    if (!user) return false;
    return user.permissions.some(p => 
      (p.resource === resource || p.resource === '*') &&
      (p.action === action || p.action === '*')
    );
  };
  
  const hasRole = (role: UserRole) => {
    return user?.role === role || user?.role === UserRole.ADMIN;
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Enhanced Order Form Component

**Fixed OrderForm with Proper Service Integration**:
```typescript
interface OrderFormProps {
  onSave: (order: Order, invoice: Invoice) => void;
  onCancel: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Use proper service layer instead of direct entity call
      const result = await OrderService.createOrder(formData);
      
      toast.success(
        `Order ${result.order.order_number} created successfully with Invoice ${result.invoice.invoice_number}`
      );
      
      onSave(result.order, result.invoice);
      
    } catch (error) {
      toast.error(`Failed to create order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form fields */}
      
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Order & Invoice...
            </>
          ) : (
            'Create Order'
          )}
        </Button>
      </div>
    </form>
  );
};
```

### Consistent Loading State Components

**Standardized Skeleton Usage**:
```typescript
// Replace inconsistent loading implementations with centralized components
const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} variant="compact" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats?.cards.map(card => (
        <StatsCard key={card.id} {...card} />
      ))}
    </div>
  );
};

// Enhanced form validation
const MaterialIntakeForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(materialIntakeSchema)
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <label htmlFor="quantity">Quantity</label>
          <input
            {...register('quantity', {
              required: 'Quantity is required',
              min: { value: 0.01, message: 'Quantity must be greater than 0' },
              validate: value => value > 0 || 'Quantity cannot be zero or negative'
            })}
            type="number"
            step="0.01"
            min="0.01"
            className="border border-amber-200 rounded-lg px-3 py-2 focus:border-amber-400"
          />
          {errors.quantity && (
            <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
          )}
        </div>
      </div>
    </form>
  );
};
```

## Data Models

### Enhanced Entity Models with Proper Relationships

```typescript
// Fixed Order entity with proper invoice relationship
interface Order extends BaseEntity {
  id: string;
  customer_id: string;
  order_number: string;
  order_date: Date;
  total_amount: number;
  status: OrderStatus;
  items: OrderItem[];
  
  // Relationship to invoice (created automatically)
  invoice?: Invoice;
  
  // Methods
  static async create(data: OrderData): Promise<{ order: Order; invoice: Invoice }> {
    // This should not be called directly from UI
    throw new Error('Use OrderService.createOrder() instead of Order.create()');
  }
}

// Enhanced Invoice entity
interface Invoice extends BaseEntity {
  id: string;
  order_id: string;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  payment_terms: number;
  
  // Relationships
  order?: Order;
  payments?: Payment[];
  credit_notes?: CreditNote[];
}

// Production batch with proper inventory tracking
interface ProductionBatch extends BaseEntity {
  id: string;
  batch_number: string;
  total_input_cost: number;
  output_litres: number;
  yield_percentage: number; // Calculated in database view
  cost_per_litre: number;   // Calculated in database view
  
  // Inventory movements tracking
  inventory_movements?: InventoryMovement[];
  
  static async create(data: ProductionBatchData): Promise<ProductionBatch> {
    // Use atomic service instead of direct creation
    return ProductionBatchService.createWithInventoryDecrement(data);
  }
}
```

## Error Handling

### Comprehensive Error Management

```typescript
// Enhanced error handling for critical operations
class CriticalOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public details?: any,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'CriticalOperationError';
  }
}

class ErrorHandler {
  static handleAuthenticationError(error: Error): void {
    if (error.message.includes('role assignment')) {
      toast.error('Authentication system error. Please contact administrator.');
      // Log critical auth failure
      console.error('CRITICAL: Role assignment failure', error);
    } else {
      toast.error('Authentication failed. Please try again.');
    }
  }
  
  static handleBusinessLogicError(error: Error, operation: string): void {
    if (error.message.includes('invoice creation')) {
      toast.error('Order created but invoice generation failed. Please contact finance team.');
    } else if (error.message.includes('inventory')) {
      toast.error('Insufficient inventory or inventory update failed.');
    } else {
      toast.error(`${operation} failed: ${error.message}`);
    }
  }
  
  static handleDatabaseError(error: Error): void {
    if (error.message.includes('transaction')) {
      toast.error('Operation failed due to data consistency requirements. No changes were made.');
    } else {
      toast.error('Database operation failed. Please try again.');
    }
  }
}
```

## Testing Strategy

### Comprehensive Test Coverage for Critical Components

```typescript
// Fixed authentication tests
describe('Authentication System', () => {
  beforeEach(() => {
    // Mock database responses for all 5 roles
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'production', user_id: 'test-id' }
          })
        })
      })
    } as any);
  });
  
  it('should assign correct roles from database', async () => {
    const user = await AuthService.getCurrentUser();
    expect(user?.role).toBe(UserRole.PRODUCTION);
    expect(user?.role).not.toBe(UserRole.VIEWER); // Should not default to VIEWER
  });
  
  it('should enforce role-based permissions', async () => {
    const user = await AuthService.getCurrentUser();
    expect(user?.hasPermission('batch', 'create')).toBe(true);
    expect(user?.hasPermission('invoice', 'create')).toBe(false);
  });
});

// Fixed business logic tests
describe('OrderService', () => {
  it('should create order and invoice atomically', async () => {
    const orderData = { customer_id: 'test', total_amount: 100 };
    
    const result = await OrderService.createOrder(orderData);
    
    expect(result.order).toBeDefined();
    expect(result.invoice).toBeDefined();
    expect(result.invoice.order_id).toBe(result.order.id);
  });
  
  it('should rollback order if invoice creation fails', async () => {
    // Mock invoice creation failure
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Invoice creation failed'));
    
    await expect(OrderService.createOrder({})).rejects.toThrow();
    
    // Verify no order was created
    const orders = await Order.findAll();
    expect(orders).toHaveLength(0);
  });
});

// Production batch integration tests
describe('ProductionBatchService', () => {
  it('should decrement inventory atomically with batch creation', async () => {
    const batchData = {
      items: [{ batchId: 'batch-1', quantity: 10 }]
    };
    
    // Mock initial inventory
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'batch-1', remaining_quantity: 20 }]
        })
      })
    } as any);
    
    await ProductionBatchService.createWithInventoryDecrement(batchData);
    
    // Verify inventory was decremented
    expect(supabase.rpc).toHaveBeenCalledWith('create_production_batch_atomic', expect.any(Object));
  });
  
  it('should prevent batch creation with insufficient inventory', async () => {
    const batchData = {
      items: [{ batchId: 'batch-1', quantity: 30 }] // More than available
    };
    
    await expect(
      ProductionBatchService.createWithInventoryDecrement(batchData)
    ).rejects.toThrow('Insufficient inventory');
  });
});
```

## Implementation Phases

### Phase 1: Critical Security Fix (Authentication)
- Replace auth-simple.tsx with auth.tsx
- Update user role assignment logic
- Test RLS policies with proper roles
- Verify permission enforcement

### Phase 2: Business Logic Integrity (Financial Workflow)
- Fix OrderForm to use OrderService
- Implement atomic order/invoice creation
- Add proper error handling and rollback
- Test end-to-end order creation flow

### Phase 3: Data Integrity (Inventory Management)
- Implement atomic production batch creation
- Fix inventory decrement timing
- Add proper transaction management
- Test inventory consistency scenarios

### Phase 4: Database View Corrections
- Rewrite vw_batch_yield with proper calculations
- Fix vw_customer_metrics reorder prediction
- Add error handling for edge cases
- Performance test view queries

### Phase 5: UI Consistency and Validation
- Standardize loading state components
- Implement robust client-side validation
- Fix form validation patterns
- Test UI consistency across components

### Phase 6: Test Coverage Enhancement
- Fix failing RoleService tests
- Implement reliable CreditNoteForm tests
- Add end-to-end critical flow tests
- Achieve 80% coverage for business logic

This phased approach prioritizes the most critical security and data integrity issues first, followed by business logic fixes, and finally UI and testing improvements.
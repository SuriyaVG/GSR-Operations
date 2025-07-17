# Design Document

## Overview

This design addresses the comprehensive audit findings for the GSR Operations system by implementing a systematic approach to fix core business logic, enhance user experience, and improve system reliability. The solution maintains the existing React/TypeScript architecture while introducing new database views, enhanced UI components, automated workflows, and mobile optimization.

The design leverages the current tech stack (React 19, TypeScript, Tailwind CSS, Radix UI) and extends it with new patterns for database integration, role-based security, and responsive design. The amber/orange color scheme and glassy card aesthetic will be preserved throughout all new components.

## Architecture

### Database Layer Enhancement

**Database Views Integration**
- Replace front-end calculations with optimized Supabase views
- Implement three core views: `vw_batch_yield`, `vw_invoice_aging`, `vw_customer_metrics`
- Add error handling layer for database connectivity issues
- Implement retry mechanisms for failed queries

**Database Migration Scripts**
```sql
-- Migration: Create new tables and views
-- File: migrations/001_audit_remediation.sql

-- Create pricing rules table
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_tier TEXT NOT NULL CHECK (customer_tier IN ('premium', 'wholesale', 'standard')),
  product_category TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  margin_percentage DECIMAL(5,2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interaction log table
CREATE TABLE interaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'whatsapp', 'meeting')),
  description TEXT NOT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Create samples log table
CREATE TABLE samples_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  sample_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  sent_date TIMESTAMP WITH TIME ZONE NOT NULL,
  feedback TEXT,
  converted_to_order BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create returns log table
CREATE TABLE returns_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  return_reason TEXT NOT NULL,
  quantity_returned INTEGER NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  processed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create database views
CREATE VIEW vw_batch_yield AS
SELECT 
  pb.id as batch_id,
  pb.batch_number,
  pb.total_input_cost,
  pb.output_litres,
  pb.cost_per_litre,
  pb.yield_percentage,
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
GROUP BY pb.id, pb.batch_number, pb.total_input_cost, pb.output_litres, pb.cost_per_litre, pb.yield_percentage;

CREATE VIEW vw_invoice_aging AS
SELECT 
  i.id as invoice_id,
  c.name as customer_name,
  i.invoice_number,
  i.issue_date,
  i.due_date,
  i.total_amount,
  COALESCE(i.paid_amount, 0) as paid_amount,
  i.total_amount - COALESCE(i.paid_amount, 0) as outstanding_amount,
  GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date)) as days_overdue,
  CASE 
    WHEN EXTRACT(DAY FROM NOW() - i.due_date) <= 0 THEN 'current'
    WHEN EXTRACT(DAY FROM NOW() - i.due_date) <= 30 THEN '0-30'
    WHEN EXTRACT(DAY FROM NOW() - i.due_date) <= 60 THEN '31-60'
    WHEN EXTRACT(DAY FROM NOW() - i.due_date) <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket
FROM invoices i
JOIN orders o ON i.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE i.status != 'cancelled';

CREATE VIEW vw_customer_metrics AS
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
  CASE 
    WHEN COUNT(o.id) > 1 THEN 
      EXTRACT(DAY FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1)
    ELSE NULL
  END as avg_days_between_orders,
  CASE 
    WHEN COUNT(o.id) > 1 THEN 
      MAX(o.order_date) + INTERVAL '1 day' * (EXTRACT(DAY FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1))
    ELSE NULL
  END as predicted_reorder_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name;
```

**New Tables Structure**
```typescript
// TypeScript interfaces for new tables
interface PricingRules {
  id: string;
  customer_tier: 'premium' | 'wholesale' | 'standard';
  product_category: string;
  min_quantity: number;
  unit_price: number;
  margin_percentage: number;
  effective_from: Date;
  effective_to?: Date;
}

interface InteractionLog {
  id: string;
  customer_id: string;
  interaction_type: 'call' | 'email' | 'whatsapp' | 'meeting';
  description: string;
  follow_up_required: boolean;
  created_at: Date;
  created_by: string;
}

interface SamplesLog {
  id: string;
  customer_id: string;
  sample_sku: string;
  quantity: number;
  sent_date: Date;
  feedback?: string;
  converted_to_order?: boolean;
}

interface ReturnsLog {
  id: string;
  customer_id: string;
  order_id: string;
  return_reason: string;
  quantity_returned: number;
  refund_amount: number;
  processed_date: Date;
}
```

### Service Layer Architecture

**Database Service Layer**
```typescript
// New service layer for database operations
class DatabaseService {
  // View queries
  static async getBatchYield(batchId?: string): Promise<BatchYieldView[]>
  static async getInvoiceAging(customerId?: string): Promise<InvoiceAgingView[]>
  static async getCustomerMetrics(customerId?: string): Promise<CustomerMetricsView[]>
  
  // Error handling
  static async executeWithRetry<T>(operation: () => Promise<T>): Promise<T>
  static handleDatabaseError(error: Error): UserFriendlyError
}

// Pricing service
class PricingService {
  static async calculatePrice(customerId: string, productCategory: string, quantity: number): Promise<PriceCalculation>
  static async applyPricingRules(orderItems: OrderItem[]): Promise<OrderItem[]>
  static async validatePriceOverride(userId: string, originalPrice: number, newPrice: number): Promise<boolean>
}

// Inventory service with FIFO enforcement
class InventoryService {
  static async getAvailableBatches(materialId: string): Promise<MaterialBatch[]>
  static async validateBatchSelection(batchId: string, requestedQuantity: number): Promise<ValidationResult>
  static async decrementBatchQuantity(batchId: string, usedQuantity: number): Promise<void>
}
```

### Authentication & Authorization

**Role-Based Access Control**
```typescript
enum UserRole {
  ADMIN = 'admin',
  PRODUCTION = 'production',
  SALES_MANAGER = 'sales_manager',
  FINANCE = 'finance',
  VIEWER = 'viewer'
}

interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  condition?: (user: User, resource: any) => boolean;
}

// Permission matrix
const PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [/* all permissions */],
  [UserRole.PRODUCTION]: [
    { resource: 'batch', action: 'create' },
    { resource: 'batch', action: 'update' },
    { resource: 'inventory', action: 'update' }
  ],
  [UserRole.SALES_MANAGER]: [
    { resource: 'pricing', action: 'update' },
    { resource: 'order', action: 'create' }
  ],
  [UserRole.FINANCE]: [
    { resource: 'invoice', action: 'create' },
    { resource: 'credit_note', action: 'create' }
  ]
};
```

## Components and Interfaces

### Enhanced UI Components

**Combobox with Creatable Options**
```typescript
interface CreatableComboboxProps<T> {
  options: T[];
  value?: T;
  onSelect: (value: T) => void;
  onCreate: (newValue: string) => Promise<T>;
  displayField: keyof T;
  placeholder: string;
  createLabel?: string;
}

// Usage for suppliers, materials, customers, vendors
<CreatableCombobox
  options={suppliers}
  onSelect={setSelectedSupplier}
  onCreate={createNewSupplier}
  displayField="name"
  placeholder="Select or create supplier..."
  createLabel="+ Add new supplier"
/>
```

**Enhanced Form Components**
```typescript
// Form with validation and toast feedback
interface ValidatedFormProps {
  onSubmit: (data: any) => Promise<void>;
  validationSchema: ValidationSchema;
  children: React.ReactNode;
}

// Toast notification system
interface ToastService {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}
```

**Consistent Loading States**
```typescript
// Reusable empty state component
interface EmptyStateProps {
  icon: React.ComponentType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Enhanced skeleton components
const TableSkeleton: React.FC<{ rows: number; columns: number }>;
const CardSkeleton: React.FC<{ variant: 'default' | 'compact' | 'detailed' }>;
const FormSkeleton: React.FC<{ fields: number }>;
```

### Customer Management Components

**Customer Timeline Component**
```typescript
interface TimelineEvent {
  id: string;
  type: 'order' | 'interaction' | 'sample' | 'return';
  date: Date;
  title: string;
  description: string;
  metadata: Record<string, any>;
}

interface CustomerTimelineProps {
  customerId: string;
  events: TimelineEvent[];
  onEventClick: (event: TimelineEvent) => void;
}
```

**CRM Forms**
```typescript
// Interaction logging form
interface InteractionFormProps {
  customerId: string;
  onSave: (interaction: InteractionLog) => Promise<void>;
}

// Sample tracking form
interface SampleFormProps {
  customerId: string;
  availableSKUs: string[];
  onSave: (sample: SamplesLog) => Promise<void>;
}

// Returns processing form
interface ReturnFormProps {
  customerId: string;
  customerOrders: Order[];
  onSave: (returnLog: ReturnsLog) => Promise<void>;
}
```

### Financial Components

**Automated Invoice Workflow**
```typescript
interface InvoiceWorkflowService {
  createInvoiceFromOrder: (orderId: string) => Promise<Invoice>;
  linkPaymentToInvoice: (invoiceId: string, paymentId: string) => Promise<void>;
  createCreditNote: (invoiceId: string, reason: string, amount: number) => Promise<CreditNote>;
}

// Credit Note UI Component
interface CreditNoteFormProps {
  invoiceId: string;
  maxAmount: number;
  onSubmit: (creditNote: CreditNoteData) => Promise<void>;
}
```

**Financial Dashboard Components**
```typescript
// Invoice aging visualization
interface InvoiceAgingChartProps {
  data: InvoiceAgingView[];
  onInvoiceClick: (invoiceId: string) => void;
}

// Cost and margin cards
interface CostMarginCardProps {
  orderId: string;
  batchYieldData: BatchYieldView[];
  showDetailedBreakdown?: boolean;
}
```

### Mobile-Responsive Components

**Responsive Table Component**
```typescript
interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  mobileCardRenderer: (item: T) => React.ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg';
}

// Converts to card layout on mobile
const ResponsiveTable = <T,>({ data, columns, mobileCardRenderer, breakpoint = 'sm' }: ResponsiveTableProps<T>) => {
  // Implementation switches between table and card layout based on screen size
};
```

**Multi-Step Form Wizard**
```typescript
interface FormWizardProps {
  steps: FormStep[];
  onComplete: (data: any) => Promise<void>;
  mobileOptimized?: boolean;
}

interface FormStep {
  title: string;
  component: React.ComponentType<any>;
  validation: ValidationSchema;
}
```

## Data Models

### Enhanced Entity Models

**Extended Customer Model**
```typescript
interface Customer extends BaseEntity {
  // Existing fields...
  channel: 'direct' | 'distributor' | 'online' | 'retail';
  ltv?: number; // Calculated from vw_customer_metrics
  aov?: number; // Calculated from vw_customer_metrics
  last_order_date?: Date;
  predicted_reorder_date?: Date;
}
```

**New Entity Models**
```typescript
interface Invoice extends BaseEntity {
  order_id: string;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_terms: number; // days
}

interface CreditNote extends BaseEntity {
  invoice_id: string;
  credit_note_number: string;
  issue_date: Date;
  amount: number;
  reason: string;
  status: 'draft' | 'issued' | 'applied';
}

interface PricingRule extends BaseEntity {
  customer_tier: CustomerTier;
  product_category: string;
  min_quantity: number;
  unit_price: number;
  margin_percentage: number;
  effective_from: Date;
  effective_to?: Date;
}
```

### Database View Models

```typescript
interface BatchYieldView {
  batch_id: string;
  batch_number: string;
  total_input_cost: number;
  output_litres: number;
  cost_per_litre: number;
  yield_percentage: number;
  material_breakdown: MaterialCost[];
}

interface InvoiceAgingView {
  invoice_id: string;
  customer_name: string;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  aging_bucket: '0-30' | '31-60' | '61-90' | '90+';
}

interface CustomerMetricsView {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_revenue: number;
  ltv: number;
  aov: number;
  last_order_date: Date;
  avg_days_between_orders: number;
  predicted_reorder_date: Date;
}
```

## Error Handling

### Standardized Error Management

**Error Types and Handling**
```typescript
enum ErrorType {
  DATABASE_CONNECTION = 'database_connection',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service'
}

interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

class ErrorHandler {
  static handle(error: AppError): void {
    switch (error.type) {
      case ErrorType.DATABASE_CONNECTION:
        toast.error(`Unable to connect to database. ${error.retryable ? 'Retrying...' : 'Please try again later.'}`);
        break;
      case ErrorType.VALIDATION:
        toast.error(`Validation Error: ${error.message}`);
        break;
      case ErrorType.AUTHORIZATION:
        toast.error('You do not have permission to perform this action');
        break;
      default:
        toast.error('An unexpected error occurred. Please try again.');
    }
  }
}
```

**Retry Mechanism**
```typescript
class RetryService {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        await this.delay(delay * attempt);
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

## Testing Strategy

### Component Testing
- Unit tests for all new UI components using React Testing Library
- Integration tests for form validation and submission flows
- Accessibility testing using axe-core
- Mobile responsiveness testing across different viewport sizes

### Service Layer Testing
- Unit tests for all service classes (DatabaseService, PricingService, InventoryService)
- Mock database responses for consistent testing
- Error handling and retry mechanism testing
- Role-based permission testing

### End-to-End Testing
- Critical user flows: order creation, invoice generation, inventory management
- Mobile-specific user flows and touch interactions
- Cross-browser compatibility testing
- Performance testing for database view queries

### Database Testing
- Migration scripts testing with rollback scenarios
- Database view performance testing
- Data integrity testing for FIFO inventory operations
- Referential integrity testing for financial workflows

## Implementation Phases

### Phase 1: Core Infrastructure
- Database views creation and integration
- Service layer implementation
- Error handling and retry mechanisms
- Role-based authentication system

### Phase 2: Enhanced UI Components
- Creatable combobox components
- Form validation and toast notifications
- Consistent loading and empty states
- Mobile-responsive table and form components

### Phase 3: Business Logic Implementation
- FIFO inventory enforcement
- Automated invoice and ledger workflows
- Dynamic pricing engine
- Customer interaction tracking

### Phase 4: Analytics and Intelligence
- Financial dashboard with aging reports
- Customer timeline and CRM features
- Reorder prediction and notifications
- Cost and margin analysis

### Phase 5: Mobile Optimization and PWA
- Responsive layout adjustments
- PWA implementation with offline caching
- Touch-friendly component enhancements
- Performance optimization

### Phase 6: Final Polish
- Accessibility audit and improvements
- Code cleanup and barrel exports
- Performance optimization
- Documentation and training materials

This phased approach ensures incremental delivery of value while maintaining system stability and allowing for user feedback at each stage.

## Design System & Tokens

### Color Palette & Theme Configuration
```typescript
// Design tokens based on existing Tailwind configuration
const designTokens = {
  colors: {
    primary: {
      50: '#fefce8',   // Light amber background
      100: '#fef3c7',  // Amber accent light
      200: '#fde68a',  // Amber accent
      300: '#fcd34d',  // Amber primary light
      400: '#f59e0b',  // Amber primary (--primary: 35.8 91.7% 55.1%)
      500: '#d97706',  // Amber primary dark
      600: '#b45309',  // Amber dark
      700: '#92400e',  // Amber darker
      800: '#78350f',  // Amber darkest
      900: '#451a03'   // Amber black
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(251, 191, 36, 0.2)',
      shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      backdrop: 'blur(4px)'
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },
  borderRadius: {
    sm: 'calc(0.75rem - 4px)',  // --radius - 4px
    md: 'calc(0.75rem - 2px)',  // --radius - 2px
    lg: '0.75rem',              // --radius
    xl: '1rem'
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif']
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }]
    }
  }
};

// Glassy card component styling
const glassyCardStyles = {
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(251, 191, 36, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  borderRadius: '0.75rem'
};
```

### Component Design Standards
```typescript
// Standard component patterns
const componentStandards = {
  buttons: {
    primary: 'bg-amber-400 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg transition-colors',
    secondary: 'bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 font-medium px-4 py-2 rounded-lg transition-colors',
    ghost: 'hover:bg-amber-50 text-amber-600 font-medium px-4 py-2 rounded-lg transition-colors'
  },
  inputs: {
    default: 'border border-amber-200 rounded-lg px-3 py-2 focus:border-amber-400 focus:ring-1 focus:ring-amber-500 transition-colors',
    error: 'border border-red-300 rounded-lg px-3 py-2 focus:border-red-400 focus:ring-1 focus:ring-red-500'
  },
  cards: {
    default: 'bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg',
    interactive: 'bg-white/80 backdrop-blur-sm border border-amber-200/20 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer'
  }
};
```

## PWA Configuration

### Service Worker & Caching Strategy
```typescript
// PWA configuration using Workbox
const pwaConfig = {
  // Assets to pre-cache
  precacheAssets: [
    // Core shell
    '/',
    '/dashboard',
    '/orders',
    '/customers',
    '/finance',
    
    // Static assets
    '/vite.svg',
    '/manifest.json',
    
    // Critical CSS and JS bundles
    '/assets/index-*.css',
    '/assets/index-*.js'
  ],
  
  // Runtime caching strategies
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.supabase\.co\/rest\/v1\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
};

// Web App Manifest
const webAppManifest = {
  name: 'GSR Operations',
  short_name: 'GSR Ops',
  description: 'GSR Operations Management System',
  start_url: '/',
  display: 'standalone',
  background_color: '#fef3c7',
  theme_color: '#f59e0b',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ]
};
```

## API Contracts

### Database Service API Contracts
```typescript
// API request/response shapes for database services
namespace DatabaseAPI {
  // Batch Yield API
  interface GetBatchYieldRequest {
    batchId?: string;
    dateRange?: {
      from: string;
      to: string;
    };
  }
  
  interface GetBatchYieldResponse {
    data: BatchYieldView[];
    total: number;
    page: number;
    pageSize: number;
  }
  
  // Invoice Aging API
  interface GetInvoiceAgingRequest {
    customerId?: string;
    agingBucket?: 'current' | '0-30' | '31-60' | '61-90' | '90+';
    sortBy?: 'days_overdue' | 'outstanding_amount' | 'due_date';
    sortOrder?: 'asc' | 'desc';
  }
  
  interface GetInvoiceAgingResponse {
    data: InvoiceAgingView[];
    summary: {
      totalOutstanding: number;
      overdueCount: number;
      agingBreakdown: Record<string, number>;
    };
  }
  
  // Customer Metrics API
  interface GetCustomerMetricsRequest {
    customerId?: string;
    includeInactive?: boolean;
    sortBy?: 'ltv' | 'aov' | 'total_orders' | 'last_order_date';
  }
  
  interface GetCustomerMetricsResponse {
    data: CustomerMetricsView[];
    aggregates: {
      totalCustomers: number;
      averageLTV: number;
      averageAOV: number;
    };
  }
}

// Pricing Service API Contracts
namespace PricingAPI {
  interface CalculatePriceRequest {
    customerId: string;
    items: Array<{
      productCategory: string;
      quantity: number;
    }>;
  }
  
  interface CalculatePriceResponse {
    items: Array<{
      productCategory: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      appliedRule: {
        ruleId: string;
        tier: string;
        marginPercentage: number;
      };
    }>;
    totalAmount: number;
    totalMargin: number;
  }
  
  interface ValidatePriceOverrideRequest {
    userId: string;
    originalPrice: number;
    newPrice: number;
    reason?: string;
  }
  
  interface ValidatePriceOverrideResponse {
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
    approvalWorkflow?: {
      approverRole: string;
      maxOverridePercentage: number;
    };
  }
}

// Inventory Service API Contracts
namespace InventoryAPI {
  interface GetAvailableBatchesRequest {
    materialId: string;
    requiredQuantity?: number;
    fifoOrder?: boolean;
  }
  
  interface GetAvailableBatchesResponse {
    batches: Array<{
      batchId: string;
      lotNumber: string;
      remainingQuantity: number;
      costPerUnit: number;
      intakeDate: string;
      expiryDate?: string;
    }>;
    totalAvailable: number;
  }
  
  interface DecrementBatchQuantityRequest {
    batchId: string;
    usedQuantity: number;
    orderId?: string;
    reason: string;
  }
  
  interface DecrementBatchQuantityResponse {
    success: boolean;
    newRemainingQuantity: number;
    transaction: {
      id: string;
      timestamp: string;
    };
  }
}
```

## Performance Budgets

### Application Performance Targets
```typescript
const performanceBudgets = {
  // Bundle size limits
  bundleSize: {
    mainBundle: '500KB',        // Main application bundle
    vendorBundle: '1MB',        // Third-party dependencies
    chunkSize: '250KB',         // Individual route chunks
    totalInitial: '1.5MB'       // Total initial load
  },
  
  // Runtime performance
  runtime: {
    firstContentfulPaint: '1.5s',
    largestContentfulPaint: '2.5s',
    firstInputDelay: '100ms',
    cumulativeLayoutShift: '0.1',
    timeToInteractive: '3s'
  },
  
  // Database query performance
  database: {
    simpleQuery: '100ms',       // Single table queries
    viewQuery: '300ms',         // Database view queries
    complexQuery: '500ms',      // Multi-table joins
    aggregateQuery: '800ms',    // Heavy aggregation queries
    bulkOperation: '2s'         // Bulk insert/update operations
  },
  
  // API response times
  api: {
    getRequests: '200ms',       // Simple GET requests
    postRequests: '500ms',      // Create operations
    putRequests: '400ms',       // Update operations
    deleteRequests: '300ms',    // Delete operations
    searchRequests: '600ms'     // Search and filter operations
  },
  
  // Mobile performance
  mobile: {
    touchResponse: '16ms',      // Touch interaction response
    scrollPerformance: '60fps', // Smooth scrolling
    animationFrameRate: '60fps',// UI animations
    offlineLoadTime: '1s'       // PWA offline load time
  }
};

// Performance monitoring configuration
const performanceMonitoring = {
  // Core Web Vitals tracking
  webVitals: {
    trackFCP: true,
    trackLCP: true,
    trackFID: true,
    trackCLS: true,
    trackTTFB: true
  },
  
  // Custom metrics
  customMetrics: [
    'database_query_duration',
    'form_submission_time',
    'page_transition_duration',
    'search_response_time'
  ],
  
  // Performance alerts
  alerts: {
    slowQuery: '1s',           // Alert if query takes longer than 1s
    highMemoryUsage: '100MB',  // Alert if memory usage exceeds 100MB
    lowBatteryImpact: true,    // Monitor battery usage on mobile
    networkFailureRate: '5%'   // Alert if network failure rate exceeds 5%
  }
};
```

### Optimization Strategies
```typescript
const optimizationStrategies = {
  // Code splitting
  codeSplitting: {
    routeBasedSplitting: true,
    componentLazyLoading: true,
    vendorChunkSeparation: true,
    dynamicImports: [
      'charts', 'pdf-generation', 'advanced-filters'
    ]
  },
  
  // Data fetching optimization
  dataOptimization: {
    queryBatching: true,
    resultCaching: '5min',
    paginationDefault: 50,
    virtualScrolling: true,
    prefetchCriticalData: [
      'user-permissions', 'customer-list', 'product-catalog'
    ]
  },
  
  // Image and asset optimization
  assetOptimization: {
    imageFormats: ['webp', 'avif', 'jpg'],
    imageSizes: [320, 640, 1024, 1920],
    lazyLoading: true,
    compressionLevel: 85
  }
};
```

This comprehensive technical specification ensures consistent implementation across all audit remediation tasks while maintaining high performance and user experience standards.
---
inclusion: always
---

# Project Structure

## Directory Organization
```
├── src/                    # Source code (React components, business logic)
├── public/                 # Static assets
├── database/               # Database migrations and schemas
│   ├── migrations/         # General SQL migration files
│   └── supabase/           # Supabase-specific migrations and schemas
├── scripts/                # Database management and testing utilities
├── docs/                   # Documentation files
└── .kiro/                  # Kiro configuration and specifications
    ├── specs/              # Feature specifications and designs
    └── steering/           # Development guidelines and standards
```

## Source Code Organization

### Components (`src/Components/`)
- **Domain-based folders**: `auth/`, `customers/`, `finance/`, `material/`, `orders/`, `production/`, `admin/`, `dashboard/`
- **Core UI**: `ui/` contains reusable design system components (shadcn/ui based)
- **Examples**: `examples/` contains component demos and testing utilities

### Business Logic (`src/lib/`)
- **Authentication**: `auth.tsx`, `auth-simple.tsx`, `authMiddleware.ts`, `authorization.ts` for comprehensive auth system
- **Services**: `services/` directory for domain services (audit, user profile, role management, error handling)
- **Hooks**: `hooks/` for custom React hooks (form validation, order management, realtime subscriptions)
- **Configuration**: `config/` for app configuration and special user settings
- **Core utilities**: `database.ts`, `database-view-handler.ts`, `validation.ts`, `toast.ts`, `realtime.ts`, `supabase.ts`
- **Business domains**: `financial.ts`, `inventory.ts`, `orderService.ts`, `productionBatch.ts`

### Data Layer (`src/Entities/`)
- **Comprehensive entity interfaces** with TypeScript types and database operations
- **Entity classes** with CRUD methods for direct database interaction via Supabase client
- **Key entities**: `User.ts`, `Customer.ts`, `FinancialLedger.ts`, `SamplesLog.ts`, `Order.ts`, `ProductionBatch.ts`
- **Supporting entities**: `Invoice.ts`, `CreditNote.ts`, `MaterialIntakeLog.ts`, `InteractionLog.ts`, `ReturnsLog.ts`
- **Configuration entities**: `PricingRule.ts`, `Supplier.ts`, `RawMaterial.ts`
- **Entity pattern**: Each entity exports both TypeScript interfaces and a class with database operations (list, find, filter, create, update, delete)
- **Centralized exports**: `all.ts` provides unified access to all entity types and classes with proper separation between interfaces and implementations
- **Backward compatibility**: Type aliases maintain existing import patterns while enabling new structured imports

### Pages (`src/Pages/`)
- **Top-level route components**: `Dashboard.tsx`, `Finance.tsx`, `Orders.tsx`, `Production.tsx`, `Customers.tsx`, `MaterialIntake.tsx`
- **Administrative pages**: `Admin.tsx`, `Profile.tsx`
- **Layout component**: `Layout.tsx` with navigation and authentication

### Types (`src/types/`)
- **Supabase types**: Auto-generated database types from Supabase schema

### Testing (`src/test/`)
- **Test setup**: Global test configuration and utilities

## Database Structure

### Supabase Migrations (`database/supabase/migrations/`)
- **Initial schema**: Core tables and relationships
- **RLS policies**: Row Level Security for data access control
- **Seed data**: Development and testing data
- **Audit system**: Comprehensive audit logging tables and functions

### Scripts (`scripts/`)
- **Database management**: Setup, migration, seeding, health checks, and schema verification
- **Database validation**: Setup validation and prerequisite checking (`setup-database-first.js`)
- **View management**: Database view fixes and optimization utilities
- **View creation**: Comprehensive database view creation (`create-missing-views.sql`) for customer analytics and business intelligence
- **Table creation**: Core business entity table creation (`create-orders-table.cjs`) with relationship validation
- **Table validation**: Structure verification and accessibility testing (`check-orders-table.cjs`)
- **Schema repair**: Missing table creation scripts (`fix-missing-orders-table.sql`) for order management structures
- **Testing utilities**: Authorization testing, user creation, verification
- **Supabase manager**: Comprehensive database lifecycle management

## Code Conventions

### Naming & File Structure
- **Components**: PascalCase (e.g., `OrderForm.tsx`, `AuditLogViewer.tsx`)
- **Utilities**: camelCase (e.g., `validation.ts`, `userProfileService.ts`)
- **Tests**: Co-located in `__tests__/` directories with descriptive names
- **Imports**: Use `@/` alias for src imports, group by external/internal/relative

### Component Architecture
- **Functional components** with TypeScript interfaces
- **Props interfaces** defined inline or exported
- **Custom hooks** for business logic extraction
- **Error boundaries** and comprehensive error handling
- **Loading states** and skeleton components for better UX

### Authentication & Authorization
- **Role-based access control** with 5 user roles (Admin, Production, Sales Manager, Finance, Viewer)
- **Permission-based authorization** for fine-grained access control with resource-action model
- **Custom permissions system** with wildcard support and special user configurations
- **Protected routes** and component-level permission gates (`ProtectedRoute`, `PermissionGate`)
- **Middleware functions** for API operation protection with retry logic
- **Enhanced user profiles** with custom designations, departments, and special permissions
- **Special user configuration system** for founder and key personnel with auto-applied settings
- **Profile management service** with validation, sanitization, and audit logging
- **Role change notifications** with subscription-based listeners
- **Robust auth state management** with lifecycle-aware initialization and cleanup
- **Race condition prevention** with mounted flags and proper subscription handling
- **Enhanced error handling** for auth state changes and session management
- **Profile history tracking** and audit trail for compliance
- **Simplified auth implementation** available as fallback (`auth-simple.tsx`) with core functionality only
- **Database-level role validation** with secure functions and triggers
- **Admin lockout prevention** with role assignment validation
- **Performance-optimized user queries** with specialized indexes
- **Secure role management functions** with admin-only access controls

### Styling Requirements
- **Strict adherence** to Tailwind theme tokens:
  - Backgrounds: `from-amber-50 to-orange-50`
  - Borders: `border-amber-200`
  - UI elements: `rounded-xl` corners, `backdrop-blur-sm` for cards
- **shadcn/ui components** with custom theme integration
- Use `class-variance-authority`, `clsx`, and `tailwind-merge` for conditional styling

### Testing Patterns
- **Comprehensive test coverage**: Unit, integration, and component tests
- **Test organization**: `__tests__/` directories with clear naming conventions
- **Mock strategies**: Supabase mocking, service mocking, and component mocking
- **Test utilities**: Custom test helpers and setup functions

### Data Flow & State Management
- **Supabase integration**: Real-time subscriptions and optimistic updates
- **Entity-based patterns**: Consistent data access through entity classes with standardized CRUD operations
- **Form validation**: Custom hooks with comprehensive validation rules
- **Error handling**: Centralized error handling with user-friendly feedback
- **Audit logging**: Comprehensive audit trail for all data modifications
- **Database view handling**: Resilient view access with fallback calculations

### Database Field Naming Conventions
- **Timestamp fields**: Use `created_at` and `updated_at` (not `created_date` or `updated_date`)
- **ID fields**: Use `id` for primary keys, `{entity}_id` for foreign keys (e.g., `customer_id`, `order_id`)
- **Status fields**: Use enum types with snake_case values (e.g., `'pending'`, `'in_progress'`, `'completed'`)
- **Boolean fields**: Use descriptive names with `is_` or `has_` prefixes where appropriate
- **Monetary fields**: Use `DECIMAL(10,2)` type with `_amount` suffix (e.g., `total_amount`, `tax_amount`)
- **Entity sorting**: Default sort by `-created_at` for chronological ordering (newest first)

### Service Architecture
- **Domain services**: Specialized services for user profiles, roles, and audit logging
- **Error handling service**: Centralized error processing and user feedback
- **Real-time service**: WebSocket management and subscription handling
- **Validation service**: Input sanitization and business rule validation

### Authentication Patterns
- **AuthProvider**: React Context provider for global authentication state with lifecycle-aware initialization
- **useAuth hook**: Primary hook for accessing authentication state and methods (from `@/lib/auth`)
- **usePermissions hook**: Convenience hook for permission checking with role-specific methods
- **ProtectedRoute**: HOC for route-level access control with role and permission requirements
- **PermissionGate**: Component for conditional rendering based on permissions
- **Special User System**: Automatic configuration application for designated users (founders, key personnel)
- **Profile Management**: Enhanced user profiles with custom fields, validation, and audit trails
- **Role Change Subscriptions**: Real-time notifications for permission and role updates
- **Auth State Initialization**: Listener-first approach to prevent race conditions between session retrieval and state changes
- **Component Lifecycle Safety**: Mounted flags and proper cleanup to prevent memory leaks and state updates on unmounted components
- **Timeout Protection**: 3-second initialization timeout to prevent infinite loading states
- **Dependency Loop Prevention**: Careful useEffect dependency management to avoid re-initialization cycles
- **Full Authentication System**: Primary authentication implementation (`auth.tsx`) with comprehensive features
  - Enhanced user profiles with custom designations, departments, and special permissions
  - Database-driven role assignment with automatic profile creation
  - Special user configuration system for founder and key personnel
  - Comprehensive audit logging and profile history tracking
  - Real-time role change notifications and subscription-based updates
- **Simplified Auth Alternative**: `auth-simple.tsx` available as fallback for basic scenarios
  - Streamlined profile management without complex role management or audit trails
  - Basic authentication flow with login/logout functionality
  - Essential user interface with simplified profile settings (`ProfileSettings.simple.tsx`)
  - Minimal role assignment for basic access control (Admin, Viewer)
  - Direct Supabase Auth integration without enhanced user profile services
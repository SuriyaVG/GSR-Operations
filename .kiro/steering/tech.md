# Technology Stack

## Frontend Framework
- **React 19** with TypeScript
- **Vite 7** for build tooling and development server
- **React Router DOM 7** for client-side routing

## UI & Styling
- **Tailwind CSS 3.4** with custom design system and animations
- **Radix UI** components for accessible primitives (Dialog, Dropdown, Select, etc.)
- **Lucide React** for icons
- **class-variance-authority**, **clsx**, and **tailwind-merge** for conditional styling
- **Recharts** for data visualization and charts

## Backend & Database
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** database with Row Level Security (RLS)
- **Supabase Auth** with PKCE flow for secure authentication
- **Real-time subscriptions** for live data updates

## State & Data Management
- **Supabase client** with TypeScript database types
- **Entity-based data layer** with comprehensive TypeScript interfaces and CRUD operations
- **Entity classes** with standardized database methods (list, find, filter, create, update, delete)
- **Centralized entity exports** with proper separation between interfaces and implementations (`src/Entities/all.ts`)
- **Backward-compatible type system** maintaining existing import patterns while enabling structured access
- **Custom hooks** for data fetching and state management
- **Role-based authorization** system with fine-grained permissions
- **React Context** for authentication state management
- **Custom permission hooks** (`useAuth`, `usePermissions`) for component-level access control
- **Profile management** with enhanced user configurations and special user support

## Testing
- **Vitest 3** for unit and integration testing
- **Testing Library** (React, Jest DOM, User Event)
- **jsdom** for DOM simulation
- **Comprehensive test coverage** including auth, database, and UI components

## Development Tools
- **ESLint 9** with TypeScript and React plugins
- **TypeScript 5.8** with strict mode enabled
- **PostCSS** with Autoprefixer
- **Path aliases** configured (`@/` maps to `src/`)
- **dotenv** for environment variable management

## Database Management
- **Migration system** with Supabase migrations
- **Seed scripts** for development data
- **Health check utilities** for database monitoring and connection validation
- **Schema verification tools** for database structure validation
- **Database setup validation** with prerequisite checking and view fixes
- **Schema mismatch detection** and remediation for manufacturing vs e-commerce schemas
- **Audit logging** system for compliance and tracking
- **Database functions** for secure role management and validation
- **Performance indexes** for optimized user profile queries
- **Role validation triggers** to prevent admin lockout scenarios
- **Database view handler** with fallback calculations for resilient data access
- **Manufacturing schema creation** scripts for production batch tracking, material intake, and supplier management
- **Database view error handling** with graceful degradation and fallback calculations
- **View logic correction** system for accurate batch yield and customer metrics calculations
- **Performance-optimized database views** with proper NULL handling and division-by-zero protection
- **Table creation utilities** for core business entities (orders, order_items) with relationship validation
- **Table structure validation** scripts for ensuring proper database schema integrity
- **Schema repair utilities** for creating missing core tables with proper enums, constraints, and indexes
- **Database view creation utilities** for customer analytics and business intelligence (`create-missing-views.sql`)
- **Customer metrics views** with advanced segmentation, activity tracking, and value analysis

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once

# Code Quality
npm run lint         # Run ESLint

# Database Management
npm run db:setup     # Setup Supabase database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed development data
npm run db:verify    # Verify database connection
npm run db:health    # Check database health
npm run db:schema    # Check database schema and structure
npm run db:reset     # Reset database (development)

# Database Setup & Validation
node scripts/setup-database-first.js    # Validate database setup and provide view fixes
node scripts/migrate-supabase.js        # Run Supabase migrations
node scripts/supabase-setup-manual.js   # Manual Supabase setup
node scripts/check-database-schema.js   # Check for schema mismatches between expected and actual database structure
node scripts/test-view-logic.js         # Test database view calculations and logic
node scripts/test-view-error-handling.js # Test view error handling and fallback mechanisms
node scripts/apply-view-fixes.js        # Apply database view corrections and optimizations
node scripts/create-orders-table.cjs    # Create orders and order_items tables with proper relationships
node scripts/check-orders-table.cjs     # Validate orders table structure and accessibility

# Database Schema Repair
psql -f scripts/fix-missing-orders-table.sql  # Create missing orders and order_items tables with enums and indexes

# Database View Management
psql -f scripts/create-missing-views.sql  # Create comprehensive customer metrics views with advanced analytics
```

## Build Configuration
- **TypeScript** with strict mode and project references
- **Vite** with React plugin and path resolution
- **Tailwind** with custom theme, animations, and shadcn/ui integration
- **Test setup** with global configuration and mocks
- **Environment validation** with runtime checks
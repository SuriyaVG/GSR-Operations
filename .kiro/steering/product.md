# Product Overview

GSR Operations is a comprehensive business management system for a ghee manufacturing operation. The application manages the complete production lifecycle from raw material intake through customer orders and financial tracking, with robust role-based access control and real-time capabilities.

## Core Business Functions

### Material Intake & Inventory
- **Raw material procurement** and supplier management
- **Inventory tracking** with real-time stock levels
- **Material intake logging** with batch tracking
- **Stock summary** and low-stock alerts

### Production Management
- **Batch processing** with yield tracking and quality control
- **Production metrics** and performance analytics
- **Yield analysis** for cost optimization
- **Production scheduling** and resource planning

### Order Management & Sales
- **Customer order processing** and fulfillment tracking
- **Order metrics** and sales analytics
- **Customer relationship management** with interaction logging
- **Sample tracking** and conversion analytics
- **Returns processing** and credit management

### Customer Management
- **Customer segmentation** and classification with advanced value-based categorization
- **Customer metrics** and performance tracking with comprehensive analytics
- **Customer activity status** tracking (active, recent, at_risk, dormant, inactive, never_ordered)
- **Customer value segmentation** (high_value, medium_value, low_value, minimal_value, no_value)
- **Reorder predictions** and sales forecasting
- **Interaction logging** and relationship tracking

### Financial Management
- **Invoicing** and billing automation
- **Credit note management** for returns and adjustments
- **Accounts receivable** and aging reports
- **Financial ledger** with comprehensive transaction tracking
- **Cash flow analysis** and financial reporting

### Administration & Compliance
- **User management** with role-based permissions
- **Audit logging** for compliance and tracking
- **System administration** and configuration
- **Profile management** with special user configurations

## Key Features

### Security & Access Control
- **5-tier role system**: Admin, Production, Sales Manager, Finance, Viewer
- **Permission-based authorization** with resource-action model
- **Custom permissions system** with wildcard support (`*`, `resource:*`, `*:action`)
- **Row Level Security (RLS)** at database level
- **Comprehensive audit trail** for all data modifications
- **Special user configurations** for founder and key personnel with auto-applied settings
- **Enhanced user profiles** with custom designations, departments, and special permissions
- **Profile management** with validation, sanitization, and history tracking
- **Role change notifications** and subscription-based permission updates
- **Full-featured authentication** system (`auth.tsx`) as primary implementation with enhanced user profiles and special user configurations
- **Fallback authentication** system (`auth-simple.tsx`) available for simplified scenarios without enhanced features
- **Enhanced profile management** (`ProfileSettings.tsx`) with comprehensive user profile editing and audit trails
- **Simplified profile management** (`ProfileSettings.simple.tsx`) with basic name and display name editing for fallback scenarios
- **Database-level role validation** with secure PostgreSQL functions
- **Admin protection mechanisms** preventing system lockout scenarios
- **Performance-optimized role queries** with specialized database indexes
- **Secure role management API** with admin-only access controls

### Real-time Capabilities
- **Live dashboard updates** with production and financial metrics
- **Real-time notifications** for critical events
- **WebSocket subscriptions** for instant data synchronization
- **Connection health monitoring** and automatic reconnection

### Data Analytics & Reporting
- **Production yield analysis** and cost tracking
- **Customer segmentation** with behavioral analytics and advanced value-based categorization
- **Customer activity tracking** with 6-tier status system (never_ordered, active, recent, at_risk, dormant, inactive)
- **Customer value analysis** with 5-tier segmentation based on lifetime value
- **Financial reporting** with aging and cash flow analysis
- **Interactive charts** and data visualization
- **Export capabilities** for external reporting

### User Experience
- **Responsive design** optimized for desktop and mobile
- **Loading states** and skeleton components for smooth UX
- **Error handling** with user-friendly feedback
- **Form validation** with real-time feedback
- **Toast notifications** for system feedback

#### UI/UX Appearance Stability
- The current **amber-orange glassy card aesthetic** (gradient backgrounds, frosted-glass panels, amber accents) is _the_ approved visual identity.
- **shadcn/ui component system** with custom theme integration
- **Consistent spacing** and typography throughout the application
- Any proposal to alter colors, spacing, component styling, or overall layout **must** be run past the founder for sign-off **before** implementation.

## Business Context

The system is designed for a **ghee manufacturing business** that:
- Processes cream butter into ghee with detailed yield tracking
- Manages both **wholesale and direct sales** channels
- Requires **detailed cost tracking** and production optimization
- Operates with **multiple user roles** and access levels
- Needs **compliance tracking** and audit capabilities
- Handles **complex pricing structures** with override capabilities
- Manages **customer relationships** across different segments

## Technical Architecture

### Database Design
- **PostgreSQL** with Supabase for scalability and real-time features
- **Comprehensive entity model** covering all business domains
- **Migration system** for schema evolution
- **Seed data** for development and testing
- **Database-level security functions** for role management and validation
- **Performance-optimized indexes** for user profile and role queries
- **Admin protection mechanisms** to prevent system lockout
- **Advanced database views** for customer analytics with comprehensive metrics and segmentation
- **Customer metrics views** with activity tracking, value segmentation, and business intelligence

### Integration Points
- **Supabase Auth** for user authentication and session management
- **Real-time subscriptions** for live data updates
- **File storage** capabilities for documents and images
- **API endpoints** for external integrations

### Deployment & Operations
- **Environment-based configuration** (development, staging, production)
- **Health monitoring** and database connection checks
- **Migration management** with rollback capabilities
- **Comprehensive testing** including unit, integration, and E2E tests
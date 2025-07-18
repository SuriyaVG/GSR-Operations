# Supabase Database Migrations

This directory contains all database migrations for the GSR Operations application using Supabase.

## Migration Files

### Forward Migrations

1. **20250101000001_initial_schema.sql**
   - Creates all base tables for the GSR Operations system
   - Includes custom types, indexes, views, and triggers
   - Sets up the complete database schema

2. **20250101000002_rls_policies.sql**
   - Enables Row Level Security (RLS) on all tables
   - Creates comprehensive security policies based on user roles
   - Sets up helper functions for role-based access control
   - Includes automatic user profile creation trigger

3. **20250101000003_seed_data.sql**
   - Inserts initial seed data for development and testing
   - Includes sample suppliers, raw materials, customers, and pricing rules

### Rollback Migrations

- **rollback_20250101000001_initial_schema.sql** - Removes all tables, views, and types
- **rollback_20250101000002_rls_policies.sql** - Removes all RLS policies and functions

## Database Schema Overview

### Core Tables

- **user_profiles** - Extended user data (links to auth.users)
- **suppliers** - Supplier information
- **raw_materials** - Raw material catalog
- **material_intake_log** - Material procurement tracking
- **production_batches** - Production batch management
- **batch_inputs** - Materials used in each batch
- **customers** - Customer information
- **orders** - Customer orders
- **order_items** - Individual order line items
- **pricing_rules** - Dynamic pricing configuration
- **interaction_log** - Customer interaction tracking
- **samples_log** - Sample distribution tracking
- **returns_log** - Product return management
- **invoices** - Invoice management
- **credit_notes** - Credit note management
- **financial_ledger** - Financial transaction ledger

### Views

- **vw_batch_yield** - Production batch yield analysis
- **vw_invoice_aging** - Invoice aging report
- **vw_customer_metrics** - Customer analytics and metrics

### Security Model

The database uses Row Level Security (RLS) with role-based access control:

- **admin** - Full access to all data
- **production** - Access to production, inventory, and material data
- **sales_manager** - Access to customers, orders, pricing, and interactions
- **finance** - Access to financial data, invoices, and credit notes
- **viewer** - Read-only access to basic operational data

## Usage with Supabase CLI

To apply migrations:

```bash
# Apply all pending migrations
supabase db push

# Apply specific migration
supabase db push --include-all --include-seed
```

To rollback migrations:

```bash
# Run rollback migration manually
supabase db reset
```

## Environment Setup

Make sure your Supabase project has the following extensions enabled:
- `uuid-ossp` - For UUID generation
- `pgcrypto` - For cryptographic functions

## Development Notes

- All tables include `created_at` and `updated_at` timestamps
- Automatic timestamp updates are handled by triggers
- Foreign key constraints maintain referential integrity
- Indexes are optimized for common query patterns
- RLS policies enforce data security at the database level
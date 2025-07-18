# Database Migration Guide

This guide covers how to use the Supabase database migration system for GSR Operations.

## Overview

The migration system provides a complete solution for managing database schema changes, seeding data, and maintaining database consistency across different environments.

## Quick Start

### 1. Environment Setup

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Initial Database Setup

For development environment:
```bash
npm run db:dev
```

For production environment:
```bash
npm run db:prod
```

### 3. Verify Setup

```bash
npm run db:verify
```

## Available Commands

### Database Manager Commands

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Complete database setup (migrations + basic + dev data) |
| `npm run db:reset` | Reset database completely |
| `npm run db:update` | Update database (run pending migrations + refresh data) |
| `npm run db:status` | Show database status |
| `npm run db:dev` | Setup development environment |
| `npm run db:prod` | Setup production environment |

### Direct Script Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Run migration script directly |
| `npm run db:seed` | Run seeding script directly |
| `npm run db:verify` | Run verification script directly |

## Migration System

### Migration Files

Migrations are stored in `database/supabase/migrations/` with the following naming convention:
- `YYYYMMDDHHMMSS_description.sql` - Forward migration
- `rollback_YYYYMMDDHHMMSS_description.sql` - Rollback migration

### Current Migrations

1. **20250101000001_initial_schema.sql**
   - Creates all base tables
   - Sets up custom types and enums
   - Creates indexes for performance
   - Sets up database views
   - Creates triggers for timestamp updates

2. **20250101000002_rls_policies.sql**
   - Enables Row Level Security on all tables
   - Creates role-based access policies
   - Sets up helper functions for authorization
   - Creates user profile auto-creation trigger

3. **20250101000003_seed_data.sql**
   - Inserts basic seed data
   - Creates sample suppliers, materials, customers
   - Sets up pricing rules

### Migration Commands

```bash
# Run all pending migrations
npm run db:migrate up

# Check migration status
npm run db:migrate status

# Rollback last migration
npm run db:migrate rollback

# Reset all migrations
npm run db:migrate reset
```

## Seeding System

### Seed Data Types

1. **Basic Data** (`npm run db:seed basic`)
   - Essential configuration data
   - Pricing rules
   - Sample suppliers, materials, customers

2. **Development Data** (`npm run db:seed dev`)
   - Sample production batches
   - Test orders and invoices
   - Interaction logs and samples

3. **All Data** (`npm run db:seed all`)
   - Combines basic and development data

### Seeding Commands

```bash
# Seed basic data only
npm run db:seed basic

# Seed development data
npm run db:seed dev

# Seed all data
npm run db:seed all

# Clear all seeded data
npm run db:seed clear
```

## Database Schema

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

## Environment-Specific Setup

### Development Environment

```bash
npm run db:dev
```

This command:
1. Runs all migrations
2. Seeds basic configuration data
3. Seeds development test data
4. Verifies the setup

### Production Environment

```bash
npm run db:prod
```

This command:
1. Runs all migrations
2. Seeds only basic configuration data
3. Verifies the setup

### Staging Environment

Use the same as production but with staging environment variables.

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check environment variables
   - Verify Supabase project URL and keys
   - Ensure network connectivity

2. **Migration Failed**
   - Check SQL syntax in migration files
   - Verify dependencies between migrations
   - Check for conflicting data

3. **RLS Access Denied**
   - Ensure user is authenticated
   - Check user role assignments
   - Verify RLS policies are correct

4. **Seeding Failed**
   - Run migrations first
   - Check for data conflicts
   - Verify foreign key relationships

### Debug Commands

```bash
# Check detailed status
npm run db:status

# Verify all components
npm run db:verify

# Check migration history
npm run db:migrate status
```

### Manual Recovery

If automated scripts fail, you can manually execute SQL files:

```bash
# Connect to Supabase and run SQL directly
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

## Best Practices

### Migration Development

1. **Always create rollback migrations**
2. **Test migrations on development first**
3. **Keep migrations atomic and focused**
4. **Use descriptive migration names**
5. **Document complex migrations**

### Data Management

1. **Backup before major changes**
2. **Use transactions for complex operations**
3. **Validate data integrity after migrations**
4. **Keep seed data minimal and relevant**

### Security

1. **Use service role key only for admin operations**
2. **Test RLS policies thoroughly**
3. **Regularly audit user permissions**
4. **Monitor database access logs**

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Database Migration
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run db:migrate up
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Vercel Integration

Add environment variables in Vercel dashboard and use build hooks to trigger migrations.

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Verify environment configuration
4. Test with verification script
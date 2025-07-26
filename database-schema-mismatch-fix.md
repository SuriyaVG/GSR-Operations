# Database Schema Mismatch Fix

## Problem Identified

The application code expects a ghee manufacturing database schema with tables like:
- `production_batches`
- `customers` 
- `material_intake_log`
- `batch_inputs`
- `suppliers`
- `raw_materials`
- etc.

But the actual database has an e-commerce schema with tables like:
- `products`
- `product_variants`
- `orders`
- `order_items`
- `contacts`
- `users`

## Solutions

### Option 1: Create Missing Tables (Recommended)

Add the missing manufacturing tables to support the application:

```sql
-- Create missing tables for manufacturing functionality

-- Create user_profiles table for custom user data
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'viewer',
  name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create raw_materials table
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create material_intake_log table
CREATE TABLE material_intake_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  lot_number TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  intake_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE,
  quality_notes TEXT,
  remaining_quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create production_batches table
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  production_date TIMESTAMP WITH TIME ZONE NOT NULL,
  output_litres DECIMAL(10,2) NOT NULL,
  remaining_quantity DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active',
  quality_grade TEXT DEFAULT 'A',
  total_input_cost DECIMAL(10,2),
  cost_per_litre DECIMAL(10,2),
  yield_percentage DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create batch_inputs table
CREATE TABLE batch_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES production_batches(id),
  material_intake_id UUID NOT NULL REFERENCES material_intake_log(id),
  quantity_used DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table (rename existing orders table customer fields)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  channel TEXT DEFAULT 'direct',
  tier TEXT DEFAULT 'standard',
  credit_limit DECIMAL(10,2),
  payment_terms INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_ledger table
CREATE TABLE financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  reference_type TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  payment_terms INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_notes table
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  credit_note_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing orders table to reference customers
ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id);

-- Create views
CREATE OR REPLACE VIEW vw_batch_yield AS
SELECT 
  pb.id as batch_id,
  pb.batch_number,
  pb.production_date,
  pb.status,
  pb.output_litres,
  pb.total_input_cost,
  CASE 
    WHEN pb.output_litres IS NULL OR pb.output_litres = 0 THEN 0
    WHEN pb.total_input_cost IS NULL THEN 0
    ELSE ROUND(pb.total_input_cost / pb.output_litres, 4)
  END as cost_per_litre,
  CASE 
    WHEN pb.total_input_cost IS NULL OR pb.total_input_cost = 0 THEN 0
    WHEN pb.output_litres IS NULL OR pb.output_litres = 0 THEN 0
    ELSE ROUND((pb.output_litres / pb.total_input_cost) * 100, 2)
  END as yield_percentage,
  '[]'::json as material_breakdown,
  CASE 
    WHEN pb.output_litres IS NULL OR pb.output_litres = 0 THEN 0
    ELSE ROUND(pb.output_litres, 2)
  END as effective_output,
  'Good' as efficiency_rating
FROM production_batches pb;

CREATE OR REPLACE VIEW vw_customer_metrics AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.tier,
  c.channel,
  c.city,
  c.active,
  COALESCE(COUNT(o.id), 0) as total_orders,
  COALESCE(SUM(o.total), 0) as total_revenue,
  COALESCE(SUM(o.total), 0) as ltv,
  CASE 
    WHEN COUNT(o.id) > 0 THEN ROUND(COALESCE(SUM(o.total), 0) / COUNT(o.id), 2)
    ELSE 0
  END as aov,
  MAX(o.created_at) as last_order_date,
  MIN(o.created_at) as first_order_date,
  NULL as avg_days_between_orders,
  CASE 
    WHEN COUNT(o.id) = 1 AND MAX(o.created_at) IS NOT NULL THEN
      MAX(o.created_at) + INTERVAL '30 days'
    ELSE NULL
  END as predicted_reorder_date,
  CASE 
    WHEN MAX(o.created_at) IS NULL THEN 'never_ordered'
    WHEN MAX(o.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(o.created_at) > NOW() - INTERVAL '60 days' THEN 'recent'
    WHEN MAX(o.created_at) > NOW() - INTERVAL '90 days' THEN 'at_risk'
    ELSE 'inactive'
  END as activity_status,
  CASE 
    WHEN COUNT(o.id) = 0 THEN 'unknown'
    WHEN COUNT(o.id) = 1 THEN 'new_customer'
    ELSE 'medium'
  END as reorder_likelihood,
  CASE 
    WHEN COALESCE(SUM(o.total), 0) >= 50000 THEN 'high_value'
    WHEN COALESCE(SUM(o.total), 0) >= 20000 THEN 'medium_value'
    WHEN COALESCE(SUM(o.total), 0) >= 5000 THEN 'low_value'
    WHEN COALESCE(SUM(o.total), 0) > 0 THEN 'minimal_value'
    ELSE 'no_value'
  END as value_segment
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.tier, c.channel, c.city, c.active;
```

### Option 2: Modify Application Code

Update the application to work with the existing e-commerce schema by mapping the tables:
- `orders` → manufacturing orders
- `products` → raw materials
- `product_variants` → material variants
- `users` → user profiles

### Option 3: Hybrid Approach

Keep the existing e-commerce functionality and add manufacturing tables alongside it.

## Recommendation

Use **Option 1** - Create the missing manufacturing tables. This allows the application to work as designed while preserving your existing e-commerce data.
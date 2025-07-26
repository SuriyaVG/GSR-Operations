-- Initial Schema Migration for GSR Operations
-- This migration creates all base tables and sets up Row Level Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('admin', 'production', 'sales_manager', 'finance', 'viewer'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_tier') THEN CREATE TYPE customer_tier AS ENUM ('premium', 'wholesale', 'standard'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_channel') THEN CREATE TYPE customer_channel AS ENUM ('direct', 'distributor', 'online', 'retail'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'processing', 'completed', 'cancelled'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status') THEN CREATE TYPE batch_status AS ENUM ('active', 'completed', 'cancelled'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_grade') THEN CREATE TYPE quality_grade AS ENUM ('A', 'B', 'C'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_note_status') THEN CREATE TYPE credit_note_status AS ENUM ('draft', 'issued', 'applied'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN CREATE TYPE interaction_type AS ENUM ('call', 'email', 'whatsapp', 'meeting'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN CREATE TYPE return_status AS ENUM ('pending', 'approved', 'processed', 'rejected'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN CREATE TYPE transaction_type AS ENUM ('invoice', 'payment', 'credit_note', 'refund', 'adjustment'); END IF; END$$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reference_type') THEN CREATE TYPE reference_type AS ENUM ('invoice', 'payment', 'credit_note', 'order'); END IF; END$$;

-- Create user_profiles table for custom user data (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'viewer',
  name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
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
CREATE TABLE IF NOT EXISTS raw_materials (
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
CREATE TABLE IF NOT EXISTS material_intake_log (
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
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  production_date TIMESTAMP WITH TIME ZONE NOT NULL,
  output_litres DECIMAL(10,2) NOT NULL,
  remaining_quantity DECIMAL(10,2) NOT NULL,
  status batch_status DEFAULT 'active',
  quality_grade quality_grade DEFAULT 'A',
  total_input_cost DECIMAL(10,2),
  cost_per_litre DECIMAL(10,2),
  yield_percentage DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create batch_inputs table
CREATE TABLE IF NOT EXISTS batch_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES production_batches(id),
  material_intake_id UUID NOT NULL REFERENCES material_intake_log(id),
  quantity_used DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  channel customer_channel DEFAULT 'direct',
  tier customer_tier DEFAULT 'standard',
  credit_limit DECIMAL(10,2),
  payment_terms INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT NOT NULL UNIQUE,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status order_status DEFAULT 'draft',
  payment_status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  batch_id UUID NOT NULL REFERENCES production_batches(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  packaging_type TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pricing_rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_tier customer_tier NOT NULL,
  product_category TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  margin_percentage DECIMAL(5,2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interaction_log table
CREATE TABLE IF NOT EXISTS interaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  interaction_type interaction_type NOT NULL,
  description TEXT NOT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create samples_log table
CREATE TABLE IF NOT EXISTS samples_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  sample_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  sent_date TIMESTAMP WITH TIME ZONE NOT NULL,
  feedback TEXT,
  converted_to_order BOOLEAN DEFAULT FALSE,
  conversion_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create returns_log table
CREATE TABLE IF NOT EXISTS returns_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  return_reason TEXT NOT NULL,
  quantity_returned INTEGER NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  processed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status return_status DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  payment_terms INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  credit_note_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status credit_note_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_ledger table
CREATE TABLE IF NOT EXISTS financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type transaction_type NOT NULL,
  reference_id UUID NOT NULL,
  reference_type reference_type NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_suppliers_active ON suppliers(active);
CREATE INDEX idx_raw_materials_active ON raw_materials(active);
CREATE INDEX idx_material_intake_supplier ON material_intake_log(supplier_id);
CREATE INDEX idx_material_intake_raw_material ON material_intake_log(raw_material_id);
CREATE INDEX idx_material_intake_date ON material_intake_log(intake_date DESC);
CREATE INDEX idx_production_batches_date ON production_batches(production_date DESC);
CREATE INDEX idx_production_batches_status ON production_batches(status);
CREATE INDEX idx_batch_inputs_batch ON batch_inputs(batch_id);
CREATE INDEX idx_batch_inputs_material ON batch_inputs(material_intake_id);
CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_channel ON customers(channel);
CREATE INDEX idx_customers_active ON customers(active);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_batch ON order_items(batch_id);
CREATE INDEX idx_pricing_rules_tier_category ON pricing_rules(customer_tier, product_category);
CREATE INDEX idx_pricing_rules_effective_dates ON pricing_rules(effective_from, effective_to);
CREATE INDEX idx_interaction_log_customer ON interaction_log(customer_id);
CREATE INDEX idx_interaction_log_created_at ON interaction_log(created_at DESC);
CREATE INDEX idx_samples_log_customer ON samples_log(customer_id);
CREATE INDEX idx_samples_log_sent_date ON samples_log(sent_date DESC);
CREATE INDEX idx_returns_log_customer ON returns_log(customer_id);
CREATE INDEX idx_returns_log_order ON returns_log(order_id);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE INDEX idx_financial_ledger_customer ON financial_ledger(customer_id);
CREATE INDEX idx_financial_ledger_date ON financial_ledger(transaction_date DESC);
CREATE INDEX idx_financial_ledger_reference ON financial_ledger(reference_id, reference_type);

-- Create database views
CREATE OR REPLACE VIEW vw_batch_yield AS
SELECT 
  pb.id as batch_id,
  pb.batch_number,
  pb.total_input_cost,
  pb.output_litres,
  pb.cost_per_litre,
  pb.yield_percentage,
  pb.production_date,
  pb.status,
  COALESCE(
    json_agg(
      json_build_object(
        'material_name', rm.name,
        'quantity_used', bi.quantity_used,
        'cost_per_unit', mil.cost_per_unit,
        'total_cost', bi.quantity_used * mil.cost_per_unit,
        'lot_number', mil.lot_number
      )
    ) FILTER (WHERE bi.id IS NOT NULL), 
    '[]'::json
  ) as material_breakdown
FROM production_batches pb
LEFT JOIN batch_inputs bi ON pb.id = bi.batch_id
LEFT JOIN material_intake_log mil ON bi.material_intake_id = mil.id
LEFT JOIN raw_materials rm ON mil.raw_material_id = rm.id
GROUP BY pb.id, pb.batch_number, pb.total_input_cost, pb.output_litres, pb.cost_per_litre, pb.yield_percentage, pb.production_date, pb.status;

CREATE OR REPLACE VIEW vw_invoice_aging AS
SELECT 
  i.id as invoice_id,
  c.name as customer_name,
  c.id as customer_id,
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
  END as aging_bucket,
  i.status,
  o.order_number
FROM invoices i
JOIN orders o ON i.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE i.status != 'cancelled';

CREATE OR REPLACE VIEW vw_customer_metrics AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.tier,
  c.channel,
  c.city,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(SUM(o.total_amount), 0) as ltv,
  CASE 
    WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
    ELSE 0
  END as aov,
  MAX(o.order_date) as last_order_date,
  MIN(o.order_date) as first_order_date,
  CASE 
    WHEN COUNT(o.id) > 1 THEN 
      EXTRACT(DAY FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1)
    ELSE NULL
  END as avg_days_between_orders,
  CASE 
    WHEN COUNT(o.id) > 1 AND MAX(o.order_date) IS NOT NULL THEN 
      MAX(o.order_date) + INTERVAL '1 day' * (EXTRACT(DAY FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1))
    ELSE NULL
  END as predicted_reorder_date,
  -- Customer activity status
  CASE 
    WHEN MAX(o.order_date) IS NULL THEN 'inactive'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '90 days' THEN 'at_risk'
    ELSE 'inactive'
  END as activity_status
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.tier, c.channel, c.city;

-- Create trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_material_intake_log_updated_at BEFORE UPDATE ON material_intake_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_inputs_updated_at BEFORE UPDATE ON batch_inputs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interaction_log_updated_at BEFORE UPDATE ON interaction_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_samples_log_updated_at BEFORE UPDATE ON samples_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_log_updated_at BEFORE UPDATE ON returns_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_ledger_updated_at BEFORE UPDATE ON financial_ledger FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Migration: Create new tables and views for audit remediation
-- File: database/migrations/001_audit_remediation.sql

-- Create pricing rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
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
CREATE TABLE IF NOT EXISTS interaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'whatsapp', 'meeting')),
  description TEXT NOT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create samples log table
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

-- Create returns log table
CREATE TABLE IF NOT EXISTS returns_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  return_reason TEXT NOT NULL,
  quantity_returned INTEGER NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  processed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add channel field to customers table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'channel') THEN
    ALTER TABLE customers ADD COLUMN channel TEXT DEFAULT 'direct' CHECK (channel IN ('direct', 'distributor', 'online', 'retail'));
  END IF;
END $$;

-- Create invoices table (if not exists)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_terms INTEGER NOT NULL DEFAULT 30, -- days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit notes table (if not exists)
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  credit_note_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'applied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tier_category ON pricing_rules(customer_tier, product_category);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_effective_dates ON pricing_rules(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_interaction_log_customer ON interaction_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_interaction_log_created_at ON interaction_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_samples_log_customer ON samples_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_samples_log_sent_date ON samples_log(sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_log_customer ON returns_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_log_order ON returns_log(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);

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

-- Insert default pricing rules data
INSERT INTO pricing_rules (customer_tier, product_category, min_quantity, unit_price, margin_percentage, effective_from) VALUES
  ('premium', 'ghee', 1, 650.00, 35.00, NOW()),
  ('premium', 'ghee', 5, 620.00, 32.00, NOW()),
  ('premium', 'ghee', 10, 590.00, 28.00, NOW()),
  ('wholesale', 'ghee', 1, 580.00, 25.00, NOW()),
  ('wholesale', 'ghee', 10, 550.00, 22.00, NOW()),
  ('wholesale', 'ghee', 25, 520.00, 18.00, NOW()),
  ('standard', 'ghee', 1, 600.00, 30.00, NOW()),
  ('standard', 'ghee', 5, 580.00, 27.00, NOW()),
  ('standard', 'ghee', 10, 560.00, 24.00, NOW())
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interaction_log_updated_at BEFORE UPDATE ON interaction_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_samples_log_updated_at BEFORE UPDATE ON samples_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_log_updated_at BEFORE UPDATE ON returns_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
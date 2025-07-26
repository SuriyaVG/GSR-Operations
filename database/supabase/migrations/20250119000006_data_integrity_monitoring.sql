-- Create data integrity monitoring tables and functions
-- This migration adds support for tracking and monitoring data integrity issues

-- Create data integrity issues table
CREATE TABLE IF NOT EXISTS data_integrity_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add RLS policies for data integrity issues
ALTER TABLE data_integrity_issues ENABLE ROW LEVEL SECURITY;

-- Only admins can insert, update, or delete issues
CREATE POLICY data_integrity_issues_admin_all ON data_integrity_issues
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- All authenticated users can view issues
CREATE POLICY data_integrity_issues_view ON data_integrity_issues
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to check for orphaned orders
CREATE OR REPLACE FUNCTION check_orphaned_orders()
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  customer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.order_number, o.customer_id, o.created_at
  FROM orders o
  WHERE NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.order_id = o.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check for orphaned invoices
CREATE OR REPLACE FUNCTION check_orphaned_invoices()
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.invoice_number, i.order_id, i.created_at
  FROM invoices i
  WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = i.order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check for orphaned production batches
CREATE OR REPLACE FUNCTION check_orphaned_production_batches()
RETURNS TABLE (
  batch_id UUID,
  batch_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT pb.id, pb.batch_number, pb.created_at
  FROM production_batches pb
  WHERE NOT EXISTS (
    SELECT 1 FROM batch_inputs bi WHERE bi.batch_id = pb.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check for negative inventory
CREATE OR REPLACE FUNCTION check_negative_inventory()
RETURNS TABLE (
  material_id UUID,
  raw_material_id UUID,
  lot_number TEXT,
  remaining_quantity DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT mil.id, mil.raw_material_id, mil.lot_number, mil.remaining_quantity
  FROM material_intake_log mil
  WHERE mil.remaining_quantity < 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check for financial ledger inconsistencies
CREATE OR REPLACE FUNCTION check_financial_ledger_inconsistencies()
RETURNS TABLE (
  issue_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  description TEXT
) AS $$
DECLARE
  orphaned_entry RECORD;
  missing_entry RECORD;
BEGIN
  -- Check for orphaned ledger entries (referencing non-existent invoices)
  FOR orphaned_entry IN
    SELECT fl.id, fl.reference_id, fl.transaction_type
    FROM financial_ledger fl
    WHERE fl.reference_type = 'invoice'
    AND NOT EXISTS (
      SELECT 1 FROM invoices i WHERE i.id = fl.reference_id::UUID
    )
  LOOP
    issue_type := 'orphaned_ledger_entry';
    entity_type := 'financial_ledger';
    entity_id := orphaned_entry.id;
    description := 'Financial ledger entry references non-existent invoice ' || orphaned_entry.reference_id;
    RETURN NEXT;
  END LOOP;
  
  -- Check for invoices without ledger entries
  FOR missing_entry IN
    SELECT i.id, i.invoice_number
    FROM invoices i
    WHERE NOT EXISTS (
      SELECT 1 FROM financial_ledger fl 
      WHERE fl.reference_type = 'invoice' 
      AND fl.reference_id::UUID = i.id
    )
  LOOP
    issue_type := 'invoice_without_ledger';
    entity_type := 'invoice';
    entity_id := missing_entry.id;
    description := 'Invoice ' || missing_entry.invoice_number || ' has no financial ledger entry';
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comprehensive data integrity check function
CREATE OR REPLACE FUNCTION run_data_integrity_checks()
RETURNS TABLE (
  issue_type TEXT,
  description TEXT,
  severity TEXT,
  entity_type TEXT,
  entity_id TEXT
) AS $$
DECLARE
  orphaned_order RECORD;
  orphaned_invoice RECORD;
  orphaned_batch RECORD;
  negative_inv RECORD;
  ledger_issue RECORD;
BEGIN
  -- Check for orphaned orders
  FOR orphaned_order IN SELECT * FROM check_orphaned_orders()
  LOOP
    issue_type := 'orphaned_order';
    description := 'Order ' || orphaned_order.order_number || ' has no associated invoice';
    severity := 'high';
    entity_type := 'order';
    entity_id := orphaned_order.order_id::TEXT;
    RETURN NEXT;
  END LOOP;
  
  -- Check for orphaned invoices
  FOR orphaned_invoice IN SELECT * FROM check_orphaned_invoices()
  LOOP
    issue_type := 'orphaned_invoice';
    description := 'Invoice ' || orphaned_invoice.invoice_number || ' references non-existent order ' || orphaned_invoice.order_id;
    severity := 'critical';
    entity_type := 'invoice';
    entity_id := orphaned_invoice.invoice_id::TEXT;
    RETURN NEXT;
  END LOOP;
  
  -- Check for orphaned production batches
  FOR orphaned_batch IN SELECT * FROM check_orphaned_production_batches()
  LOOP
    issue_type := 'orphaned_production_batch';
    description := 'Production batch ' || orphaned_batch.batch_number || ' has no inputs';
    severity := 'medium';
    entity_type := 'production_batch';
    entity_id := orphaned_batch.batch_id::TEXT;
    RETURN NEXT;
  END LOOP;
  
  -- Check for negative inventory
  FOR negative_inv IN SELECT * FROM check_negative_inventory()
  LOOP
    issue_type := 'negative_inventory';
    description := 'Material ' || negative_inv.raw_material_id || ' lot ' || negative_inv.lot_number || ' has negative quantity: ' || negative_inv.remaining_quantity;
    severity := 'critical';
    entity_type := 'material_intake_log';
    entity_id := negative_inv.material_id::TEXT;
    RETURN NEXT;
  END LOOP;
  
  -- Check for financial ledger inconsistencies
  FOR ledger_issue IN SELECT * FROM check_financial_ledger_inconsistencies()
  LOOP
    issue_type := ledger_issue.issue_type;
    description := ledger_issue.description;
    
    IF ledger_issue.issue_type = 'orphaned_ledger_entry' THEN
      severity := 'high';
    ELSE
      severity := 'medium';
    END IF;
    
    entity_type := ledger_issue.entity_type;
    entity_id := ledger_issue.entity_id::TEXT;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data integrity alerts table
CREATE TABLE IF NOT EXISTS data_integrity_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create system notifications table for alerts
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies for alerts
ALTER TABLE data_integrity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage alerts
CREATE POLICY data_integrity_alerts_admin_all ON data_integrity_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- All authenticated users can view alerts
CREATE POLICY data_integrity_alerts_view ON data_integrity_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can view notifications targeted to their role
CREATE POLICY system_notifications_view ON system_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY(target_roles)
    )
  );

-- Create function to check inventory discrepancies
CREATE OR REPLACE FUNCTION check_inventory_discrepancies()
RETURNS TABLE (
  material_id UUID,
  material_name TEXT,
  recorded_quantity DECIMAL(10,2),
  calculated_quantity DECIMAL(10,2),
  discrepancy DECIMAL(10,2)
) AS $
DECLARE
  material_record RECORD;
  total_intake DECIMAL(10,2);
  total_used DECIMAL(10,2);
  calculated_remaining DECIMAL(10,2);
BEGIN
  FOR material_record IN
    SELECT 
      mil.id,
      rm.name,
      mil.remaining_quantity,
      mil.quantity as original_quantity
    FROM material_intake_log mil
    JOIN raw_materials rm ON mil.raw_material_id = rm.id
    WHERE mil.remaining_quantity > 0
  LOOP
    -- Calculate total used from batch inputs
    SELECT COALESCE(SUM(bi.quantity_used), 0) INTO total_used
    FROM batch_inputs bi
    WHERE bi.material_intake_id = material_record.id;
    
    -- Calculate what should remain
    calculated_remaining := material_record.original_quantity - total_used;
    
    -- Check for significant discrepancy (more than 1% or 1 unit)
    IF ABS(material_record.remaining_quantity - calculated_remaining) > GREATEST(material_record.original_quantity * 0.01, 1) THEN
      material_id := material_record.id;
      material_name := material_record.name;
      recorded_quantity := material_record.remaining_quantity;
      calculated_quantity := calculated_remaining;
      discrepancy := material_record.remaining_quantity - calculated_remaining;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_orphaned_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION check_orphaned_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION check_orphaned_production_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION check_negative_inventory() TO authenticated;
GRANT EXECUTE ON FUNCTION check_financial_ledger_inconsistencies() TO authenticated;
GRANT EXECUTE ON FUNCTION run_data_integrity_checks() TO authenticated;
GRANT EXECUTE ON FUNCTION check_inventory_discrepancies() TO authenticated;

-- Create trigger function to log data integrity issues
CREATE OR REPLACE FUNCTION log_data_integrity_issue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO data_integrity_issues (
    issue_type,
    description,
    severity,
    entity_type,
    entity_id,
    detected_at
  ) VALUES (
    NEW.issue_type,
    NEW.description,
    NEW.severity,
    NEW.entity_type,
    NEW.entity_id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
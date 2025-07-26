-- Fix Database View Logic Correction
-- This migration fixes vw_batch_yield and vw_customer_metrics views with proper calculations

-- Drop existing views to recreate them
DROP VIEW IF EXISTS vw_batch_yield;
DROP VIEW IF EXISTS vw_customer_metrics;

-- Fix vw_batch_yield with proper calculated fields
CREATE OR REPLACE VIEW vw_batch_yield AS
SELECT 
  pb.id as batch_id,
  pb.batch_number,
  pb.production_date,
  pb.status,
  pb.output_litres,
  pb.total_input_cost,
  -- Calculate cost_per_litre within the view with proper NULL and division by zero handling
  CASE 
    WHEN pb.output_litres IS NULL OR pb.output_litres = 0 THEN 0
    WHEN pb.total_input_cost IS NULL THEN 0
    ELSE ROUND(pb.total_input_cost / pb.output_litres, 4)
  END as cost_per_litre,
  -- Calculate yield_percentage within the view with proper error handling
  CASE 
    WHEN pb.total_input_cost IS NULL OR pb.total_input_cost = 0 THEN 0
    WHEN pb.output_litres IS NULL OR pb.output_litres = 0 THEN 0
    ELSE ROUND(
      (pb.output_litres * COALESCE(
        (SELECT AVG(mil.cost_per_unit) 
         FROM batch_inputs bi2 
         JOIN material_intake_log mil ON bi2.material_intake_id = mil.id 
         WHERE bi2.batch_id = pb.id), 
        pb.total_input_cost / pb.output_litres
      ) / pb.total_input_cost) * 100, 
      2
    )
  END as yield_percentage,
  -- Calculate total material cost from actual inputs
  COALESCE(
    (SELECT SUM(bi.quantity_used * mil.cost_per_unit)
     FROM batch_inputs bi
     JOIN material_intake_log mil ON bi.material_intake_id = mil.id
     WHERE bi.batch_id = pb.id),
    pb.total_input_cost,
    0
  ) as calculated_input_cost,
  -- Material breakdown with proper aggregation and NULL handling
  COALESCE(
    json_agg(
      json_build_object(
        'material_name', COALESCE(rm.name, 'Unknown Material'),
        'quantity_used', COALESCE(bi.quantity_used, 0),
        'cost_per_unit', COALESCE(mil.cost_per_unit, 0),
        'total_cost', COALESCE(bi.quantity_used * mil.cost_per_unit, 0),
        'lot_number', COALESCE(mil.lot_number, 'N/A'),
        'percentage_of_batch', 
          CASE 
            WHEN pb.total_input_cost IS NULL OR pb.total_input_cost = 0 THEN 0
            ELSE ROUND((COALESCE(bi.quantity_used * mil.cost_per_unit, 0) / pb.total_input_cost) * 100, 2)
          END
      ) ORDER BY bi.quantity_used DESC
    ) FILTER (WHERE bi.id IS NOT NULL), 
    '[]'::json
  ) as material_breakdown,
  -- Additional calculated metrics
  CASE 
    WHEN pb.output_litres IS NULL OR pb.output_litres = 0 THEN 0
    ELSE ROUND(pb.output_litres, 2)
  END as effective_output,
  -- Efficiency rating based on yield
  CASE 
    WHEN pb.total_input_cost IS NULL OR pb.total_input_cost = 0 OR pb.output_litres IS NULL OR pb.output_litres = 0 THEN 'Unknown'
    WHEN (pb.output_litres * COALESCE(
      (SELECT AVG(mil.cost_per_unit) 
       FROM batch_inputs bi2 
       JOIN material_intake_log mil ON bi2.material_intake_id = mil.id 
       WHERE bi2.batch_id = pb.id), 
      pb.total_input_cost / pb.output_litres
    ) / pb.total_input_cost) * 100 >= 85 THEN 'Excellent'
    WHEN (pb.output_litres * COALESCE(
      (SELECT AVG(mil.cost_per_unit) 
       FROM batch_inputs bi2 
       JOIN material_intake_log mil ON bi2.material_intake_id = mil.id 
       WHERE bi2.batch_id = pb.id), 
      pb.total_input_cost / pb.output_litres
    ) / pb.total_input_cost) * 100 >= 75 THEN 'Good'
    WHEN (pb.output_litres * COALESCE(
      (SELECT AVG(mil.cost_per_unit) 
       FROM batch_inputs bi2 
       JOIN material_intake_log mil ON bi2.material_intake_id = mil.id 
       WHERE bi2.batch_id = pb.id), 
      pb.total_input_cost / pb.output_litres
    ) / pb.total_input_cost) * 100 >= 60 THEN 'Fair'
    ELSE 'Poor'
  END as efficiency_rating
FROM production_batches pb
LEFT JOIN batch_inputs bi ON pb.id = bi.batch_id
LEFT JOIN material_intake_log mil ON bi.material_intake_id = mil.id
LEFT JOIN raw_materials rm ON mil.raw_material_id = rm.id
GROUP BY pb.id, pb.batch_number, pb.production_date, pb.status, pb.output_litres, pb.total_input_cost;

-- Fix vw_customer_metrics with simplified reorder prediction algorithm
CREATE OR REPLACE VIEW vw_customer_metrics AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.tier,
  c.channel,
  c.city,
  c.active,
  -- Order statistics with NULL handling
  COALESCE(COUNT(o.id), 0) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(SUM(o.total_amount), 0) as ltv,
  -- Average Order Value with proper division by zero handling
  CASE 
    WHEN COUNT(o.id) > 0 THEN ROUND(COALESCE(SUM(o.total_amount), 0) / COUNT(o.id), 2)
    ELSE 0
  END as aov,
  -- Date tracking
  MAX(o.order_date) as last_order_date,
  MIN(o.order_date) as first_order_date,
  -- Simplified average days between orders calculation
  CASE 
    WHEN COUNT(o.id) > 1 AND MAX(o.order_date) IS NOT NULL AND MIN(o.order_date) IS NOT NULL THEN 
      ROUND(EXTRACT(EPOCH FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1) / 86400, 0)
    ELSE NULL
  END as avg_days_between_orders,
  -- Simplified reorder prediction with proper NULL handling
  CASE 
    WHEN COUNT(o.id) > 1 AND MAX(o.order_date) IS NOT NULL AND MIN(o.order_date) IS NOT NULL THEN 
      MAX(o.order_date) + (INTERVAL '1 day' * 
        ROUND(EXTRACT(EPOCH FROM (MAX(o.order_date) - MIN(o.order_date))) / (COUNT(o.id) - 1) / 86400, 0))
    WHEN COUNT(o.id) = 1 AND MAX(o.order_date) IS NOT NULL THEN
      -- For single orders, predict based on average customer behavior (30 days default)
      MAX(o.order_date) + INTERVAL '30 days'
    ELSE NULL
  END as predicted_reorder_date,
  -- Days since last order
  CASE 
    WHEN MAX(o.order_date) IS NOT NULL THEN 
      EXTRACT(DAY FROM NOW() - MAX(o.order_date))
    ELSE NULL
  END as days_since_last_order,
  -- Customer activity status with improved logic
  CASE 
    WHEN MAX(o.order_date) IS NULL THEN 'never_ordered'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '60 days' THEN 'recent'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '90 days' THEN 'at_risk'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '180 days' THEN 'dormant'
    ELSE 'inactive'
  END as activity_status,
  -- Reorder likelihood based on pattern analysis
  CASE 
    WHEN COUNT(o.id) = 0 THEN 'unknown'
    WHEN COUNT(o.id) = 1 THEN 'new_customer'
    WHEN COUNT(o.id) > 1 AND MAX(o.order_date) > NOW() - INTERVAL '30 days' THEN 'high'
    WHEN COUNT(o.id) > 1 AND MAX(o.order_date) > NOW() - INTERVAL '60 days' THEN 'medium'
    WHEN COUNT(o.id) > 1 AND MAX(o.order_date) > NOW() - INTERVAL '90 days' THEN 'low'
    ELSE 'very_low'
  END as reorder_likelihood,
  -- Customer value segment
  CASE 
    WHEN COALESCE(SUM(o.total_amount), 0) >= 50000 THEN 'high_value'
    WHEN COALESCE(SUM(o.total_amount), 0) >= 20000 THEN 'medium_value'
    WHEN COALESCE(SUM(o.total_amount), 0) >= 5000 THEN 'low_value'
    WHEN COALESCE(SUM(o.total_amount), 0) > 0 THEN 'minimal_value'
    ELSE 'no_value'
  END as value_segment
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.status NOT IN ('cancelled', 'draft')
GROUP BY c.id, c.name, c.tier, c.channel, c.city, c.active;

-- Create indexes for improved view performance
CREATE INDEX IF NOT EXISTS idx_batch_inputs_batch_material ON batch_inputs(batch_id, material_intake_id);
CREATE INDEX IF NOT EXISTS idx_material_intake_cost ON material_intake_log(cost_per_unit);
CREATE INDEX IF NOT EXISTS idx_production_batches_cost_output ON production_batches(total_input_cost, output_litres);
CREATE INDEX IF NOT EXISTS idx_orders_customer_status_date ON orders(customer_id, status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_active_tier ON customers(active, tier);

-- Add comments for documentation
COMMENT ON VIEW vw_batch_yield IS 'Production batch yield analysis with calculated cost per litre and yield percentage. Includes material breakdown and efficiency ratings.';
COMMENT ON VIEW vw_customer_metrics IS 'Customer analytics with simplified reorder prediction algorithm and comprehensive customer segmentation.';
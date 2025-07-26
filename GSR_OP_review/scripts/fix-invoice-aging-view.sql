-- Fix vw_invoice_aging view with correct table relationships

-- Create vw_customer_metrics view (this one should work)
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
  -- Customer activity status with improved logic
  CASE
    WHEN MAX(o.order_date) IS NULL THEN 'never_ordered'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '60 days' THEN 'recent'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '90 days' THEN 'at_risk'
    WHEN MAX(o.order_date) > NOW() - INTERVAL '180 days' THEN 'dormant'
    ELSE 'inactive'
  END as activity_status,
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
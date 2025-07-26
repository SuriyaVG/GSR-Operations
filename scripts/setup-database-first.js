#!/usr/bin/env node

/**
 * Setup Database First
 * Ensures the database is properly set up before applying view fixes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🔧 Setting up database...\n');

  try {
    // Check if production_batches table exists
    console.log('📋 Checking if production_batches table exists...');
    
    const { data, error } = await supabase
      .from('production_batches')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('❌ production_batches table does not exist');
      console.log('🔧 You need to run the initial database setup first');
      console.log('\nRun one of these commands:');
      console.log('  node scripts/migrate-supabase.js up');
      console.log('  node scripts/supabase-setup-manual.js');
      console.log('\nOr apply the initial schema manually in Supabase SQL editor:');
      console.log('  Copy content from: database/supabase/migrations/20250101000001_initial_schema.sql');
      return false;
    } else if (error) {
      console.error('❌ Error checking production_batches table:', error);
      return false;
    } else {
      console.log('✅ production_batches table exists');
      return true;
    }
  } catch (error) {
    console.error('💥 Failed to check database setup:', error);
    return false;
  }
}

async function applyViewFixes() {
  console.log('\n🔧 Applying view fixes...');
  
  // Since we can't execute SQL directly, provide instructions
  console.log('\n📋 To fix the database views, execute this SQL in your Supabase SQL editor:');
  console.log('\n```sql');
  
  const viewFixSQL = `-- Fix vw_batch_yield view
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
  -- Material breakdown with proper aggregation and NULL handling
  COALESCE(
    json_agg(
      json_build_object(
        'material_name', COALESCE(rm.name, 'Unknown Material'),
        'quantity_used', COALESCE(bi.quantity_used, 0),
        'cost_per_unit', COALESCE(mil.cost_per_unit, 0),
        'total_cost', COALESCE(bi.quantity_used * mil.cost_per_unit, 0),
        'lot_number', COALESCE(mil.lot_number, 'N/A')
      ) ORDER BY bi.quantity_used DESC
    ) FILTER (WHERE bi.id IS NOT NULL), 
    '[]'::json
  ) as material_breakdown,
  -- Efficiency rating based on yield
  CASE 
    WHEN pb.total_input_cost IS NULL OR pb.total_input_cost = 0 OR pb.output_litres IS NULL OR pb.output_litres = 0 THEN 'Unknown'
    WHEN (pb.output_litres / pb.total_input_cost) >= 0.85 THEN 'Excellent'
    WHEN (pb.output_litres / pb.total_input_cost) >= 0.75 THEN 'Good'
    WHEN (pb.output_litres / pb.total_input_cost) >= 0.60 THEN 'Fair'
    ELSE 'Poor'
  END as efficiency_rating
FROM production_batches pb
LEFT JOIN batch_inputs bi ON pb.id = bi.batch_id
LEFT JOIN material_intake_log mil ON bi.material_intake_id = mil.id
LEFT JOIN raw_materials rm ON mil.raw_material_id = rm.id
GROUP BY pb.id, pb.batch_number, pb.production_date, pb.status, pb.output_litres, pb.total_input_cost;

-- Fix vw_customer_metrics view
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
GROUP BY c.id, c.name, c.tier, c.channel, c.city, c.active;`;

  console.log(viewFixSQL);
  console.log('```\n');
}

// Run the script
setupDatabase().then(async (isSetup) => {
  if (isSetup) {
    console.log('✅ Database is properly set up');
    await applyViewFixes();
  }
  console.log('\n✨ Setup check completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
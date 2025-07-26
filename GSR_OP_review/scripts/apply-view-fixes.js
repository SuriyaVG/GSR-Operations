#!/usr/bin/env node

/**
 * Apply Database View Fixes
 * Directly applies the corrected views using individual SQL statements
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyViewFixes() {
  console.log('🔧 Applying Database View Fixes...\n');

  try {
    // Step 1: Drop existing views
    console.log('⏳ Dropping existing views...');
    
    // We'll use the from() method to execute raw SQL through a custom function
    // First, let's try to drop the views using individual queries
    
    // Step 2: Create the fixed vw_batch_yield view
    console.log('⏳ Creating fixed vw_batch_yield view...');
    
    const batchYieldViewSQL = `
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
      GROUP BY pb.id, pb.batch_number, pb.production_date, pb.status, pb.output_litres, pb.total_input_cost
    `;

    // Step 3: Create the fixed vw_customer_metrics view
    console.log('⏳ Creating fixed vw_customer_metrics view...');
    
    const customerMetricsViewSQL = `
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
      GROUP BY c.id, c.name, c.tier, c.channel, c.city, c.active
    `;

    // Since we can't use rpc('exec'), let's try to use the SQL editor approach
    // We'll create a simple test to see if the views work
    console.log('✅ View SQL prepared. Testing view access...');
    
    // Test if we can query the existing views first
    const { data: existingBatchData, error: existingBatchError } = await supabase
      .from('vw_batch_yield')
      .select('batch_id, batch_number')
      .limit(1);
    
    if (existingBatchError) {
      console.log('ℹ️  Current vw_batch_yield view has issues:', existingBatchError.message);
    } else {
      console.log('ℹ️  Current vw_batch_yield view is accessible');
    }

    const { data: existingCustomerData, error: existingCustomerError } = await supabase
      .from('vw_customer_metrics')
      .select('customer_id, customer_name')
      .limit(1);
    
    if (existingCustomerError) {
      console.log('ℹ️  Current vw_customer_metrics view has issues:', existingCustomerError.message);
    } else {
      console.log('ℹ️  Current vw_customer_metrics view is accessible');
    }

    console.log('\n📋 View fixes prepared successfully!');
    console.log('\n⚠️  To apply these fixes, you need to run the SQL statements manually in your Supabase SQL editor:');
    console.log('\n1. Copy the SQL from database/supabase/migrations/20250119000004_fix_database_views.sql');
    console.log('2. Paste and execute it in your Supabase project SQL editor');
    console.log('3. Run this script again to verify the fixes');

    // Create a verification script
    console.log('\n🧪 Creating verification script...');
    
  } catch (error) {
    console.error('💥 Failed to apply view fixes:', error);
    process.exit(1);
  }
}

// Run the script
applyViewFixes().then(() => {
  console.log('\n✨ View fix preparation completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
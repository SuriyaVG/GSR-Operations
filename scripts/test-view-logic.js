#!/usr/bin/env node

/**
 * Test Database View Logic
 * Tests the current views and identifies calculation issues
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

async function testViewLogic() {
  console.log('🧪 Testing Database View Logic...\n');

  try {
    // Test vw_batch_yield
    console.log('📊 Testing vw_batch_yield view...');
    
    const { data: batchYieldData, error: batchYieldError } = await supabase
      .from('vw_batch_yield')
      .select('*')
      .limit(5);
    
    if (batchYieldError) {
      console.error('❌ Error querying vw_batch_yield:', batchYieldError);
    } else {
      console.log(`✅ Found ${batchYieldData.length} batch yield records`);
      
      if (batchYieldData.length > 0) {
        console.log('\n📋 Sample batch yield data:');
        batchYieldData.forEach((batch, index) => {
          console.log(`\n  Batch ${index + 1}:`);
          console.log(`    Batch Number: ${batch.batch_number}`);
          console.log(`    Total Input Cost: ${batch.total_input_cost}`);
          console.log(`    Output Litres: ${batch.output_litres}`);
          console.log(`    Cost Per Litre (stored): ${batch.cost_per_litre}`);
          console.log(`    Yield Percentage (stored): ${batch.yield_percentage}`);
          
          // Calculate what the values should be
          const calculatedCostPerLitre = batch.output_litres > 0 ? 
            (batch.total_input_cost / batch.output_litres).toFixed(4) : 0;
          
          console.log(`    Cost Per Litre (calculated): ${calculatedCostPerLitre}`);
          
          // Check if stored values match calculated values
          const costMatch = Math.abs(batch.cost_per_litre - calculatedCostPerLitre) < 0.01;
          console.log(`    Cost calculation match: ${costMatch ? '✅' : '❌'}`);
          
          if (batch.material_breakdown && Array.isArray(batch.material_breakdown)) {
            console.log(`    Material breakdown items: ${batch.material_breakdown.length}`);
          }
        });
      }
    }

    // Test vw_customer_metrics
    console.log('\n\n📊 Testing vw_customer_metrics view...');
    
    const { data: customerMetricsData, error: customerMetricsError } = await supabase
      .from('vw_customer_metrics')
      .select('*')
      .limit(5);
    
    if (customerMetricsError) {
      console.error('❌ Error querying vw_customer_metrics:', customerMetricsError);
    } else {
      console.log(`✅ Found ${customerMetricsData.length} customer metrics records`);
      
      if (customerMetricsData.length > 0) {
        console.log('\n📋 Sample customer metrics data:');
        customerMetricsData.forEach((customer, index) => {
          console.log(`\n  Customer ${index + 1}:`);
          console.log(`    Name: ${customer.customer_name}`);
          console.log(`    Total Orders: ${customer.total_orders}`);
          console.log(`    Total Revenue: ${customer.total_revenue}`);
          console.log(`    AOV: ${customer.aov}`);
          console.log(`    Last Order Date: ${customer.last_order_date}`);
          console.log(`    Avg Days Between Orders: ${customer.avg_days_between_orders}`);
          console.log(`    Predicted Reorder Date: ${customer.predicted_reorder_date}`);
          console.log(`    Activity Status: ${customer.activity_status}`);
          
          // Check for edge cases
          if (customer.total_orders === 1) {
            console.log(`    ⚠️  Single order customer - reorder prediction may be inaccurate`);
          }
          
          if (customer.avg_days_between_orders === null && customer.total_orders > 1) {
            console.log(`    ❌ NULL avg_days_between_orders for multi-order customer`);
          }
        });
      }
    }

    // Test for specific edge cases
    console.log('\n\n🔍 Testing edge cases...');
    
    // Look for batches with zero output or cost
    const { data: edgeBatches, error: edgeBatchError } = await supabase
      .from('vw_batch_yield')
      .select('batch_number, total_input_cost, output_litres, cost_per_litre, yield_percentage')
      .or('output_litres.eq.0,total_input_cost.eq.0,cost_per_litre.is.null,yield_percentage.is.null');
    
    if (edgeBatchError) {
      console.error('❌ Error querying edge case batches:', edgeBatchError);
    } else if (edgeBatches.length > 0) {
      console.log(`⚠️  Found ${edgeBatches.length} batches with edge case values:`);
      edgeBatches.forEach(batch => {
        console.log(`    ${batch.batch_number}: cost=${batch.total_input_cost}, output=${batch.output_litres}, cost_per_litre=${batch.cost_per_litre}`);
      });
    } else {
      console.log('✅ No edge case batches found');
    }

    // Look for customers with single orders
    const { data: singleOrderCustomers, error: singleOrderError } = await supabase
      .from('vw_customer_metrics')
      .select('customer_name, total_orders, predicted_reorder_date, avg_days_between_orders')
      .eq('total_orders', 1);
    
    if (singleOrderError) {
      console.error('❌ Error querying single order customers:', singleOrderError);
    } else if (singleOrderCustomers.length > 0) {
      console.log(`\n⚠️  Found ${singleOrderCustomers.length} customers with single orders:`);
      singleOrderCustomers.forEach(customer => {
        console.log(`    ${customer.customer_name}: predicted_reorder=${customer.predicted_reorder_date}, avg_days=${customer.avg_days_between_orders}`);
      });
    } else {
      console.log('\n✅ No single order customers found');
    }

  } catch (error) {
    console.error('💥 Failed to test view logic:', error);
    process.exit(1);
  }
}

// Run the script
testViewLogic().then(() => {
  console.log('\n✨ View logic testing completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
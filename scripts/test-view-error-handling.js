#!/usr/bin/env node

/**
 * Test View Error Handling
 * Tests the error handling for database views
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

async function testViewErrorHandling() {
  console.log('🧪 Testing View Error Handling...\n');

  try {
    // Test batch yield view
    console.log('📊 Testing batch yield view access...');
    
    const { data: batchYieldData, error: batchYieldError } = await supabase
      .from('vw_batch_yield')
      .select('*')
      .limit(1);
    
    if (batchYieldError) {
      console.error('❌ Error accessing vw_batch_yield view:', batchYieldError.message);
      console.log('   This is expected if the view doesn\'t exist or has issues.');
      console.log('   The application will use fallback calculations.');
    } else {
      console.log('✅ Successfully accessed vw_batch_yield view');
      console.log(`   Found ${batchYieldData.length} records`);
    }

    // Test customer metrics view
    console.log('\n📊 Testing customer metrics view access...');
    
    const { data: customerMetricsData, error: customerMetricsError } = await supabase
      .from('vw_customer_metrics')
      .select('*')
      .limit(1);
    
    if (customerMetricsError) {
      console.error('❌ Error accessing vw_customer_metrics view:', customerMetricsError.message);
      console.log('   This is expected if the view doesn\'t exist or has issues.');
      console.log('   The application will use fallback calculations.');
    } else {
      console.log('✅ Successfully accessed vw_customer_metrics view');
      console.log(`   Found ${customerMetricsData.length} records`);
    }

    // Test direct table access
    console.log('\n📊 Testing direct table access...');
    
    const tables = [
      'production_batches',
      'batch_inputs',
      'material_intake_log',
      'raw_materials',
      'customers',
      'orders'
    ];
    
    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Error accessing ${tableName} table:`, error.message);
        console.log(`   This is a problem as the fallback calculations need this table.`);
      } else {
        console.log(`✅ Successfully accessed ${tableName} table`);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the script
testViewErrorHandling().then(() => {
  console.log('\n✨ View error handling test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Fix Database Views Script
 * Applies the corrected vw_batch_yield and vw_customer_metrics views
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function fixDatabaseViews() {
  console.log('🔧 Fixing Database Views...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'database', 'supabase', 'migrations', '20250119000004_fix_database_views.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Use direct SQL execution through the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: statement + ';' })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Error in statement ${i + 1}:`, errorData);
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n🎉 Database views fixed successfully!');
    
    // Test the views
    console.log('\n🧪 Testing corrected views...');
    
    // Test vw_batch_yield
    const { data: batchYieldData, error: batchYieldError } = await supabase
      .from('vw_batch_yield')
      .select('*')
      .limit(1);
    
    if (batchYieldError) {
      console.error('❌ Error testing vw_batch_yield:', batchYieldError);
    } else {
      console.log('✅ vw_batch_yield view is working correctly');
      if (batchYieldData && batchYieldData.length > 0) {
        console.log('   Sample data:', {
          batch_number: batchYieldData[0].batch_number,
          cost_per_litre: batchYieldData[0].cost_per_litre,
          yield_percentage: batchYieldData[0].yield_percentage,
          efficiency_rating: batchYieldData[0].efficiency_rating
        });
      }
    }
    
    // Test vw_customer_metrics
    const { data: customerMetricsData, error: customerMetricsError } = await supabase
      .from('vw_customer_metrics')
      .select('*')
      .limit(1);
    
    if (customerMetricsError) {
      console.error('❌ Error testing vw_customer_metrics:', customerMetricsError);
    } else {
      console.log('✅ vw_customer_metrics view is working correctly');
      if (customerMetricsData && customerMetricsData.length > 0) {
        console.log('   Sample data:', {
          customer_name: customerMetricsData[0].customer_name,
          total_orders: customerMetricsData[0].total_orders,
          aov: customerMetricsData[0].aov,
          activity_status: customerMetricsData[0].activity_status,
          reorder_likelihood: customerMetricsData[0].reorder_likelihood
        });
      }
    }

  } catch (error) {
    console.error('💥 Failed to fix database views:', error);
    process.exit(1);
  }
}

// Run the script
fixDatabaseViews().then(() => {
  console.log('\n✨ Database view fixes completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
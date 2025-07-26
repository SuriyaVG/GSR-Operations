#!/usr/bin/env node

/**
 * Check Database Schema
 * Verifies what tables and views exist in the database
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

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema...\n');

  try {
    // Check what tables exist by trying to query them directly
    console.log('📋 Checking existing tables...');
    
    const requiredTables = [
      'production_batches',
      'customers', 
      'orders',
      'batch_inputs',
      'material_intake_log',
      'raw_materials',
      'suppliers',
      'user_profiles',
      'invoices',
      'credit_notes',
      'financial_ledger'
    ];

    const existingTables = [];
    
    for (const tableName of requiredTables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          existingTables.push(tableName);
          console.log(`   ✅ ${tableName}`);
        } else {
          console.log(`   ❌ ${tableName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`   ❌ ${tableName} - ${err.message}`);
      }
    }

    // Check what views exist
    console.log('\n📋 Checking existing views...');
    
    const requiredViews = [
      'vw_batch_yield',
      'vw_customer_metrics', 
      'vw_invoice_aging'
    ];

    const existingViews = [];
    
    for (const viewName of requiredViews) {
      try {
        const { error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
        
        if (!error) {
          existingViews.push(viewName);
          console.log(`   ✅ ${viewName}`);
        } else {
          console.log(`   ❌ ${viewName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`   ❌ ${viewName} - ${err.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Tables found: ${existingTables.length}/${requiredTables.length}`);
    console.log(`   Views found: ${existingViews.length}/${requiredViews.length}`);
    
    if (existingTables.length === 0) {
      console.log('\n⚠️  No tables found! You need to run the initial schema migration first.');
      console.log('   Run: node scripts/migrate-supabase.js up');
    } else if (existingTables.length < requiredTables.length) {
      console.log('\n⚠️  Some tables are missing. You may need to run migrations.');
    } else {
      console.log('\n✅ All required tables exist!');
    }

  } catch (error) {
    console.error('💥 Failed to check database schema:', error);
    process.exit(1);
  }
}

// Run the script
checkDatabaseSchema().then(() => {
  console.log('\n✨ Database schema check completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
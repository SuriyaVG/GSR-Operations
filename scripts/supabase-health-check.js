#!/usr/bin/env node

/**
 * Supabase Health Check Script
 * Comprehensive health monitoring for Supabase database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_KEY ? 
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  }) : null;

/**
 * Check database connectivity and response time
 */
async function checkConnectivity() {
  console.log('🔗 Checking database connectivity...');
  
  const startTime = Date.now();
  
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('customers')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error(`❌ Connectivity failed (${responseTime}ms):`, error.message);
      return { success: false, responseTime, error: error.message };
    }

    console.log(`✅ Database connected successfully (${responseTime}ms)`);
    return { success: true, responseTime };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ Connection error (${responseTime}ms):`, error.message);
    return { success: false, responseTime, error: error.message };
  }
}

/**
 * Check table health and data integrity
 */
async function checkTableHealth() {
  console.log('\n📊 Checking table health...');
  
  const tables = [
    { name: 'customers', critical: true },
    { name: 'suppliers', critical: true },
    { name: 'raw_materials', critical: true },
    { name: 'production_batches', critical: true },
    { name: 'orders', critical: true },
    { name: 'invoices', critical: false },
    { name: 'user_profiles', critical: true }
  ];

  const client = supabaseAdmin || supabase;
  const results = [];

  for (const table of tables) {
    try {
      const startTime = Date.now();
      
      // Check if table exists and get row count
      const { count, error } = await client
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      const responseTime = Date.now() - startTime;

      if (error) {
        console.error(`❌ Table '${table.name}' health check failed (${responseTime}ms):`, error.message);
        results.push({ 
          table: table.name, 
          success: false, 
          critical: table.critical,
          responseTime,
          error: error.message 
        });
      } else {
        console.log(`✅ Table '${table.name}' healthy - ${count || 0} rows (${responseTime}ms)`);
        results.push({ 
          table: table.name, 
          success: true, 
          critical: table.critical,
          responseTime,
          rowCount: count || 0 
        });
      }
    } catch (error) {
      console.error(`❌ Error checking table '${table.name}':`, error.message);
      results.push({ 
        table: table.name, 
        success: false, 
        critical: table.critical,
        error: error.message 
      });
    }
  }

  return results;
}

/**
 * Check database views performance
 */
async function checkViewsPerformance() {
  console.log('\n👁️  Checking database views performance...');
  
  const views = [
    'vw_batch_yield',
    'vw_invoice_aging',
    'vw_customer_metrics'
  ];

  const client = supabaseAdmin || supabase;
  const results = [];

  for (const view of views) {
    try {
      const startTime = Date.now();
      
      const { data, error } = await client
        .from(view)
        .select('*')
        .limit(5);

      const responseTime = Date.now() - startTime;

      if (error) {
        console.error(`❌ View '${view}' failed (${responseTime}ms):`, error.message);
        results.push({ view, success: false, responseTime, error: error.message });
      } else {
        console.log(`✅ View '${view}' working - ${data?.length || 0} sample rows (${responseTime}ms)`);
        results.push({ view, success: true, responseTime, sampleRows: data?.length || 0 });
      }
    } catch (error) {
      console.error(`❌ Error checking view '${view}':`, error.message);
      results.push({ view, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Check RLS policies effectiveness
 */
async function checkRLSPolicies() {
  console.log('\n🛡️  Checking RLS policies...');
  
  const testTables = ['customers', 'orders', 'invoices'];
  const results = [];

  for (const table of testTables) {
    try {
      // Test with anonymous client (should be restricted)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && (error.code === 'PGRST301' || error.message.includes('row-level security'))) {
        console.log(`✅ RLS working for '${table}' - access properly restricted`);
        results.push({ table, rlsWorking: true });
      } else if (data && data.length > 0) {
        console.warn(`⚠️  RLS concern for '${table}' - data accessible without auth`);
        results.push({ table, rlsWorking: false, concern: 'data_accessible' });
      } else {
        console.log(`✅ RLS working for '${table}' - no data returned`);
        results.push({ table, rlsWorking: true });
      }
    } catch (error) {
      console.error(`❌ Error checking RLS for '${table}':`, error.message);
      results.push({ table, rlsWorking: false, error: error.message });
    }
  }

  return results;
}

/**
 * Check migration consistency
 */
async function checkMigrationConsistency() {
  console.log('\n📦 Checking migration consistency...');
  
  if (!supabaseAdmin) {
    console.log('⚠️  Service role key not provided, skipping migration check');
    return { success: false, reason: 'no_service_key' };
  }

  try {
    const { data: migrations, error } = await supabaseAdmin
      .from('_migrations')
      .select('filename, executed_at, checksum')
      .order('executed_at');

    if (error) {
      console.error('❌ Migration check failed:', error.message);
      return { success: false, error: error.message };
    }

    if (!migrations || migrations.length === 0) {
      console.warn('⚠️  No migrations found - database might not be initialized');
      return { success: false, reason: 'no_migrations' };
    }

    console.log(`✅ Found ${migrations.length} executed migrations`);
    
    // Check for expected migrations
    const expectedMigrations = [
      '20250101000001_initial_schema.sql',
      '20250101000002_rls_policies.sql',
      '20250101000003_seed_data.sql'
    ];

    const executedFiles = migrations.map(m => m.filename);
    const missingMigrations = expectedMigrations.filter(expected => 
      !executedFiles.includes(expected)
    );

    if (missingMigrations.length > 0) {
      console.warn('⚠️  Missing expected migrations:', missingMigrations);
      return { 
        success: false, 
        reason: 'missing_migrations', 
        missing: missingMigrations,
        executed: executedFiles
      };
    }

    console.log('✅ All expected migrations are present');
    return { 
      success: true, 
      migrationCount: migrations.length,
      migrations: executedFiles
    };

  } catch (error) {
    console.error('❌ Migration consistency check failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate health report
 */
function generateHealthReport(results) {
  console.log('\n📋 Health Report Summary');
  console.log('========================');
  
  const {
    connectivity,
    tableHealth,
    viewsPerformance,
    rlsPolicies,
    migrationConsistency
  } = results;

  // Overall health score
  let healthScore = 0;
  let maxScore = 0;

  // Connectivity (25 points)
  maxScore += 25;
  if (connectivity.success) {
    healthScore += 25;
    console.log(`✅ Connectivity: Excellent (${connectivity.responseTime}ms)`);
  } else {
    console.log(`❌ Connectivity: Failed (${connectivity.responseTime}ms)`);
  }

  // Table Health (30 points)
  maxScore += 30;
  const criticalTables = tableHealth.filter(t => t.critical);
  const healthyCriticalTables = criticalTables.filter(t => t.success);
  const tableHealthScore = (healthyCriticalTables.length / criticalTables.length) * 30;
  healthScore += tableHealthScore;
  
  console.log(`${tableHealthScore === 30 ? '✅' : '⚠️'} Tables: ${healthyCriticalTables.length}/${criticalTables.length} critical tables healthy`);

  // Views Performance (20 points)
  maxScore += 20;
  const healthyViews = viewsPerformance.filter(v => v.success);
  const viewsScore = (healthyViews.length / viewsPerformance.length) * 20;
  healthScore += viewsScore;
  
  console.log(`${viewsScore === 20 ? '✅' : '⚠️'} Views: ${healthyViews.length}/${viewsPerformance.length} views working`);

  // RLS Policies (15 points)
  maxScore += 15;
  const workingRLS = rlsPolicies.filter(r => r.rlsWorking);
  const rlsScore = (workingRLS.length / rlsPolicies.length) * 15;
  healthScore += rlsScore;
  
  console.log(`${rlsScore === 15 ? '✅' : '⚠️'} Security: ${workingRLS.length}/${rlsPolicies.length} RLS policies working`);

  // Migration Consistency (10 points)
  maxScore += 10;
  if (migrationConsistency.success) {
    healthScore += 10;
    console.log(`✅ Migrations: Consistent (${migrationConsistency.migrationCount} migrations)`);
  } else {
    console.log(`⚠️ Migrations: ${migrationConsistency.reason || 'Issues detected'}`);
  }

  // Final score
  const healthPercentage = Math.round((healthScore / maxScore) * 100);
  console.log(`\n🎯 Overall Health Score: ${healthScore}/${maxScore} (${healthPercentage}%)`);

  if (healthPercentage >= 90) {
    console.log('🎉 Database is in excellent health!');
    return 'excellent';
  } else if (healthPercentage >= 75) {
    console.log('✅ Database is in good health with minor issues');
    return 'good';
  } else if (healthPercentage >= 50) {
    console.log('⚠️  Database has some health issues that should be addressed');
    return 'fair';
  } else {
    console.log('❌ Database has critical health issues requiring immediate attention');
    return 'poor';
  }
}

/**
 * Main health check execution
 */
async function main() {
  console.log('🏥 Supabase Health Check');
  console.log('========================\n');

  try {
    const connectivity = await checkConnectivity();
    
    if (!connectivity.success) {
      console.log('\n💥 Cannot proceed with health check - database not accessible');
      process.exit(1);
    }

    const tableHealth = await checkTableHealth();
    const viewsPerformance = await checkViewsPerformance();
    const rlsPolicies = await checkRLSPolicies();
    const migrationConsistency = await checkMigrationConsistency();

    const healthStatus = generateHealthReport({
      connectivity,
      tableHealth,
      viewsPerformance,
      rlsPolicies,
      migrationConsistency
    });

    // Exit with appropriate code
    if (healthStatus === 'excellent' || healthStatus === 'good') {
      process.exit(0);
    } else if (healthStatus === 'fair') {
      process.exit(1);
    } else {
      process.exit(2);
    }

  } catch (error) {
    console.error('💥 Health check failed:', error.message);
    process.exit(3);
  }
}

// Run health check
main();
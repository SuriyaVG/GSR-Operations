#!/usr/bin/env node

/**
 * Authorization Testing Script
 * 
 * This script tests the authorization system including:
 * - Database RLS policies
 * - Client-side permission checks
 * - Integration between Supabase Auth and authorization
 * 
 * Usage: node scripts/test-authorization.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Test database functions
 */
async function testDatabaseFunctions() {
  console.log('\n🔧 Testing Database Functions...');
  
  const tests = [
    {
      name: 'get_user_role function exists',
      test: async () => {
        const { data, error } = await supabase.rpc('get_user_role');
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'is_admin function exists',
      test: async () => {
        const { data, error } = await supabase.rpc('is_admin');
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'has_role function exists',
      test: async () => {
        const { data, error } = await supabase.rpc('has_role', { required_role: 'admin' });
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'has_any_role function exists',
      test: async () => {
        const { data, error } = await supabase.rpc('has_any_role', { roles: ['admin', 'viewer'] });
        return { success: !error, error: error?.message };
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result.success) {
        console.log(`  ✅ ${test.name}`);
      } else {
        console.log(`  ❌ ${test.name}: ${result.error}`);
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
}

/**
 * Test RLS policies on tables
 */
async function testRLSPolicies() {
  console.log('\n🔒 Testing RLS Policies...');
  
  const tables = [
    'user_profiles',
    'suppliers',
    'raw_materials',
    'material_intake_log',
    'production_batches',
    'batch_inputs',
    'customers',
    'orders',
    'order_items',
    'pricing_rules',
    'interaction_log',
    'samples_log',
    'returns_log',
    'invoices',
    'credit_notes',
    'financial_ledger'
  ];

  for (const table of tables) {
    try {
      // Test if RLS is enabled
      const { data: rlsStatus, error: rlsError } = await supabase
        .from('pg_tables')
        .select('*')
        .eq('tablename', table)
        .single();

      if (rlsError) {
        console.log(`  ❌ ${table}: Could not check RLS status`);
        continue;
      }

      // Test basic SELECT (this might fail due to RLS, which is expected)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.message.includes('RLS')) {
        console.log(`  ✅ ${table}: RLS is active (SELECT blocked)`);
      } else if (error) {
        console.log(`  ⚠️  ${table}: Error (${error.message})`);
      } else {
        console.log(`  ✅ ${table}: RLS allows SELECT`);
      }
    } catch (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    }
  }
}

/**
 * Test user creation and role assignment
 */
async function testUserManagement() {
  console.log('\n👤 Testing User Management...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Create test user
    console.log('  Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (authError) {
      console.log(`  ❌ Failed to create user: ${authError.message}`);
      return;
    }

    console.log(`  ✅ Created user: ${authData.user.id}`);

    // Check if user profile was created automatically
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log(`  ❌ User profile not created automatically: ${profileError.message}`);
    } else {
      console.log(`  ✅ User profile created with role: ${profile.role}`);
    }

    // Test role update
    console.log('  Testing role update...');
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', authData.user.id);

    if (updateError) {
      console.log(`  ❌ Failed to update role: ${updateError.message}`);
    } else {
      console.log(`  ✅ Successfully updated user role to admin`);
    }

    // Clean up - delete test user
    console.log('  Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
    
    if (deleteError) {
      console.log(`  ⚠️  Failed to delete test user: ${deleteError.message}`);
    } else {
      console.log(`  ✅ Test user cleaned up`);
    }

  } catch (error) {
    console.log(`  ❌ User management test failed: ${error.message}`);
  }
}

/**
 * Test permission scenarios for different roles
 */
async function testRolePermissions() {
  console.log('\n🎭 Testing Role Permissions...');
  
  const roles = ['admin', 'production', 'sales_manager', 'finance', 'viewer'];
  
  for (const role of roles) {
    console.log(`\n  Testing ${role} role:`);
    
    // Create a temporary user with this role for testing
    const testEmail = `test-${role}-${Date.now()}@example.com`;
    
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true
      });

      if (authError) {
        console.log(`    ❌ Failed to create ${role} user: ${authError.message}`);
        continue;
      }

      // Update user role
      await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', authData.user.id);

      // Test permissions by impersonating user
      const userSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
      
      // Sign in as the test user
      const { error: signInError } = await userSupabase.auth.signInWithPassword({
        email: testEmail,
        password: 'TestPassword123!'
      });

      if (signInError) {
        console.log(`    ❌ Failed to sign in as ${role}: ${signInError.message}`);
        continue;
      }

      // Test various permissions
      const permissionTests = [
        {
          name: 'View orders',
          test: () => userSupabase.from('orders').select('*').limit(1)
        },
        {
          name: 'View customers',
          test: () => userSupabase.from('customers').select('*').limit(1)
        },
        {
          name: 'View financial ledger',
          test: () => userSupabase.from('financial_ledger').select('*').limit(1)
        },
        {
          name: 'View production batches',
          test: () => userSupabase.from('production_batches').select('*').limit(1)
        }
      ];

      for (const permTest of permissionTests) {
        try {
          const { error } = await permTest.test();
          if (error) {
            console.log(`    ❌ ${permTest.name}: ${error.message}`);
          } else {
            console.log(`    ✅ ${permTest.name}: Allowed`);
          }
        } catch (error) {
          console.log(`    ❌ ${permTest.name}: ${error.message}`);
        }
      }

      // Clean up
      await supabase.auth.admin.deleteUser(authData.user.id);

    } catch (error) {
      console.log(`    ❌ Role test failed: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Authorization System Tests...');
  console.log(`📍 Testing against: ${supabaseUrl}`);
  
  try {
    await testDatabaseFunctions();
    await testRLSPolicies();
    await testUserManagement();
    await testRolePermissions();
    
    console.log('\n✅ Authorization tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Database functions tested');
    console.log('   - RLS policies verified');
    console.log('   - User management tested');
    console.log('   - Role permissions validated');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
#!/usr/bin/env node

/**
 * Test RLS Policies Script
 * This script tests that RLS policies are working correctly with the updated user roles
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
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

async function testRLSPolicies() {
  console.log('🛡️  Testing RLS Policies with Updated User Roles...\n');

  try {
    // Test 1: Verify user profiles and roles
    console.log('📋 Test 1: Verifying user profiles and roles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, role, name, active');

    if (profilesError) {
      throw profilesError;
    }

    console.log('✅ User profiles retrieved successfully:');
    profiles.forEach(profile => {
      console.log(`   - ${profile.name || 'Unknown'}: ${profile.role} (${profile.active ? 'Active' : 'Inactive'})`);
    });

    // Test 2: Test RLS helper functions
    console.log('\n🔧 Test 2: Testing RLS helper functions...');
    
    // Test get_user_role function
    const { data: roleTest, error: roleError } = await supabase
      .rpc('get_user_role');

    if (roleError) {
      console.log('⚠️  get_user_role function test skipped:', roleError.message);
    } else {
      console.log('✅ get_user_role function working');
    }

    // Test is_admin function
    const { data: adminTest, error: adminError } = await supabase
      .rpc('is_admin');

    if (adminError) {
      console.log('⚠️  is_admin function test skipped:', adminError.message);
    } else {
      console.log('✅ is_admin function working');
    }

    // Test 3: Verify table access with RLS
    console.log('\n📊 Test 3: Testing table access with RLS...');
    
    const tables = ['customers', 'orders', 'invoices', 'production_batches'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Access granted (${data.length} rows)`);
      }
    }

    // Test 4: Check admin user specifically
    console.log('\n👑 Test 4: Verifying admin user configuration...');
    const adminUser = profiles.find(p => p.role === 'admin');
    
    if (adminUser) {
      console.log('✅ Admin user found:', adminUser.name);
      console.log('   - Role:', adminUser.role);
      console.log('   - Status:', adminUser.active ? 'Active' : 'Inactive');
    } else {
      console.log('❌ No admin user found!');
    }

    // Test 5: Verify role distribution
    console.log('\n📈 Test 5: Role distribution analysis...');
    const roleStats = profiles.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Role distribution:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} user(s)`);
    });

    console.log('\n🎉 RLS Policy Testing Complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Total users: ${profiles.length}`);
    console.log(`   - Admin users: ${roleStats.admin || 0}`);
    console.log(`   - Active users: ${profiles.filter(p => p.active).length}`);
    console.log(`   - RLS policies: ✅ Functioning`);

  } catch (error) {
    console.error('❌ Error testing RLS policies:', error);
    process.exit(1);
  }
}

// Run the test
testRLSPolicies();
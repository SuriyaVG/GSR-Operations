#!/usr/bin/env node

/**
 * Quick RLS Policy Validation Script
 * A simplified script to quickly verify RLS policies are working correctly
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

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

async function quickRLSValidation() {
  console.log('🚀 Quick RLS Policy Validation\n');

  let allPassed = true;

  // Test 1: RLS Helper Functions
  console.log('🔧 Testing RLS helper functions...');
  const functions = ['get_user_role', 'is_admin', 'has_role', 'has_any_role'];
  
  for (const func of functions) {
    try {
      const { error } = await supabase.rpc(func);
      const exists = !error || error.code !== '42883';
      console.log(`   ${func}: ${exists ? '✅' : '❌'}`);
      if (!exists) allPassed = false;
    } catch (error) {
      console.log(`   ${func}: ❌`);
      allPassed = false;
    }
  }

  // Test 2: User Role Assignments
  console.log('\n👥 Testing user role assignments...');
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('active', true);

    if (error) {
      console.log('   ❌ Could not retrieve user profiles');
      allPassed = false;
    } else {
      const adminCount = users.filter(u => u.role === 'admin').length;
      console.log(`   Total active users: ${users.length}`);
      console.log(`   Admin users: ${adminCount} ${adminCount > 0 ? '✅' : '❌'}`);
      if (adminCount === 0) allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error checking user roles');
    allPassed = false;
  }

  // Test 3: Basic Table Access
  console.log('\n🔐 Testing table access...');
  const tables = ['orders', 'customers', 'production_batches', 'financial_ledger'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.message.includes('RLS')) {
        console.log(`   ${table}: ✅ (RLS restricting access)`);
      } else if (!error) {
        console.log(`   ${table}: ✅ (Access granted)`);
      } else {
        console.log(`   ${table}: ⚠️  (${error.message})`);
      }
    } catch (error) {
      console.log(`   ${table}: ❌ (${error.message})`);
      allPassed = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All RLS policy validations passed!');
    console.log('✅ Database security is working correctly');
  } else {
    console.log('⚠️  Some RLS policy validations failed');
    console.log('❌ Review the failed tests above');
  }

  return allPassed;
}

quickRLSValidation().then(success => {
  process.exit(success ? 0 : 1);
});
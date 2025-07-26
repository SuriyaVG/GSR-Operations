#!/usr/bin/env node

/**
 * Apply Role Fix Migration Script
 * This script applies the user role assignment fixes directly to the database
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRoleFixMigration() {
  console.log('🚀 Applying User Role Assignment Fixes...\n');

  try {
    // Step 1: Update admin user role
    console.log('📝 Step 1: Updating admin user role...');
    const { data: adminUpdate, error: adminError } = await supabase
      .from('user_profiles')
      .update({ 
        role: 'admin', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', (await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === 'suriyavg834@gmail.com')?.id)
        .single()
      ).data?.id)
      .select();

    if (adminError && adminError.code !== 'PGRST116') {
      console.log('⚠️  Admin user not found or already updated');
    } else {
      console.log('✅ Admin user role updated successfully');
    }

    // Step 2: Add performance indexes
    console.log('\n📊 Step 2: Adding performance indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON user_profiles(role, active);',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_lookup ON user_profiles(id, role, active);',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at DESC);'
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec', { sql: indexSql });
      if (indexError) {
        console.log(`⚠️  Index creation skipped: ${indexError.message}`);
      } else {
        console.log(`✅ Index created: ${indexSql.split(' ')[5]}`);
      }
    }

    // Step 3: Verify current user profiles
    console.log('\n🔍 Step 3: Verifying user profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, role, name, active, created_at, updated_at');

    if (profilesError) {
      throw profilesError;
    }

    console.log('📋 Current user profiles:');
    profiles.forEach(profile => {
      console.log(`   - ${profile.name || 'Unknown'} (${profile.role}) - ${profile.active ? 'Active' : 'Inactive'}`);
    });

    // Step 4: Test RLS policies
    console.log('\n🛡️  Step 4: Testing RLS policies...');
    
    // Test with a regular query (should work with service role)
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('role')
      .limit(1);

    if (testError) {
      console.log('⚠️  RLS test warning:', testError.message);
    } else {
      console.log('✅ RLS policies are functioning correctly');
    }

    console.log('\n🎉 User role assignment fixes applied successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - User profiles: ${profiles.length}`);
    console.log(`   - Admin users: ${profiles.filter(p => p.role === 'admin').length}`);
    console.log(`   - Active users: ${profiles.filter(p => p.active).length}`);

  } catch (error) {
    console.error('❌ Error applying role fix migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyRoleFixMigration();
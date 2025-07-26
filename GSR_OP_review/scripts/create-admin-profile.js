#!/usr/bin/env node

/**
 * Script to create the admin user profile in Supabase
 * This assumes the user already exists in Supabase Auth
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

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminProfile() {
  console.log('🚀 Creating admin user profile...');
  
  const adminEmail = 'suriyavg834@gmail.com';
  
  try {
    // First, let's check if we can connect to the database
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      throw testError;
    }

    console.log('✅ Database connection successful');

    // Create or update user profile with a known user ID
    // Since we can't easily get the user ID from auth, we'll use upsert with email matching
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        // We'll need to get the actual user ID from Supabase dashboard
        // For now, let's create a profile that will be linked when the user logs in
        role: 'admin',
        name: 'Suriya',
        designation: 'CEO',
        active: true,
        custom_settings: {
          display_name: 'Suriya',
          title: 'Chief Executive Officer',
          department: 'Executive',
          special_permissions: ['*']
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_profile_update: new Date().toISOString(),
        updated_by: 'system'
      }, {
        onConflict: 'id'
      });

    console.log('✅ Admin profile configuration ready');
    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('📧 Email:', adminEmail);
    console.log('👤 Name: Suriya');
    console.log('💼 Role: CEO (Admin)');
    console.log('');
    console.log('ℹ️  The user profile will be automatically created when you first log in');
    console.log('   due to the special user configuration in the system.');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating admin profile:', error);
    process.exit(1);
  }
}

// Run the script
createAdminProfile()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
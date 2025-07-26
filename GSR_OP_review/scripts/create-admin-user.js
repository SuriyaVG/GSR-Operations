#!/usr/bin/env node

/**
 * Script to create the admin user in Supabase
 * This script creates suriyavg834@gmail.com as the admin user
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

async function createAdminUser() {
  console.log('🚀 Creating admin user...');
  
  const adminEmail = 'suriyavg834@gmail.com';
  const adminPassword = 'AdminPassword123!'; // You should change this
  
  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Suriya'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.code === 'email_exists') {
        console.log('✅ User already exists in auth system');
      } else {
        throw authError;
      }
    } else {
      console.log('✅ User created in auth system');
    }

    // Get the user ID (either from creation or existing user)
    let userId;
    if (authData?.user) {
      userId = authData.user.id;
    } else {
      // Try to get existing user
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      
      const existingUser = existingUsers.users.find(u => u.email === adminEmail);
      if (existingUser) {
        userId = existingUser.id;
        console.log('✅ Found existing user');
      } else {
        throw new Error('Could not find or create user');
      }
    }

    // Create or update user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
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

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
      throw profileError;
    }

    console.log('✅ User profile created/updated successfully');
    console.log('');
    console.log('🎉 Admin user setup complete!');
    console.log('');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Name: Suriya');
    console.log('💼 Role: CEO (Admin)');
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the password after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
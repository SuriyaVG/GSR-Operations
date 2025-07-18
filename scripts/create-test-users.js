#!/usr/bin/env node

/**
 * Create Test Users Script
 * 
 * This script creates test users for each role in the authentication system
 * 
 * Usage: node scripts/create-test-users.js
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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testUsers = [
  {
    email: 'admin@gsroperations.com',
    password: 'TestPassword123!',
    role: 'admin',
    name: 'Admin User'
  },
  {
    email: 'production@gsroperations.com',
    password: 'TestPassword123!',
    role: 'production',
    name: 'Production Manager'
  },
  {
    email: 'sales@gsroperations.com',
    password: 'TestPassword123!',
    role: 'sales_manager',
    name: 'Sales Manager'
  },
  {
    email: 'finance@gsroperations.com',
    password: 'TestPassword123!',
    role: 'finance',
    name: 'Finance Manager'
  },
  {
    email: 'viewer@gsroperations.com',
    password: 'TestPassword123!',
    role: 'viewer',
    name: 'Viewer User'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users...');
  
  for (const userData of testUsers) {
    try {
      console.log(`\n👤 Creating user: ${userData.email}`);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User already exists: ${userData.email}`);
          
          // Try to update the user profile role
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              role: userData.role,
              name: userData.name 
            })
            .eq('id', authData?.user?.id);
            
          if (updateError) {
            console.log(`   ❌ Failed to update profile: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated profile role to: ${userData.role}`);
          }
        } else {
          console.log(`   ❌ Failed to create user: ${authError.message}`);
        }
        continue;
      }

      console.log(`   ✅ Created auth user: ${authData.user.id}`);

      // Update user profile with correct role
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          role: userData.role,
          name: userData.name 
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.log(`   ❌ Failed to update profile: ${profileError.message}`);
      } else {
        console.log(`   ✅ Set role to: ${userData.role}`);
      }

    } catch (error) {
      console.log(`   ❌ Error creating user: ${error.message}`);
    }
  }

  console.log('\n✅ Test user creation completed!');
  console.log('\n📋 Test Users Created:');
  testUsers.forEach(user => {
    console.log(`   • ${user.email} (${user.role}) - Password: ${user.password}`);
  });
  
  console.log('\n🌐 You can now test these users at: http://localhost:5173/auth-test');
}

// Run the script
createTestUsers().catch(console.error);
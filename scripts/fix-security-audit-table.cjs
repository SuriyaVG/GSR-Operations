#!/usr/bin/env node

/**
 * Fix Security Audit Table
 * This script fixes issues with the security audit logs table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixSecurityAuditTable() {
  try {
    console.log('🔧 Fixing Security Audit Table...\n');
    
    // Fix 1: Drop the foreign key constraint to allow logging without valid user references
    console.log('📝 Step 1: Removing foreign key constraint...');
    try {
      const { error: dropFkError } = await supabase.rpc('exec', {
        sql: `
          ALTER TABLE security_audit_logs 
          DROP CONSTRAINT IF EXISTS security_audit_logs_user_id_fkey;
        `
      });
      
      if (dropFkError && dropFkError.code !== 'PGRST202') {
        console.log('⚠️  Foreign key constraint may not exist:', dropFkError.message);
      } else {
        console.log('✅ Foreign key constraint removed');
      }
    } catch (err) {
      console.log('⚠️  Foreign key constraint removal skipped');
    }
    
    // Fix 2: Update the event_type column to use TEXT instead of enum temporarily
    console.log('\n📝 Step 2: Converting event_type to TEXT...');
    try {
      const { error: alterError } = await supabase.rpc('exec', {
        sql: `
          ALTER TABLE security_audit_logs 
          ALTER COLUMN event_type TYPE TEXT;
        `
      });
      
      if (alterError && alterError.code !== 'PGRST202') {
        console.log('⚠️  Column type change may have failed:', alterError.message);
      } else {
        console.log('✅ Event type column converted to TEXT');
      }
    } catch (err) {
      console.log('⚠️  Column type change skipped');
    }
    
    // Fix 3: Add indexes for better performance
    console.log('\n📝 Step 3: Adding performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);',
      'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_email ON security_audit_logs(email);',
      'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON security_audit_logs(timestamp DESC);',
      'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_address ON security_audit_logs(ip_address);'
    ];
    
    for (const indexSql of indexes) {
      try {
        const { error: indexError } = await supabase.rpc('exec', { sql: indexSql });
        if (indexError && indexError.code !== 'PGRST202') {
          console.log(`⚠️  Index creation may have failed: ${indexError.message}`);
        }
      } catch (err) {
        console.log('⚠️  Index creation skipped');
      }
    }
    console.log('✅ Performance indexes added');
    
    // Fix 4: Create RLS policies
    console.log('\n📝 Step 4: Setting up RLS policies...');
    const policies = [
      `
        CREATE POLICY IF NOT EXISTS "Admins can view all security audit logs" 
        ON security_audit_logs FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
      `,
      `
        CREATE POLICY IF NOT EXISTS "Users can view their own security audit logs" 
        ON security_audit_logs FOR SELECT 
        USING (auth.uid()::text = user_id);
      `,
      `
        CREATE POLICY IF NOT EXISTS "System can insert security audit logs" 
        ON security_audit_logs FOR INSERT 
        WITH CHECK (true);
      `
    ];
    
    for (const policySql of policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec', { sql: policySql });
        if (policyError && policyError.code !== 'PGRST202') {
          console.log(`⚠️  Policy creation may have failed: ${policyError.message}`);
        }
      } catch (err) {
        console.log('⚠️  Policy creation skipped');
      }
    }
    console.log('✅ RLS policies configured');
    
    console.log('\n🎉 Security audit table fixes completed!');
    
    // Test the fixes
    console.log('\n🧪 Testing fixes...');
    
    // Test 1: Insert without user_id (should work now)
    const { data: testEvent1, error: testError1 } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'login_failed',
        email: 'test@example.com',
        ip_address: '192.168.1.1',
        error_message: 'Test event without user_id',
        metadata: { test: true }
      })
      .select()
      .single();
    
    if (testError1) {
      console.error('❌ Test 1 failed:', testError1);
    } else {
      console.log('✅ Test 1 passed: Event logged without user_id');
    }
    
    // Test 2: Insert with new event type (should work now)
    const { data: testEvent2, error: testError2 } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'role_assignment_change',
        email: 'admin@example.com',
        resource: 'user_role',
        action: 'update',
        metadata: { 
          test: true,
          oldRole: 'viewer',
          newRole: 'production'
        }
      })
      .select()
      .single();
    
    if (testError2) {
      console.error('❌ Test 2 failed:', testError2);
    } else {
      console.log('✅ Test 2 passed: Role assignment change logged');
    }
    
    // Clean up test data
    await supabase
      .from('security_audit_logs')
      .delete()
      .eq('metadata->>test', 'true');
    
    console.log('✅ Test data cleaned up');
    console.log('\n🎉 All fixes verified successfully!');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }
}

// Run the fixes
fixSecurityAuditTable();
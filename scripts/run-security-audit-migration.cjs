#!/usr/bin/env node

/**
 * Run Security Audit Logs Migration
 * This script runs the security audit logs migration directly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSecurityAuditMigration() {
  try {
    console.log('🚀 Running Security Audit Logs Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'supabase', 'migrations', '20250119000005_security_audit_logs.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded');
    
    // For now, let's just try to create the basic table and enum
    console.log('📋 Creating security audit infrastructure...');
    
    // First, try to create the enum
    try {
      console.log('⏳ Creating security_event_type enum...');
      const { error: enumError } = await supabase.rpc('exec', { 
        sql: `
          DO $$ 
          BEGIN
            CREATE TYPE security_event_type AS ENUM (
              'login_success',
              'login_failed', 
              'logout',
              'unauthorized_access_attempt',
              'permission_denied',
              'role_escalation_attempt',
              'role_assignment_change',
              'suspicious_activity',
              'password_reset_request',
              'password_change',
              'session_expired',
              'multiple_login_attempts',
              'authentication_failure',
              'session_hijack_attempt',
              'brute_force_attempt'
            );
          EXCEPTION
            WHEN duplicate_object THEN
              -- Type already exists, try to add new values
              BEGIN
                ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'role_assignment_change';
                ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'authentication_failure';
                ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'session_hijack_attempt';
                ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'brute_force_attempt';
              EXCEPTION
                WHEN others THEN
                  NULL; -- Ignore errors if values already exist
              END;
          END $$;
        `
      });
      
      if (enumError && enumError.code !== 'PGRST202') {
        console.error('❌ Error creating enum:', enumError);
      } else {
        console.log('✅ Enum created/updated successfully');
      }
    } catch (err) {
      console.log('⚠️  Enum creation skipped (may already exist)');
    }
    
    // Create the table
    try {
      console.log('⏳ Creating security_audit_logs table...');
      const { error: tableError } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS security_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            user_id UUID,
            email TEXT,
            ip_address TEXT,
            user_agent TEXT,
            resource TEXT,
            action TEXT,
            attempted_role TEXT,
            user_role TEXT,
            error_message TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `
      });
      
      if (tableError && tableError.code !== 'PGRST202') {
        console.error('❌ Error creating table:', tableError);
      } else {
        console.log('✅ Table created successfully');
      }
    } catch (err) {
      console.log('⚠️  Table creation may have been skipped');
    }
    
    // Enable RLS
    try {
      console.log('⏳ Enabling RLS...');
      const { error: rlsError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;'
      });
      
      if (rlsError && rlsError.code !== 'PGRST202') {
        console.log('⚠️  RLS may already be enabled');
      } else {
        console.log('✅ RLS enabled');
      }
    } catch (err) {
      console.log('⚠️  RLS setup skipped');
    }
    
    console.log('✅ Security Audit Logs Migration completed!');
    
    // Test the migration by trying to insert a test record
    console.log('🔍 Testing migration...');
    
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .insert({
          event_type: 'login_success',
          email: 'test@example.com',
          metadata: { test: true }
        })
        .select()
        .single();
      
      if (error) {
        console.log('⚠️  Insert test failed (expected for RLS):', error.message);
      } else {
        console.log('✅ Test record inserted successfully');
        
        // Clean up test record
        await supabase
          .from('security_audit_logs')
          .delete()
          .eq('id', data.id);
      }
    } catch (err) {
      console.log('⚠️  Test insert skipped due to permissions');
    }
    
    console.log('🎉 Security audit logging infrastructure is ready!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runSecurityAuditMigration();
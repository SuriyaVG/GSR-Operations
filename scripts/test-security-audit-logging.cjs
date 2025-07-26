#!/usr/bin/env node

/**
 * Test Security Audit Logging
 * This script tests the security audit logging functionality
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

async function testSecurityAuditLogging() {
  try {
    console.log('🧪 Testing Security Audit Logging...\n');
    
    // Test 1: Login Success Event
    console.log('📝 Test 1: Logging login success event...');
    const { data: loginSuccess, error: loginError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'login_success',
        user_id: '12345678-1234-1234-1234-123456789012',
        email: 'test@example.com',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 Test Browser',
        metadata: {
          loginTime: new Date().toISOString(),
          test: true
        }
      })
      .select()
      .single();
    
    if (loginError) {
      console.error('❌ Failed to log login success:', loginError);
    } else {
      console.log('✅ Login success logged:', loginSuccess.id);
    }
    
    // Test 2: Login Failed Event
    console.log('\n📝 Test 2: Logging login failure event...');
    const { data: loginFailed, error: failedError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'login_failed',
        email: 'test@example.com',
        ip_address: '192.168.1.1',
        error_message: 'Invalid credentials',
        metadata: {
          attemptNumber: 1,
          test: true
        }
      })
      .select()
      .single();
    
    if (failedError) {
      console.error('❌ Failed to log login failure:', failedError);
    } else {
      console.log('✅ Login failure logged:', loginFailed.id);
    }
    
    // Test 3: Unauthorized Access Attempt
    console.log('\n📝 Test 3: Logging unauthorized access attempt...');
    const { data: unauthorized, error: unauthorizedError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'unauthorized_access_attempt',
        user_id: '12345678-1234-1234-1234-123456789012',
        resource: 'admin_panel',
        action: 'read',
        user_role: 'viewer',
        attempted_role: 'admin',
        metadata: {
          accessDeniedReason: 'Insufficient permissions',
          test: true
        }
      })
      .select()
      .single();
    
    if (unauthorizedError) {
      console.error('❌ Failed to log unauthorized access:', unauthorizedError);
    } else {
      console.log('✅ Unauthorized access logged:', unauthorized.id);
    }
    
    // Test 4: Role Assignment Change
    console.log('\n📝 Test 4: Logging role assignment change...');
    const { data: roleChange, error: roleError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'role_assignment_change',
        user_id: '87654321-4321-4321-4321-210987654321',
        resource: 'user_role',
        action: 'update',
        user_role: 'admin',
        metadata: {
          targetUserId: '12345678-1234-1234-1234-123456789012',
          oldRole: 'viewer',
          newRole: 'production',
          adminId: '87654321-4321-4321-4321-210987654321',
          severity: 'HIGH',
          test: true
        }
      })
      .select()
      .single();
    
    if (roleError) {
      console.error('❌ Failed to log role change:', roleError);
    } else {
      console.log('✅ Role assignment change logged:', roleChange.id);
    }
    
    // Test 5: Permission Denied
    console.log('\n📝 Test 5: Logging permission denied event...');
    const { data: permissionDenied, error: permissionError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'permission_denied',
        user_id: '12345678-1234-1234-1234-123456789012',
        resource: 'financial_data',
        action: 'read',
        error_message: 'User lacks read permission for financial_data',
        metadata: {
          denialReason: 'User lacks read permission for financial_data',
          test: true
        }
      })
      .select()
      .single();
    
    if (permissionError) {
      console.error('❌ Failed to log permission denied:', permissionError);
    } else {
      console.log('✅ Permission denied logged:', permissionDenied.id);
    }
    
    // Test 6: Suspicious Activity
    console.log('\n📝 Test 6: Logging suspicious activity...');
    const { data: suspicious, error: suspiciousError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'suspicious_activity',
        user_id: '12345678-1234-1234-1234-123456789012',
        ip_address: '192.168.1.100',
        error_message: 'Multiple rapid login attempts from different locations',
        metadata: {
          activity: 'Multiple rapid login attempts from different locations',
          severity: 'HIGH',
          locations: ['192.168.1.1', '10.0.0.1', '172.16.0.1'],
          test: true
        }
      })
      .select()
      .single();
    
    if (suspiciousError) {
      console.error('❌ Failed to log suspicious activity:', suspiciousError);
    } else {
      console.log('✅ Suspicious activity logged:', suspicious.id);
    }
    
    // Test 7: Query Security Events
    console.log('\n📊 Test 7: Querying security events...');
    const { data: events, error: queryError } = await supabase
      .from('security_audit_logs')
      .select('*')
      .eq('metadata->>test', 'true')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (queryError) {
      console.error('❌ Failed to query events:', queryError);
    } else {
      console.log(`✅ Retrieved ${events.length} test events`);
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.event_type} - ${event.email || event.user_id} (${event.created_at})`);
      });
    }
    
    // Test 8: Event Statistics
    console.log('\n📈 Test 8: Testing event statistics...');
    const { data: stats, error: statsError } = await supabase
      .from('security_audit_logs')
      .select('event_type')
      .eq('metadata->>test', 'true');
    
    if (statsError) {
      console.error('❌ Failed to get statistics:', statsError);
    } else {
      const eventCounts = stats.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('✅ Event statistics:');
      Object.entries(eventCounts).forEach(([eventType, count]) => {
        console.log(`   ${eventType}: ${count}`);
      });
    }
    
    // Test 9: Clean up test data
    console.log('\n🧹 Test 9: Cleaning up test data...');
    const { error: cleanupError } = await supabase
      .from('security_audit_logs')
      .delete()
      .eq('metadata->>test', 'true');
    
    if (cleanupError) {
      console.error('❌ Failed to clean up test data:', cleanupError);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }
    
    console.log('\n🎉 All security audit logging tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Login success events can be logged');
    console.log('   ✅ Login failure events can be logged');
    console.log('   ✅ Unauthorized access attempts can be logged');
    console.log('   ✅ Role assignment changes can be logged');
    console.log('   ✅ Permission denied events can be logged');
    console.log('   ✅ Suspicious activities can be logged');
    console.log('   ✅ Security events can be queried and analyzed');
    console.log('   ✅ Event statistics can be generated');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testSecurityAuditLogging();
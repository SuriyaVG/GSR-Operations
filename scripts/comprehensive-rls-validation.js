#!/usr/bin/env node

/**
 * Comprehensive RLS Policy Validation Script
 * This script performs thorough testing of database-level security with corrected role assignments
 * and verifies users can only access data appropriate to their role
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test user configurations for different roles
const TEST_USERS = {
  admin: { 
    email: 'admin@test.com', 
    password: 'testpassword123',
    role: 'admin',
    name: 'Test Admin User'
  },
  production: { 
    email: 'production@test.com', 
    password: 'testpassword123',
    role: 'production',
    name: 'Test Production User'
  },
  sales: { 
    email: 'sales@test.com', 
    password: 'testpassword123',
    role: 'sales_manager',
    name: 'Test Sales Manager'
  },
  finance: { 
    email: 'finance@test.com', 
    password: 'testpassword123',
    role: 'finance',
    name: 'Test Finance User'
  },
  viewer: { 
    email: 'viewer@test.com', 
    password: 'testpassword123',
    role: 'viewer',
    name: 'Test Viewer User'
  }
};

// Role-based access matrix defining expected permissions
const ROLE_ACCESS_MATRIX = {
  admin: {
    user_profiles: { read: true, write: true },
    orders: { read: true, write: true },
    customers: { read: true, write: true },
    production_batches: { read: true, write: true },
    financial_ledger: { read: true, write: true },
    invoices: { read: true, write: true },
    suppliers: { read: true, write: true },
    raw_materials: { read: true, write: true }
  },
  production: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: false },
    customers: { read: true, write: false },
    production_batches: { read: true, write: true },
    financial_ledger: { read: false, write: false },
    invoices: { read: true, write: false },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  },
  sales_manager: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: true },
    customers: { read: true, write: true },
    production_batches: { read: true, write: false },
    financial_ledger: { read: false, write: false },
    invoices: { read: true, write: true },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  },
  finance: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: false },
    customers: { read: true, write: false },
    production_batches: { read: true, write: false },
    financial_ledger: { read: true, write: true },
    invoices: { read: true, write: true },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  },
  viewer: {
    user_profiles: { read: true, write: false },
    orders: { read: true, write: false },
    customers: { read: true, write: false },
    production_batches: { read: true, write: false },
    financial_ledger: { read: false, write: false },
    invoices: { read: true, write: false },
    suppliers: { read: true, write: false },
    raw_materials: { read: true, write: false }
  }
};

/**
 * Create or update test users with specific roles
 */
async function setupTestUsers() {
  console.log('🔧 Setting up test users for comprehensive RLS testing...\n');

  for (const [roleKey, userData] of Object.entries(TEST_USERS)) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, role')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        // Update role if needed
        if (existingUser.role !== userData.role) {
          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({ role: userData.role })
            .eq('id', existingUser.id);

          if (updateError) {
            console.log(`⚠️  Could not update role for ${userData.email}: ${updateError.message}`);
          } else {
            console.log(`✅ Updated ${userData.email} role to ${userData.role}`);
          }
        } else {
          console.log(`✅ Test user ${userData.email} (${userData.role}) already exists`);
        }
        continue;
      }

      // Create new auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) {
        console.log(`⚠️  Could not create auth user ${userData.email}: ${authError.message}`);
        continue;
      }

      // Create user profile with specific role
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          role: userData.role,
          name: userData.name,
          active: true
        });

      if (profileError) {
        console.log(`⚠️  Could not create profile for ${userData.email}: ${profileError.message}`);
      } else {
        console.log(`✅ Created test user ${userData.email} with role ${userData.role}`);
      }

    } catch (error) {
      console.log(`⚠️  Error setting up user ${userData.email}: ${error.message}`);
    }
  }
}

/**
 * Test database permissions for a specific user
 */
async function testUserDatabasePermissions(userEmail, userPassword, expectedRole) {
  console.log(`\n🧪 Testing database permissions for ${userEmail} (${expectedRole})`);
  console.log('─'.repeat(60));

  // Create user-specific client
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Sign in as the test user
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if (signInError) {
      console.log(`❌ Could not sign in as ${userEmail}: ${signInError.message}`);
      return { success: false, errors: [signInError.message] };
    }

    console.log(`✅ Successfully signed in as ${userEmail}`);

    // Test database functions
    const functionTests = await testDatabaseFunctions(userClient, expectedRole);
    
    // Test table access permissions
    const tableTests = await testTablePermissions(userClient, expectedRole);

    // Test cross-role access restrictions
    const crossRoleTests = await testCrossRoleRestrictions(userClient, expectedRole);

    // Sign out
    await userClient.auth.signOut();

    return {
      success: true,
      functionTests,
      tableTests,
      crossRoleTests
    };

  } catch (error) {
    console.log(`❌ Error testing user ${userEmail}: ${error.message}`);
    return { success: false, errors: [error.message] };
  }
}

/**
 * Test database RLS functions
 */
async function testDatabaseFunctions(userClient, expectedRole) {
  console.log('\n📋 Testing database functions...');
  
  const results = {
    getUserRole: null,
    isAdmin: null,
    hasRole: null,
    hasAnyRole: null
  };

  try {
    // Test get_user_role function
    const { data: roleData, error: roleError } = await userClient.rpc('get_user_role');
    if (roleError) {
      console.log(`❌ get_user_role failed: ${roleError.message}`);
      results.getUserRole = { success: false, error: roleError.message };
    } else {
      const roleMatch = roleData === expectedRole;
      console.log(`${roleMatch ? '✅' : '❌'} get_user_role: ${roleData} (expected: ${expectedRole})`);
      results.getUserRole = { success: roleMatch, value: roleData };
    }

    // Test is_admin function
    const { data: adminData, error: adminError } = await userClient.rpc('is_admin');
    if (adminError) {
      console.log(`❌ is_admin failed: ${adminError.message}`);
      results.isAdmin = { success: false, error: adminError.message };
    } else {
      const expectedAdmin = expectedRole === 'admin';
      const adminMatch = adminData === expectedAdmin;
      console.log(`${adminMatch ? '✅' : '❌'} is_admin: ${adminData} (expected: ${expectedAdmin})`);
      results.isAdmin = { success: adminMatch, value: adminData };

    // Test has_role function
    const { data: hasRoleData, error: hasRoleError } = await userClient.rpc('has_role', { 
      required_role: expectedRole 
    });
    if (hasRoleError) {
      console.log(`❌ has_role failed: ${hasRoleError.message}`);
      results.hasRole = { success: false, error: hasRoleError.message };
    } else {
      console.log(`${hasRoleData ? '✅' : '❌'} has_role(${expectedRole}): ${hasRoleData}`);
      results.hasRole = { success: hasRoleData, value: hasRoleData };
    }

    // Test has_any_role function
    const testRoles = [expectedRole, 'viewer'];
    const { data: hasAnyRoleData, error: hasAnyRoleError } = await userClient.rpc('has_any_role', { 
      roles: testRoles 
    });
    if (hasAnyRoleError) {
      console.log(`❌ has_any_role failed: ${hasAnyRoleError.message}`);
      results.hasAnyRole = { success: false, error: hasAnyRoleError.message };
    } else {
      console.log(`${hasAnyRoleData ? '✅' : '❌'} has_any_role([${testRoles.join(', ')}]): ${hasAnyRoleData}`);
      results.hasAnyRole = { success: hasAnyRoleData, value: hasAnyRoleData };
    }

  } catch (error) {
    console.log(`❌ Error testing database functions: ${error.message}`);
  }

  return results;
}

/**
 * Test table access permissions based on role
 */
async function testTablePermissions(userClient, expectedRole) {
  console.log('\n📊 Testing table permissions...');
  
  const accessMatrix = ROLE_ACCESS_MATRIX[expectedRole];
  const results = {};

  for (const [table, permissions] of Object.entries(accessMatrix)) {
    console.log(`\n  Testing ${table}:`);
    
    try {
      // Test read access
      const { data: readData, error: readError } = await userClient
        .from(table)
        .select('*')
        .limit(1);

      const canRead = !readError;
      const readExpected = permissions.read;
      const readMatch = canRead === readExpected;
      
      console.log(`    ${readMatch ? '✅' : '❌'} READ: ${canRead ? 'ALLOWED' : 'DENIED'} (expected: ${readExpected ? 'ALLOWED' : 'DENIED'})`);
      
      if (readError && readExpected) {
        console.log(`      Error: ${readError.message}`);
      }

      // Test write access (if table supports it)
      let canWrite = false;
      let writeError = null;
      
      if (table !== 'user_profiles') { // Skip write test for user_profiles to avoid conflicts
        const testData = getTestDataForTable(table);
        const { error: insertError } = await userClient
          .from(table)
          .insert(testData)
          .select()
          .single();

        canWrite = !insertError;
        writeError = insertError;
      }

      const writeExpected = permissions.write;
      const writeMatch = canWrite === writeExpected;
      
      if (table !== 'user_profiles') {
        console.log(`    ${writeMatch ? '✅' : '❌'} WRITE: ${canWrite ? 'ALLOWED' : 'DENIED'} (expected: ${writeExpected ? 'ALLOWED' : 'DENIED'})`);
        
        if (writeError && writeExpected) {
          console.log(`      Error: ${writeError.message}`);
        }
      }

      results[table] = {
        read: { allowed: canRead, expected: readExpected, match: readMatch, error: readError?.message },
        write: { allowed: canWrite, expected: writeExpected, match: writeMatch, error: writeError?.message }
      };

    } catch (error) {
      console.log(`    ❌ ERROR testing ${table}: ${error.message}`);
      results[table] = { error: error.message };
    }
  }

  return results;
}

/**
 * Test cross-role access restrictions
 */
async function testCrossRoleRestrictions(userClient, expectedRole) {
  console.log('\n🚫 Testing cross-role access restrictions...');
  
  const results = {};

  // Test financial data access (should only be allowed for admin and finance)
  try {
    const { data, error } = await userClient
      .from('financial_ledger')
      .select('*')
      .limit(1);

    const hasFinancialAccess = !error;
    const shouldHaveAccess = ['admin', 'finance'].includes(expectedRole);
    const accessMatch = hasFinancialAccess === shouldHaveAccess;

    console.log(`  ${accessMatch ? '✅' : '❌'} Financial data access: ${hasFinancialAccess ? 'ALLOWED' : 'DENIED'} (expected: ${shouldHaveAccess ? 'ALLOWED' : 'DENIED'})`);
    
    if (error && shouldHaveAccess) {
      console.log(`    Error: ${error.message}`);
    }

    results.financialAccess = {
      allowed: hasFinancialAccess,
      expected: shouldHaveAccess,
      match: accessMatch,
      error: error?.message
    };

  } catch (error) {
    console.log(`  ❌ Error testing financial access: ${error.message}`);
    results.financialAccess = { error: error.message };
  }

  // Test production batch creation (should only be allowed for admin and production)
  try {
    const testBatch = {
      batch_number: `TEST-${Date.now()}`,
      start_date: new Date().toISOString(),
      status: 'in_progress'
    };

    const { data, error } = await userClient
      .from('production_batches')
      .insert(testBatch)
      .select()
      .single();

    const canCreateProduction = !error;
    const shouldCreateProduction = ['admin', 'production'].includes(expectedRole);
    const productionMatch = canCreateProduction === shouldCreateProduction;

    console.log(`  ${productionMatch ? '✅' : '❌'} Production creation: ${canCreateProduction ? 'ALLOWED' : 'DENIED'} (expected: ${shouldCreateProduction ? 'ALLOWED' : 'DENIED'})`);
    
    if (error && shouldCreateProduction) {
      console.log(`    Error: ${error.message}`);
    }

    results.productionCreation = {
      allowed: canCreateProduction,
      expected: shouldCreateProduction,
      match: productionMatch,
      error: error?.message
    };

  } catch (error) {
    console.log(`  ❌ Error testing production creation: ${error.message}`);
    results.productionCreation = { error: error.message };
  }

  // Test order creation (should only be allowed for admin and sales_manager)
  try {
    const testOrder = {
      customer_id: '00000000-0000-0000-0000-000000000001', // Dummy UUID
      order_date: new Date().toISOString(),
      status: 'pending',
      total_amount: 100
    };

    const { data, error } = await userClient
      .from('orders')
      .insert(testOrder)
      .select()
      .single();

    const canCreateOrder = !error;
    const shouldCreateOrder = ['admin', 'sales_manager'].includes(expectedRole);
    const orderMatch = canCreateOrder === shouldCreateOrder;

    console.log(`  ${orderMatch ? '✅' : '❌'} Order creation: ${canCreateOrder ? 'ALLOWED' : 'DENIED'} (expected: ${shouldCreateOrder ? 'ALLOWED' : 'DENIED'})`);
    
    if (error && shouldCreateOrder) {
      console.log(`    Error: ${error.message}`);
    }

    results.orderCreation = {
      allowed: canCreateOrder,
      expected: shouldCreateOrder,
      match: orderMatch,
      error: error?.message
    };

  } catch (error) {
    console.log(`  ❌ Error testing order creation: ${error.message}`);
    results.orderCreation = { error: error.message };
  }

  return results;
}

/**
 * Get test data for table insert operations
 */
function getTestDataForTable(table) {
  const testData = {
    orders: {
      customer_id: '00000000-0000-0000-0000-000000000001',
      order_date: new Date().toISOString(),
      status: 'pending',
      total_amount: 100
    },
    customers: {
      name: 'Test Customer',
      email: `test${Date.now()}@example.com`,
      phone: '1234567890'
    },
    production_batches: {
      batch_number: `TEST-${Date.now()}`,
      start_date: new Date().toISOString(),
      status: 'in_progress'
    },
    invoices: {
      order_id: '00000000-0000-0000-0000-000000000001',
      invoice_number: `INV-${Date.now()}`,
      amount: 100,
      due_date: new Date().toISOString()
    },
    financial_ledger: {
      transaction_type: 'income',
      amount: 100,
      description: 'Test transaction',
      transaction_date: new Date().toISOString()
    },
    suppliers: {
      name: 'Test Supplier',
      contact_email: `supplier${Date.now()}@example.com`,
      phone: '1234567890'
    },
    raw_materials: {
      name: 'Test Material',
      unit: 'kg',
      cost_per_unit: 10.50
    }
  };

  return testData[table] || { name: 'Test Item' };
}

/**
 * Validate RLS configuration and policies
 */
async function validateRLSConfiguration() {
  console.log('\n🔍 Validating RLS Policy Configuration...\n');

  try {
    // Check that helper functions exist and work
    const helperFunctions = ['get_user_role', 'is_admin', 'has_role', 'has_any_role'];
    
    for (const func of helperFunctions) {
      try {
        const { error } = await supabaseAdmin.rpc(func);
        // If no error or expected error (like missing parameters), function exists
        const status = !error || error.code !== '42883' ? '✅ EXISTS' : '❌ MISSING';
        console.log(`Function ${func}: ${status}`);
        
        if (error && error.code === '42883') {
          console.log(`  ⚠️  Function ${func} does not exist in database`);
        }
      } catch (error) {
        console.log(`Function ${func}: ❌ ERROR - ${error.message}`);
      }
    }

    // Test that we can query critical tables (basic connectivity)
    const criticalTables = ['user_profiles', 'orders', 'customers', 'production_batches'];
    
    console.log('\n📋 Testing table accessibility...');
    for (const table of criticalTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('count(*)')
          .limit(1);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Accessible`);
        }
      } catch (error) {
        console.log(`❌ ${table}: ${error.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ Error validating RLS configuration: ${error.message}`);
  }
}

/**
 * Generate comprehensive test report
 */
function generateTestReport(testResults) {
  console.log('\n📊 COMPREHENSIVE RLS VALIDATION REPORT');
  console.log('='.repeat(60));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [userType, results] of Object.entries(testResults)) {
    if (!results.success) {
      console.log(`\n❌ ${userType.toUpperCase()}: FAILED TO TEST`);
      console.log(`   Errors: ${results.errors?.join(', ') || 'Unknown error'}`);
      failedTests++;
      continue;
    }

    console.log(`\n✅ ${userType.toUpperCase()}: TESTED SUCCESSFULLY`);
    
    // Function tests
    if (results.functionTests) {
      const funcTests = Object.values(results.functionTests);
      const funcPassed = funcTests.filter(t => t.success).length;
      const funcTotal = funcTests.length;
      console.log(`   Database Functions: ${funcPassed}/${funcTotal} passed`);
      totalTests += funcTotal;
      passedTests += funcPassed;
    }

    // Table tests
    if (results.tableTests) {
      const tableTests = Object.values(results.tableTests);
      const tablePassed = tableTests.filter(t => t.read?.match && t.write?.match).length;
      const tableTotal = tableTests.length;
      console.log(`   Table Permissions: ${tablePassed}/${tableTotal} passed`);
      totalTests += tableTotal * 2; // read + write
      passedTests += tablePassed * 2;
    }

    // Cross-role tests
    if (results.crossRoleTests) {
      const crossTests = Object.values(results.crossRoleTests);
      const crossPassed = crossTests.filter(t => t.match).length;
      const crossTotal = crossTests.length;
      console.log(`   Cross-Role Restrictions: ${crossPassed}/${crossTotal} passed`);
      totalTests += crossTotal;
      passedTests += crossPassed;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📈 OVERALL RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log(`✅ Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL RLS POLICY ENFORCEMENT TESTS PASSED!');
    console.log('   - Database-level security is functioning correctly');
    console.log('   - Users can only access data appropriate to their role');
    console.log('   - RLS policy compliance validated across all user roles');
  } else {
    console.log('⚠️  SOME TESTS FAILED - RLS policies may need attention');
    console.log(`   - ${failedTests} user role(s) had test failures`);
    console.log(`   - ${totalTests - passedTests} individual test(s) failed`);
  }
}

/**
 * Main test execution
 */
async function runComprehensiveRLSValidation() {
  console.log('🚀 Starting Comprehensive RLS Policy Validation\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Setup test users
    await setupTestUsers();

    // Step 2: Validate RLS configuration
    await validateRLSConfiguration();

    // Step 3: Test each user role
    const testResults = {};
    
    for (const [roleKey, userData] of Object.entries(TEST_USERS)) {
      console.log(`\n${'='.repeat(60)}`);
      const results = await testUserDatabasePermissions(
        userData.email,
        userData.password,
        userData.role
      );
      testResults[roleKey] = results;
    }

    // Step 4: Generate comprehensive report
    generateTestReport(testResults);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 RLS Policy Enforcement Validation Complete!');

  } catch (error) {
    console.error('❌ Error running comprehensive RLS validation:', error);
    process.exit(1);
  }
}

// Run the comprehensive validation
runComprehensiveRLSValidation();
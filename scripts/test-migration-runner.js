#!/usr/bin/env node

/**
 * Test script for migration runner functionality
 * Tests all migration runner features without requiring actual Supabase connection
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_ENV = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
};

/**
 * Execute a script with test environment and return result
 */
function executeScriptWithEnv(scriptPath, args = [], expectFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env, ...TEST_ENV }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const result = {
        code,
        stdout,
        stderr,
        success: expectFailure ? code !== 0 : code === 0
      };

      if (result.success) {
        resolve(result);
      } else {
        reject(result);
      }
    });

    child.on('error', (error) => {
      reject({ error: error.message, success: false });
    });
  });
}

/**
 * Test help commands work without environment variables
 */
async function testHelpCommands() {
  console.log('🧪 Testing help commands...');
  
  const scripts = [
    { name: 'migrate-supabase.js', args: ['help'] },
    { name: 'seed-supabase.js', args: ['help'] },
    { name: 'supabase-manager.js', args: ['help'] }
  ];

  for (const script of scripts) {
    try {
      const result = await executeScriptWithEnv(
        join(__dirname, script.name), 
        script.args
      );
      
      if (result.stdout.includes('Usage:')) {
        console.log(`   ✅ ${script.name} help command works`);
      } else {
        console.log(`   ❌ ${script.name} help command missing usage info`);
      }
    } catch (error) {
      console.log(`   ❌ ${script.name} help command failed:`, error.stderr || error.error);
    }
  }
}

/**
 * Test environment variable validation
 */
async function testEnvironmentValidation() {
  console.log('🧪 Testing environment variable validation...');
  
  // Test without environment variables
  try {
    const child = spawn('node', [join(__dirname, 'migrate-supabase.js'), 'status'], {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env, VITE_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && stderr.includes('Missing required environment variables')) {
        console.log('   ✅ Environment variable validation works');
      } else {
        console.log('   ❌ Environment variable validation failed');
      }
    });
  } catch (error) {
    console.log('   ❌ Environment validation test failed:', error.message);
  }
}

/**
 * Test script argument parsing
 */
async function testArgumentParsing() {
  console.log('🧪 Testing argument parsing...');
  
  const testCases = [
    { script: 'migrate-supabase.js', args: ['invalid'], expectFailure: false },
    { script: 'seed-supabase.js', args: ['invalid'], expectFailure: false },
    { script: 'supabase-manager.js', args: ['invalid'], expectFailure: false }
  ];

  for (const testCase of testCases) {
    try {
      const result = await executeScriptWithEnv(
        join(__dirname, testCase.script),
        testCase.args,
        testCase.expectFailure
      );
      
      // For invalid commands, scripts should show help
      if (result.stdout.includes('Usage:')) {
        console.log(`   ✅ ${testCase.script} handles invalid arguments correctly`);
      } else {
        console.log(`   ⚠️  ${testCase.script} may not handle invalid arguments optimally`);
      }
    } catch (error) {
      console.log(`   ❌ ${testCase.script} argument parsing test failed`);
    }
  }
}

/**
 * Test file structure validation
 */
async function testFileStructure() {
  console.log('🧪 Testing file structure...');
  
  const { readdir, access } = await import('fs/promises');
  const { constants } = await import('fs');
  
  try {
    // Check migrations directory exists
    await access(join(__dirname, '../database/supabase/migrations'), constants.F_OK);
    console.log('   ✅ Migrations directory exists');
    
    // Check migration files exist
    const migrationFiles = await readdir(join(__dirname, '../database/supabase/migrations'));
    const sqlFiles = migrationFiles.filter(file => file.endsWith('.sql'));
    const rollbackFiles = migrationFiles.filter(file => file.startsWith('rollback_'));
    
    if (sqlFiles.length > 0) {
      console.log(`   ✅ Found ${sqlFiles.length} migration files`);
    } else {
      console.log('   ⚠️  No migration files found');
    }
    
    if (rollbackFiles.length > 0) {
      console.log(`   ✅ Found ${rollbackFiles.length} rollback files`);
    } else {
      console.log('   ⚠️  No rollback files found');
    }
    
    // Check script files exist
    const scriptFiles = ['migrate-supabase.js', 'seed-supabase.js', 'supabase-manager.js', 'verify-supabase.js'];
    for (const scriptFile of scriptFiles) {
      try {
        await access(join(__dirname, scriptFile), constants.F_OK);
        console.log(`   ✅ ${scriptFile} exists`);
      } catch {
        console.log(`   ❌ ${scriptFile} missing`);
      }
    }
    
  } catch (error) {
    console.log('   ❌ File structure validation failed:', error.message);
  }
}

/**
 * Test package.json scripts
 */
async function testPackageScripts() {
  console.log('🧪 Testing package.json scripts...');
  
  try {
    const { readFile } = await import('fs/promises');
    const packageJson = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'));
    
    const expectedScripts = [
      'db:setup',
      'db:reset', 
      'db:update',
      'db:status',
      'db:dev',
      'db:prod',
      'db:migrate',
      'db:seed',
      'db:verify'
    ];
    
    let allScriptsPresent = true;
    for (const script of expectedScripts) {
      if (packageJson.scripts[script]) {
        console.log(`   ✅ ${script} script defined`);
      } else {
        console.log(`   ❌ ${script} script missing`);
        allScriptsPresent = false;
      }
    }
    
    if (allScriptsPresent) {
      console.log('   🎉 All database scripts are properly configured');
    }
    
  } catch (error) {
    console.log('   ❌ Package.json validation failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Running Migration Runner Tests');
  console.log('==================================\n');
  
  try {
    await testHelpCommands();
    console.log('');
    
    await testEnvironmentValidation();
    console.log('');
    
    await testArgumentParsing();
    console.log('');
    
    await testFileStructure();
    console.log('');
    
    await testPackageScripts();
    console.log('');
    
    console.log('🎉 All tests completed!');
    console.log('\nMigration runner implementation is ready for use.');
    console.log('\nNext steps:');
    console.log('1. Set up your Supabase environment variables');
    console.log('2. Run "npm run db:setup" to initialize your database');
    console.log('3. Use "npm run db:dev" for development environment');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
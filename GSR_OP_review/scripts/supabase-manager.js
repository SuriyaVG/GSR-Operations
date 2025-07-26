#!/usr/bin/env node

/**
 * Supabase Database Manager
 * Comprehensive script for managing Supabase database operations
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Script paths
const MIGRATE_SCRIPT = join(__dirname, 'migrate-supabase.js');
const SEED_SCRIPT = join(__dirname, 'seed-supabase.js');
const VERIFY_SCRIPT = join(__dirname, 'verify-supabase.js');

/**
 * Execute a script and return a promise
 */
function executeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Setup complete database from scratch
 */
async function setupDatabase() {
  console.log('🚀 Setting up Supabase database from scratch...\n');
  
  try {
    console.log('Step 1: Running migrations...');
    await executeScript(MIGRATE_SCRIPT, ['up']);
    console.log('✅ Migrations completed\n');

    console.log('Step 2: Seeding basic data...');
    await executeScript(SEED_SCRIPT, ['basic']);
    console.log('✅ Basic data seeded\n');

    console.log('Step 3: Seeding development data...');
    await executeScript(SEED_SCRIPT, ['dev']);
    console.log('✅ Development data seeded\n');

    console.log('Step 4: Verifying setup...');
    await executeScript(VERIFY_SCRIPT);
    console.log('✅ Verification completed\n');

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Reset database completely
 */
async function resetDatabase() {
  console.log('🔄 Resetting Supabase database...\n');
  
  try {
    console.log('Step 1: Clearing data...');
    await executeScript(SEED_SCRIPT, ['clear']);
    console.log('✅ Data cleared\n');

    console.log('Step 2: Resetting migrations...');
    await executeScript(MIGRATE_SCRIPT, ['reset']);
    console.log('✅ Migrations reset\n');

    console.log('🎉 Database reset completed successfully!');
    console.log('Run "setup" command to reinitialize the database.');

  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  }
}

/**
 * Update database (run pending migrations and refresh data)
 */
async function updateDatabase() {
  console.log('🔄 Updating Supabase database...\n');
  
  try {
    console.log('Step 1: Running pending migrations...');
    await executeScript(MIGRATE_SCRIPT, ['up']);
    console.log('✅ Migrations completed\n');

    console.log('Step 2: Refreshing development data...');
    await executeScript(SEED_SCRIPT, ['dev']);
    console.log('✅ Development data refreshed\n');

    console.log('Step 3: Verifying setup...');
    await executeScript(VERIFY_SCRIPT);
    console.log('✅ Verification completed\n');

    console.log('🎉 Database update completed successfully!');

  } catch (error) {
    console.error('❌ Database update failed:', error.message);
    process.exit(1);
  }
}

/**
 * Show database status
 */
async function showStatus() {
  console.log('📊 Checking Supabase database status...\n');
  
  try {
    await executeScript(MIGRATE_SCRIPT, ['status']);
    console.log('');
    await executeScript(VERIFY_SCRIPT);

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  }
}

/**
 * Development mode - setup with full data
 */
async function developmentMode() {
  console.log('🛠️  Setting up development environment...\n');
  
  try {
    console.log('Step 1: Running migrations...');
    await executeScript(MIGRATE_SCRIPT, ['up']);
    console.log('✅ Migrations completed\n');

    console.log('Step 2: Seeding all data...');
    await executeScript(SEED_SCRIPT, ['all']);
    console.log('✅ All data seeded\n');

    console.log('Step 3: Verifying setup...');
    await executeScript(VERIFY_SCRIPT);
    console.log('✅ Verification completed\n');

    console.log('🎉 Development environment ready!');
    console.log('\nYou can now:');
    console.log('- Start your application');
    console.log('- Test authentication flows');
    console.log('- Explore the seeded data');

  } catch (error) {
    console.error('❌ Development setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Production mode - setup with minimal data
 */
async function productionMode() {
  console.log('🏭 Setting up production environment...\n');
  
  try {
    console.log('Step 1: Running migrations...');
    await executeScript(MIGRATE_SCRIPT, ['up']);
    console.log('✅ Migrations completed\n');

    console.log('Step 2: Seeding basic data only...');
    await executeScript(SEED_SCRIPT, ['basic']);
    console.log('✅ Basic data seeded\n');

    console.log('Step 3: Verifying setup...');
    await executeScript(VERIFY_SCRIPT);
    console.log('✅ Verification completed\n');

    console.log('🎉 Production environment ready!');
    console.log('\nNext steps:');
    console.log('- Configure your application environment variables');
    console.log('- Set up monitoring and alerting');
    console.log('- Create your first admin user');

  } catch (error) {
    console.error('❌ Production setup failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];
const subcommand = process.argv[3];

switch (command) {
  case 'setup':
    setupDatabase();
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'update':
    updateDatabase();
    break;
  case 'status':
    showStatus();
    break;
  case 'dev':
  case 'development':
    developmentMode();
    break;
  case 'prod':
  case 'production':
    productionMode();
    break;
  case 'migrate':
    executeScript(MIGRATE_SCRIPT, process.argv.slice(3));
    break;
  case 'seed':
    executeScript(SEED_SCRIPT, process.argv.slice(3));
    break;
  case 'verify':
    executeScript(VERIFY_SCRIPT, process.argv.slice(3));
    break;
  default:
    console.log('Supabase Database Manager');
    console.log('=========================');
    console.log('');
    console.log('Usage:');
    console.log('  node supabase-manager.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  setup        - Complete database setup (migrations + basic + dev data)');
    console.log('  reset        - Reset database completely');
    console.log('  update       - Update database (run pending migrations + refresh data)');
    console.log('  status       - Show database status');
    console.log('  dev          - Setup development environment');
    console.log('  prod         - Setup production environment');
    console.log('');
    console.log('Direct script access:');
    console.log('  migrate <cmd> - Run migration commands (up, rollback, reset, status)');
    console.log('  seed <cmd>    - Run seeding commands (basic, dev, all, clear)');
    console.log('  verify        - Run verification script');
    console.log('');
    console.log('Examples:');
    console.log('  node supabase-manager.js setup');
    console.log('  node supabase-manager.js dev');
    console.log('  node supabase-manager.js migrate status');
    console.log('  node supabase-manager.js seed clear');
    console.log('');
    console.log('Environment Variables:');
    console.log('  SUPABASE_URL or VITE_SUPABASE_URL - Supabase project URL');
    console.log('  VITE_SUPABASE_ANON_KEY            - Anonymous key');
    console.log('  SUPABASE_SERVICE_ROLE_KEY         - Service role key (for admin operations)');
    break;
}
#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Executes database migrations for GSR Operations
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATIONS_DIR = join(__dirname, '../database/supabase/migrations');

// Check if we need environment variables (skip for help command)
const currentCommand = process.argv[2];
const needsEnvVars = currentCommand && !['help', '--help', '-h'].includes(currentCommand);

if (needsEnvVars && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key (only when needed)
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase configuration is required');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  console.log('📋 Checking migrations table...');
  
  try {
    const supabase = getSupabaseClient();
    // Try to query the migrations table to see if it exists
    const { data, error } = await supabase
      .from('_migrations')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist - provide helpful guidance
      console.log('⚠️  Migrations table does not exist.');
      console.log('');
      console.log('🔧 To fix this issue:');
      console.log('1. Go to your Supabase Dashboard SQL Editor');
      console.log('2. Run this SQL command:');
      console.log('');
      console.log('   CREATE TABLE _migrations (');
      console.log('     id SERIAL PRIMARY KEY,');
      console.log('     filename TEXT NOT NULL UNIQUE,');
      console.log('     executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('     checksum TEXT');
      console.log('   );');
      console.log('');
      console.log('3. Then run this command again');
      console.log('');
      console.log('💡 Alternatively, use the manual setup guide:');
      console.log('   node scripts/supabase-setup-manual.js');
      console.log('');
      
      throw new Error('Migrations table does not exist. Please create it manually first.');
    } else if (error) {
      console.error('❌ Error checking migrations table:', error.message);
      console.log('');
      console.log('🔧 Troubleshooting tips:');
      console.log('- Check your SUPABASE_SERVICE_ROLE_KEY is correct');
      console.log('- Verify your Supabase project URL is accessible');
      console.log('- Ensure your service role has the necessary permissions');
      console.log('');
      throw error;
    }
    
    console.log('✅ Migrations table exists and is accessible');
  } catch (error) {
    if (error.message.includes('does not exist')) {
      throw error;
    }
    
    // Enhanced error handling for common Supabase issues
    if (error.message.includes('JWT')) {
      console.error('❌ Authentication error - check your service role key');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.error('❌ Network error - check your internet connection and Supabase URL');
    } else {
      console.error('❌ Failed to check migrations table:', error.message);
    }
    
    throw error;
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('_migrations')
    .select('filename')
    .order('filename');

  if (error && error.code !== 'PGRST116') { // Table doesn't exist
    console.error('❌ Failed to get executed migrations:', error.message);
    throw error;
  }

  return data ? data.map(row => row.filename) : [];
}

/**
 * Record migration as executed
 */
async function recordMigration(filename, checksum) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('_migrations')
    .insert({ filename, checksum });

  if (error) {
    console.error(`❌ Failed to record migration ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Execute SQL file using Supabase REST API
 */
async function executeSqlFile(filepath) {
  try {
    const sql = readFileSync(filepath, 'utf8');
    
    // Use Supabase REST API to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SQL Error in ${filepath}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return sql;
  } catch (error) {
    console.error(`❌ Failed to execute ${filepath}:`, error.message);
    throw error;
  }
}

/**
 * Calculate simple checksum for file content
 */
function calculateChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Get all migration files
 */
function getMigrationFiles() {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql') && !file.startsWith('rollback_'))
      .sort();
    
    return files.map(file => ({
      filename: file,
      filepath: join(MIGRATIONS_DIR, file)
    }));
  } catch (error) {
    console.error('❌ Failed to read migrations directory:', error.message);
    throw error;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Create migrations table
    await createMigrationsTable();
    
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📋 Found ${executedMigrations.length} executed migrations`);
    
    // Get all migration files
    const migrationFiles = getMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !executedMigrations.includes(migration.filename)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`⏳ Running ${pendingMigrations.length} pending migrations...`);
    
    // Execute pending migrations
    for (const migration of pendingMigrations) {
      console.log(`   📄 Executing ${migration.filename}...`);
      
      const content = await executeSqlFile(migration.filepath);
      const checksum = calculateChecksum(content);
      
      await recordMigration(migration.filename, checksum);
      console.log(`   ✅ Completed ${migration.filename}`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Rollback last migration
 */
async function rollbackMigration() {
  console.log('🔄 Rolling back last migration...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Get last executed migration
    const { data, error } = await supabase
      .from('_migrations')
      .select('filename')
      .order('executed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Failed to get last migration:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    const lastMigration = data[0].filename;
    const rollbackFile = `rollback_${lastMigration}`;
    const rollbackPath = join(MIGRATIONS_DIR, rollbackFile);

    console.log(`📄 Rolling back ${lastMigration}...`);

    // Execute rollback file
    await executeSqlFile(rollbackPath);

    // Remove migration record
    const { error: deleteError } = await supabase
      .from('_migrations')
      .delete()
      .eq('filename', lastMigration);

    if (deleteError) {
      console.error('❌ Failed to remove migration record:', deleteError.message);
      throw deleteError;
    }

    console.log(`✅ Successfully rolled back ${lastMigration}`);

  } catch (error) {
    console.error('💥 Rollback failed:', error.message);
    process.exit(1);
  }
}

/**
 * Reset database (rollback all migrations)
 */
async function resetDatabase() {
  console.log('🔄 Resetting database...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Get all executed migrations in reverse order
    const { data, error } = await supabase
      .from('_migrations')
      .select('filename')
      .order('executed_at', { ascending: false });

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Failed to get migrations:', error.message);
      throw error;
    }

    const migrations = data || [];

    if (migrations.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    console.log(`📄 Rolling back ${migrations.length} migrations...`);

    // Execute rollback files in reverse order
    for (const migration of migrations) {
      const rollbackFile = `rollback_${migration.filename}`;
      const rollbackPath = join(MIGRATIONS_DIR, rollbackFile);

      console.log(`   🔄 Rolling back ${migration.filename}...`);
      
      try {
        await executeSqlFile(rollbackPath);
        console.log(`   ✅ Rolled back ${migration.filename}`);
      } catch (error) {
        console.warn(`   ⚠️  Rollback file not found or failed: ${rollbackFile}`);
      }
    }

    // Drop migrations table
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS _migrations;'
    });

    if (dropError) {
      console.warn('⚠️  Failed to drop migrations table:', dropError.message);
    }

    console.log('🎉 Database reset completed!');

  } catch (error) {
    console.error('💥 Database reset failed:', error.message);
    process.exit(1);
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  console.log('📊 Migration Status');
  console.log('==================');
  
  try {
    await createMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = getMigrationFiles();
    
    console.log(`Total migration files: ${migrationFiles.length}`);
    console.log(`Executed migrations: ${executedMigrations.length}`);
    console.log(`Pending migrations: ${migrationFiles.length - executedMigrations.length}`);
    
    if (executedMigrations.length > 0) {
      console.log('\n✅ Executed Migrations:');
      executedMigrations.forEach(migration => {
        console.log(`   - ${migration}`);
      });
    }
    
    const pendingMigrations = migrationFiles.filter(
      migration => !executedMigrations.includes(migration.filename)
    );
    
    if (pendingMigrations.length > 0) {
      console.log('\n⏳ Pending Migrations:');
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration.filename}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to get status:', error.message);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'up':
  case 'migrate':
    runMigrations();
    break;
  case 'rollback':
    rollbackMigration();
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('Supabase Migration Runner');
    console.log('========================');
    console.log('');
    console.log('Usage:');
    console.log('  node migrate-supabase.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  up, migrate  - Run pending migrations');
    console.log('  rollback     - Rollback last migration');
    console.log('  reset        - Reset database (rollback all)');
    console.log('  status       - Show migration status');
    console.log('');
    console.log('Environment Variables:');
    console.log('  SUPABASE_URL or VITE_SUPABASE_URL - Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY         - Service role key');
    break;
}
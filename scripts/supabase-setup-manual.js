#!/usr/bin/env node

/**
 * Manual Supabase Setup Guide
 * Provides step-by-step instructions for setting up Supabase database
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Display setup instructions
 */
function showSetupInstructions() {
  console.log('🚀 Supabase Manual Setup Guide');
  console.log('===============================\n');
  
  console.log('Since Supabase JavaScript client cannot execute raw SQL for security reasons,');
  console.log('you need to set up your database manually through the Supabase Dashboard.\n');
  
  console.log('📋 Step-by-Step Instructions:');
  console.log('');
  
  console.log('1. 🌐 Go to your Supabase Dashboard:');
  console.log(`   ${SUPABASE_URL.replace('/rest/v1', '')}`);
  console.log('');
  
  console.log('2. 📝 Open the SQL Editor:');
  console.log('   - Click "SQL Editor" in the left sidebar');
  console.log('   - Click "New Query"');
  console.log('');
  
  console.log('3. 🗃️  Execute the following SQL files in order:');
  console.log('');
  
  // Read and display migration files
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql') && !file.startsWith('rollback_'))
      .sort();
    
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. Execute: ${file}`);
      console.log(`      File location: database/supabase/migrations/${file}`);
      console.log('');
    });
    
    console.log('4. 📊 Create the migrations tracking table:');
    console.log('   Run this SQL in Supabase:');
    console.log('');
    console.log('   CREATE TABLE _migrations (');
    console.log('     id SERIAL PRIMARY KEY,');
    console.log('     filename TEXT NOT NULL UNIQUE,');
    console.log('     executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('     checksum TEXT');
    console.log('   );');
    console.log('');
    
    console.log('5. ✅ Mark migrations as executed:');
    console.log('   Run this SQL to track the executed migrations:');
    console.log('');
    console.log('   INSERT INTO _migrations (filename, checksum) VALUES');
    files.forEach((file, index) => {
      const comma = index < files.length - 1 ? ',' : ';';
      console.log(`     ('${file}', 'manual')${comma}`);
    });
    console.log('');
    
    console.log('6. 🔍 Verify the setup:');
    console.log('   After completing the above steps, run:');
    console.log('   npm run db:status');
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to read migration files:', error.message);
  }
}

/**
 * Check if database is set up
 */
async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...\n');
  
  try {
    // Check if migrations table exists
    const { data: migrationData, error: migrationError } = await supabase
      .from('_migrations')
      .select('filename')
      .limit(1);
    
    if (migrationError && migrationError.code === 'PGRST116') {
      console.log('❌ Migrations table does not exist');
      console.log('   Please follow the setup instructions above.\n');
      return false;
    }
    
    // Check if main tables exist
    const tablesToCheck = ['suppliers', 'customers', 'orders', 'production_batches'];
    let allTablesExist = true;
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error && error.code === 'PGRST116') {
          console.log(`❌ Table '${table}' does not exist`);
          allTablesExist = false;
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`❌ Error checking table '${table}':`, err.message);
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      console.log('\n🎉 Database appears to be set up correctly!');
      
      // Show migration status
      const { data: migrations } = await supabase
        .from('_migrations')
        .select('filename, executed_at')
        .order('executed_at');
      
      if (migrations && migrations.length > 0) {
        console.log('\n📋 Executed Migrations:');
        migrations.forEach(migration => {
          console.log(`   ✅ ${migration.filename}`);
        });
      }
      
      return true;
    } else {
      console.log('\n❌ Database setup is incomplete');
      console.log('   Please follow the setup instructions above.\n');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed to check database status:', error.message);
    return false;
  }
}

/**
 * Show SQL file contents
 */
function showSqlFile(filename) {
  try {
    const filepath = join(MIGRATIONS_DIR, filename);
    const content = readFileSync(filepath, 'utf8');
    
    console.log(`📄 Contents of ${filename}:`);
    console.log('=' .repeat(50));
    console.log(content);
    console.log('=' .repeat(50));
    console.log('');
    
  } catch (error) {
    console.error(`❌ Failed to read ${filename}:`, error.message);
  }
}

// Main execution
const command = process.argv[2];

async function main() {
  switch (command) {
    case 'check':
    case 'status':
      await checkDatabaseStatus();
      break;
    case 'show':
      const filename = process.argv[3];
      if (filename) {
        showSqlFile(filename);
      } else {
        console.log('Usage: node supabase-setup-manual.js show <filename>');
        console.log('Example: node supabase-setup-manual.js show 20250101000001_initial_schema.sql');
      }
      break;
    default:
      showSetupInstructions();
      if (command !== 'help') {
        console.log('\nCommands:');
        console.log('  help     - Show this guide');
        console.log('  check    - Check database status');
        console.log('  show <file> - Show contents of a migration file');
      }
      break;
  }
}

main();
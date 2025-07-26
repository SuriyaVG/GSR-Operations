#!/usr/bin/env node

/**
 * Supabase Migration Runner (Postgres Direct)
 * Executes database migrations for GSR Operations using pg
 */

const { Client } = require('pg');
const { readFileSync, readdirSync } = require('fs');
const { join, dirname } = require('path');
const path = require('path');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '../database/supabase/migrations');
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

if (!SUPABASE_DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL in .env');
  process.exit(1);
}

const client = new Client({ connectionString: SUPABASE_DB_URL });

async function createMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      checksum TEXT
    );
  `);
}

function getMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && !file.startsWith('rollback_'))
    .sort();
}

async function getExecutedMigrations() {
  const res = await client.query('SELECT filename FROM _migrations ORDER BY filename');
  return res.rows.map(row => row.filename);
}

function calculateChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

async function recordMigration(filename, checksum) {
  await client.query('INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)', [filename, checksum]);
}

async function runMigrations() {
  console.log('🚀 Starting database migrations (pg direct)...');
  await client.connect();
  await createMigrationsTable();
  const executed = await getExecutedMigrations();
  const files = getMigrationFiles();
  const pending = files.filter(f => !executed.includes(f));
  if (pending.length === 0) {
    console.log('✅ No pending migrations');
    await client.end();
    return;
  }
  console.log(`⏳ Running ${pending.length} pending migrations...`);
  for (const file of pending) {
    const filepath = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(filepath, 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      const checksum = calculateChecksum(sql);
      await recordMigration(file, checksum);
      await client.query('COMMIT');
      console.log(`   ✅ Completed ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Error in ${file}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log('🎉 All migrations completed successfully!');
}

if (require.main === module) {
  runMigrations();
} 
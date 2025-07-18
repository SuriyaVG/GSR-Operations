#!/usr/bin/env node

/**
 * Supabase Database Seeder
 * Seeds the database with development and test data
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
 * Execute SQL file
 */
async function executeSqlFile(filepath) {
  try {
    const supabase = getSupabaseClient();
    const sql = readFileSync(filepath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.error(`❌ SQL Error in ${filepath}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to execute ${filepath}:`, error.message);
    throw error;
  }
}

/**
 * Seed basic data from migration file
 */
async function seedBasicData() {
  console.log('🌱 Seeding basic data...');
  
  const seedFile = join(__dirname, '../database/supabase/migrations/20250101000003_seed_data.sql');
  
  try {
    await executeSqlFile(seedFile);
    console.log('✅ Basic seed data inserted');
  } catch (error) {
    console.error('❌ Failed to seed basic data:', error.message);
    throw error;
  }
}

/**
 * Seed additional development data
 */
async function seedDevelopmentData() {
  console.log('🌱 Seeding development data...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Get existing data to avoid conflicts
    const { data: existingSuppliers } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1);

    const { data: existingMaterials } = await supabase
      .from('raw_materials')
      .select('id')
      .limit(1);

    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('id')
      .limit(1);

    if (!existingSuppliers?.length || !existingMaterials?.length || !existingCustomers?.length) {
      console.log('⚠️  Basic seed data not found. Running basic seed first...');
      await seedBasicData();
    }

    // Get supplier and material IDs for sample data
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id')
      .limit(3);

    const { data: materials } = await supabase
      .from('raw_materials')
      .select('id')
      .limit(2);

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .limit(4);

    if (!suppliers?.length || !materials?.length || !customers?.length) {
      throw new Error('Required seed data not found');
    }

    // Insert sample material intake logs
    const { error: intakeError } = await supabase
      .from('material_intake_log')
      .upsert([
        {
          supplier_id: suppliers[0].id,
          raw_material_id: materials[0].id,
          lot_number: 'LOT001',
          quantity: 100.0,
          cost_per_unit: 45.00,
          total_cost: 4500.00,
          intake_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          remaining_quantity: 80.0,
          quality_notes: 'Premium quality cream'
        },
        {
          supplier_id: suppliers[1].id,
          raw_material_id: materials[1].id,
          lot_number: 'LOT002',
          quantity: 50.0,
          cost_per_unit: 350.00,
          total_cost: 17500.00,
          intake_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          remaining_quantity: 30.0,
          quality_notes: 'High-quality butter'
        }
      ], { onConflict: 'lot_number' });

    if (intakeError) {
      console.warn('⚠️  Material intake seeding warning:', intakeError.message);
    }

    // Insert sample production batches
    const { error: batchError } = await supabase
      .from('production_batches')
      .upsert([
        {
          batch_number: 'BATCH001',
          production_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          output_litres: 80.0,
          remaining_quantity: 60.0,
          status: 'active',
          quality_grade: 'A',
          total_input_cost: 3600.00,
          cost_per_litre: 45.00,
          yield_percentage: 80.0,
          notes: 'Excellent batch quality'
        },
        {
          batch_number: 'BATCH002',
          production_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          output_litres: 60.0,
          remaining_quantity: 60.0,
          status: 'active',
          quality_grade: 'A',
          total_input_cost: 2700.00,
          cost_per_litre: 45.00,
          yield_percentage: 85.0,
          notes: 'High yield batch'
        }
      ], { onConflict: 'batch_number' });

    if (batchError) {
      console.warn('⚠️  Production batch seeding warning:', batchError.message);
    }

    // Get batch IDs for orders
    const { data: batches } = await supabase
      .from('production_batches')
      .select('id')
      .limit(2);

    if (batches?.length >= 2) {
      // Insert sample orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .upsert([
          {
            customer_id: customers[0].id,
            order_number: 'ORD001',
            order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            total_amount: 6500.00,
            status: 'confirmed',
            payment_status: 'pending',
            notes: 'Bulk order for premium customer'
          },
          {
            customer_id: customers[1].id,
            order_number: 'ORD002',
            order_date: new Date().toISOString(),
            total_amount: 2900.00,
            status: 'processing',
            payment_status: 'paid',
            notes: 'Regular monthly order'
          }
        ], { onConflict: 'order_number' })
        .select('id, order_number');

      if (orderError) {
        console.warn('⚠️  Order seeding warning:', orderError.message);
      } else if (orderData?.length >= 2) {
        // Insert sample order items
        const { error: itemError } = await supabase
          .from('order_items')
          .upsert([
            {
              order_id: orderData[0].id,
              batch_id: batches[0].id,
              product_name: 'Premium Ghee',
              quantity: 10.0,
              unit_price: 650.00,
              packaging_type: '1L Jar',
              total_price: 6500.00
            },
            {
              order_id: orderData[1].id,
              batch_id: batches[1].id,
              product_name: 'Standard Ghee',
              quantity: 5.0,
              unit_price: 580.00,
              packaging_type: '1L Jar',
              total_price: 2900.00
            }
          ]);

        if (itemError) {
          console.warn('⚠️  Order item seeding warning:', itemError.message);
        }

        // Insert sample invoices
        const { error: invoiceError } = await supabase
          .from('invoices')
          .upsert([
            {
              order_id: orderData[0].id,
              invoice_number: 'INV001',
              issue_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              due_date: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
              total_amount: 6500.00,
              paid_amount: 0.00,
              status: 'sent',
              payment_terms: 30
            },
            {
              order_id: orderData[1].id,
              invoice_number: 'INV002',
              issue_date: new Date().toISOString(),
              due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              total_amount: 2900.00,
              paid_amount: 2900.00,
              status: 'paid',
              payment_terms: 15
            }
          ], { onConflict: 'invoice_number' });

        if (invoiceError) {
          console.warn('⚠️  Invoice seeding warning:', invoiceError.message);
        }
      }
    }

    // Insert sample interaction logs
    const { error: interactionError } = await supabase
      .from('interaction_log')
      .upsert([
        {
          customer_id: customers[0].id,
          interaction_type: 'call',
          description: 'Discussed bulk pricing for next quarter',
          follow_up_required: true,
          follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: '00000000-0000-0000-0000-000000000000' // Placeholder user ID
        },
        {
          customer_id: customers[1].id,
          interaction_type: 'email',
          description: 'Sent product catalog and pricing information',
          follow_up_required: false,
          created_by: '00000000-0000-0000-0000-000000000000' // Placeholder user ID
        }
      ]);

    if (interactionError) {
      console.warn('⚠️  Interaction log seeding warning:', interactionError.message);
    }

    // Insert sample samples log
    const { error: samplesError } = await supabase
      .from('samples_log')
      .upsert([
        {
          customer_id: customers[2].id,
          sample_sku: 'SAMPLE-GHEE-1L',
          quantity: 2,
          sent_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          feedback: 'Customer loved the quality and taste',
          converted_to_order: true
        },
        {
          customer_id: customers[3].id,
          sample_sku: 'SAMPLE-GHEE-500ML',
          quantity: 1,
          sent_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          feedback: 'Awaiting customer feedback',
          converted_to_order: false
        }
      ]);

    if (samplesError) {
      console.warn('⚠️  Samples log seeding warning:', samplesError.message);
    }

    console.log('✅ Development data seeded successfully');

  } catch (error) {
    console.error('❌ Failed to seed development data:', error.message);
    throw error;
  }
}

/**
 * Clear all data (for testing)
 */
async function clearData() {
  console.log('🧹 Clearing all data...');
  
  const tables = [
    'financial_ledger',
    'credit_notes',
    'invoices',
    'returns_log',
    'samples_log',
    'interaction_log',
    'order_items',
    'orders',
    'batch_inputs',
    'production_batches',
    'material_intake_log',
    'pricing_rules'
  ];

  try {
    const supabase = getSupabaseClient();
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        console.warn(`⚠️  Warning clearing ${table}:`, error.message);
      } else {
        console.log(`   ✅ Cleared ${table}`);
      }
    }

    console.log('🎉 Data cleared successfully');

  } catch (error) {
    console.error('❌ Failed to clear data:', error.message);
    throw error;
  }
}

// Main execution
const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'basic':
        await seedBasicData();
        break;
      case 'dev':
      case 'development':
        await seedDevelopmentData();
        break;
      case 'all':
        await seedBasicData();
        await seedDevelopmentData();
        break;
      case 'clear':
        await clearData();
        break;
      default:
        console.log('Supabase Database Seeder');
        console.log('========================');
        console.log('');
        console.log('Usage:');
        console.log('  node seed-supabase.js <command>');
        console.log('');
        console.log('Commands:');
        console.log('  basic        - Seed basic data (suppliers, materials, customers, pricing)');
        console.log('  dev          - Seed development data (orders, batches, interactions)');
        console.log('  all          - Seed both basic and development data');
        console.log('  clear        - Clear all seeded data');
        console.log('');
        console.log('Environment Variables:');
        console.log('  SUPABASE_URL or VITE_SUPABASE_URL - Supabase project URL');
        console.log('  SUPABASE_SERVICE_ROLE_KEY         - Service role key');
        break;
    }
  } catch (error) {
    console.error('💥 Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
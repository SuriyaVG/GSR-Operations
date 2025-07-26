// Data Integrity Monitoring Script
// Checks for orphaned records, inventory inconsistencies, and logs violations

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrphanedOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id')
    .not('id', 'in', supabase.from('invoices').select('order_id'));
  if (error) throw error;
  if (orders.length > 0) {
    console.warn('Orphaned orders (no invoice):', orders.map(o => o.id));
  } else {
    console.log('No orphaned orders found.');
  }
}

async function checkOrphanedInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id')
    .not('order_id', 'in', supabase.from('orders').select('id'));
  if (error) throw error;
  if (invoices.length > 0) {
    console.warn('Orphaned invoices (no order):', invoices.map(i => i.id));
  } else {
    console.log('No orphaned invoices found.');
  }
}

async function checkNegativeInventory() {
  const { data: batches, error } = await supabase
    .from('material_intake_log')
    .select('id, remaining_quantity')
    .lt('remaining_quantity', 0);
  if (error) throw error;
  if (batches.length > 0) {
    console.warn('Negative inventory detected:', batches.map(b => b.id));
  } else {
    console.log('No negative inventory found.');
  }
}

async function runChecks() {
  try {
    await checkOrphanedOrders();
    await checkOrphanedInvoices();
    await checkNegativeInventory();
    console.log('Data integrity checks complete.');
  } catch (err) {
    console.error('Error during data integrity checks:', err.message);
  }
}

runChecks();
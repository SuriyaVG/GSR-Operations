// scripts/repair-data-integrity.js
// Script to repair data integrity issues in the database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Repair orphaned orders (create missing invoices)
async function repairOrphanedOrders() {
  console.log('\n=== Repairing Orphaned Orders ===');
  
  try {
    // Find orphaned orders
    const { data: orphanedOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, total_amount, created_at')
      .not('id', 'in', (
        supabase.from('invoices').select('order_id')
      ));

    if (error) {
      console.error('Error finding orphaned orders:', error);
      return { success: false, repaired: 0 };
    }

    if (!orphanedOrders || orphanedOrders.length === 0) {
      console.log('No orphaned orders to repair');
      return { success: true, repaired: 0 };
    }

    console.log(`Found ${orphanedOrders.length} orphaned orders to repair`);
    let repairedCount = 0;

    // Create missing invoices for each orphaned order
    for (const order of orphanedOrders) {
      try {
        // Generate invoice number
        const { data: invoiceCount, error: countError } = await supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true });
        
        if (countError) {
          console.error(`Error getting invoice count for order ${order.order_number}:`, countError);
          continue;
        }
        
        const count = invoiceCount || 0;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
        
        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            order_id: order.id,
            invoice_number: invoiceNumber,
            issue_date: order.created_at,
            due_date: new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Due in 30 days
            total_amount: order.total_amount,
            paid_amount: 0,
            status: 'draft',
            payment_terms: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (invoiceError) {
          console.error(`Error creating invoice for order ${order.order_number}:`, invoiceError);
          continue;
        }
        
        // Create financial ledger entry
        const { error: ledgerError } = await supabase
          .from('financial_ledger')
          .insert({
            transaction_type: 'invoice',
            reference_id: invoice.id,
            reference_type: 'invoice',
            customer_id: order.customer_id,
            amount: order.total_amount,
            description: `Invoice ${invoiceNumber} for Order ${order.order_number}`,
            transaction_date: new Date().toISOString(),
            created_by: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (ledgerError) {
          console.error(`Error creating ledger entry for invoice ${invoiceNumber}:`, ledgerError);
          continue;
        }
        
        console.log(`✓ Created invoice ${invoiceNumber} for order ${order.order_number}`);
        repairedCount++;
      } catch (err) {
        console.error(`Error repairing order ${order.order_number}:`, err);
      }
    }

    console.log(`Successfully repaired ${repairedCount} of ${orphanedOrders.length} orphaned orders`);
    return { success: true, repaired: repairedCount };
  } catch (error) {
    console.error('Error repairing orphaned orders:', error);
    return { success: false, repaired: 0 };
  }
}

// Repair orphaned invoices (delete them or create missing orders)
async function repairOrphanedInvoices() {
  console.log('\n=== Repairing Orphaned Invoices ===');
  
  try {
    // Find orphaned invoices
    const { data: orphanedInvoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, order_id, total_amount, created_at')
      .not('order_id', 'in', (
        supabase.from('orders').select('id')
      ));

    if (error) {
      console.error('Error finding orphaned invoices:', error);
      return { success: false, repaired: 0 };
    }

    if (!orphanedInvoices || orphanedInvoices.length === 0) {
      console.log('No orphaned invoices to repair');
      return { success: true, repaired: 0 };
    }

    console.log(`Found ${orphanedInvoices.length} orphaned invoices to repair`);
    
    // Ask for confirmation before deleting orphaned invoices
    console.log('WARNING: This will delete orphaned invoices. Press Ctrl+C to cancel.');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for user to cancel
    
    let repairedCount = 0;

    // Delete orphaned invoices
    for (const invoice of orphanedInvoices) {
      try {
        // First delete any financial ledger entries
        const { error: ledgerError } = await supabase
          .from('financial_ledger')
          .delete()
          .eq('reference_id', invoice.id)
          .eq('reference_type', 'invoice');
        
        if (ledgerError) {
          console.error(`Error deleting ledger entries for invoice ${invoice.invoice_number}:`, ledgerError);
          continue;
        }
        
        // Then delete the invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id);
        
        if (invoiceError) {
          console.error(`Error deleting invoice ${invoice.invoice_number}:`, invoiceError);
          continue;
        }
        
        console.log(`✓ Deleted orphaned invoice ${invoice.invoice_number}`);
        repairedCount++;
      } catch (err) {
        console.error(`Error repairing invoice ${invoice.invoice_number}:`, err);
      }
    }

    console.log(`Successfully repaired ${repairedCount} of ${orphanedInvoices.length} orphaned invoices`);
    return { success: true, repaired: repairedCount };
  } catch (error) {
    console.error('Error repairing orphaned invoices:', error);
    return { success: false, repaired: 0 };
  }
}

// Repair orphaned production batches (delete them)
async function repairOrphanedProductionBatches() {
  console.log('\n=== Repairing Orphaned Production Batches ===');
  
  try {
    // Find orphaned production batches
    const { data: orphanedBatches, error } = await supabase
      .from('production_batches')
      .select('id, batch_number, created_at')
      .not('id', 'in', (
        supabase.from('batch_inputs').select('batch_id')
      ));

    if (error) {
      console.error('Error finding orphaned production batches:', error);
      return { success: false, repaired: 0 };
    }

    if (!orphanedBatches || orphanedBatches.length === 0) {
      console.log('No orphaned production batches to repair');
      return { success: true, repaired: 0 };
    }

    console.log(`Found ${orphanedBatches.length} orphaned production batches to repair`);
    
    // Ask for confirmation before deleting orphaned batches
    console.log('WARNING: This will delete orphaned production batches. Press Ctrl+C to cancel.');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for user to cancel
    
    let repairedCount = 0;

    // Delete orphaned production batches
    for (const batch of orphanedBatches) {
      try {
        // Delete the batch
        const { error: batchError } = await supabase
          .from('production_batches')
          .delete()
          .eq('id', batch.id);
        
        if (batchError) {
          console.error(`Error deleting production batch ${batch.batch_number}:`, batchError);
          continue;
        }
        
        console.log(`✓ Deleted orphaned production batch ${batch.batch_number}`);
        repairedCount++;
      } catch (err) {
        console.error(`Error repairing production batch ${batch.batch_number}:`, err);
      }
    }

    console.log(`Successfully repaired ${repairedCount} of ${orphanedBatches.length} orphaned production batches`);
    return { success: true, repaired: repairedCount };
  } catch (error) {
    console.error('Error repairing orphaned production batches:', error);
    return { success: false, repaired: 0 };
  }
}

// Repair orphaned batch inputs (delete them)
async function repairOrphanedBatchInputs() {
  console.log('\n=== Repairing Orphaned Batch Inputs ===');
  
  try {
    // Find orphaned batch inputs
    const { data: orphanedInputs, error } = await supabase
      .from('batch_inputs')
      .select('id, batch_id, material_intake_id, created_at')
      .not('batch_id', 'in', (
        supabase.from('production_batches').select('id')
      ));

    if (error) {
      console.error('Error finding orphaned batch inputs:', error);
      return { success: false, repaired: 0 };
    }

    if (!orphanedInputs || orphanedInputs.length === 0) {
      console.log('No orphaned batch inputs to repair');
      return { success: true, repaired: 0 };
    }

    console.log(`Found ${orphanedInputs.length} orphaned batch inputs to repair`);
    
    // Ask for confirmation before deleting orphaned inputs
    console.log('WARNING: This will delete orphaned batch inputs. Press Ctrl+C to cancel.');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for user to cancel
    
    let repairedCount = 0;

    // Delete orphaned batch inputs
    for (const input of orphanedInputs) {
      try {
        // Delete the input
        const { error: inputError } = await supabase
          .from('batch_inputs')
          .delete()
          .eq('id', input.id);
        
        if (inputError) {
          console.error(`Error deleting batch input ${input.id}:`, inputError);
          continue;
        }
        
        console.log(`✓ Deleted orphaned batch input ${input.id}`);
        repairedCount++;
      } catch (err) {
        console.error(`Error repairing batch input ${input.id}:`, err);
      }
    }

    console.log(`Successfully repaired ${repairedCount} of ${orphanedInputs.length} orphaned batch inputs`);
    return { success: true, repaired: repairedCount };
  } catch (error) {
    console.error('Error repairing orphaned batch inputs:', error);
    return { success: false, repaired: 0 };
  }
}

// Repair inventory inconsistencies (fix negative quantities)
async function repairInventoryConsistency() {
  console.log('\n=== Repairing Inventory Inconsistencies ===');
  
  try {
    // Find inventory records with negative quantities
    const { data: negativeInventory, error } = await supabase
      .from('material_intake_log')
      .select('id, raw_material_id, lot_number, remaining_quantity')
      .lt('remaining_quantity', 0);

    if (error) {
      console.error('Error finding negative inventory:', error);
      return { success: false, repaired: 0 };
    }

    if (!negativeInventory || negativeInventory.length === 0) {
      console.log('No negative inventory quantities to repair');
      return { success: true, repaired: 0 };
    }

    console.log(`Found ${negativeInventory.length} inventory records with negative quantities`);
    let repairedCount = 0;

    // Fix negative quantities by setting them to 0
    for (const item of negativeInventory) {
      try {
        // Update the inventory record
        const { error: updateError } = await supabase
          .from('material_intake_log')
          .update({ 
            remaining_quantity: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`Error updating inventory record ${item.id}:`, updateError);
          continue;
        }
        
        // Create an audit log entry
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            table_name: 'material_intake_log',
            record_id: item.id,
            action: 'update',
            old_values: JSON.stringify({ remaining_quantity: item.remaining_quantity }),
            new_values: JSON.stringify({ remaining_quantity: 0 }),
            changed_by: 'system',
            reason: 'Data integrity repair: Fixed negative inventory quantity',
            created_at: new Date().toISOString()
          });
        
        if (auditError) {
          console.error(`Error creating audit log for inventory record ${item.id}:`, auditError);
        }
        
        console.log(`✓ Fixed negative quantity for material ${item.raw_material_id} lot ${item.lot_number}: ${item.remaining_quantity} → 0`);
        repairedCount++;
      } catch (err) {
        console.error(`Error repairing inventory record ${item.id}:`, err);
      }
    }

    console.log(`Successfully repaired ${repairedCount} of ${negativeInventory.length} negative inventory records`);
    return { success: true, repaired: repairedCount };
  } catch (error) {
    console.error('Error repairing inventory consistency:', error);
    return { success: false, repaired: 0 };
  }
}

// Repair financial ledger inconsistencies
async function repairFinancialLedgerConsistency() {
  console.log('\n=== Repairing Financial Ledger Inconsistencies ===');
  
  try {
    // Find orphaned ledger entries (referencing non-existent invoices)
    const { data: orphanedEntries, error } = await supabase
      .from('financial_ledger')
      .select('id, reference_id, reference_type, amount, created_at')
      .eq('reference_type', 'invoice')
      .not('reference_id', 'in', (
        supabase.from('invoices').select('id')
      ));

    if (error) {
      console.error('Error finding orphaned ledger entries:', error);
      return { success: false, repaired: 0 };
    }

    if (!orphanedEntries || orphanedEntries.length === 0) {
      console.log('No orphaned financial ledger entries to repair');
      
      // Check for invoices without ledger entries
      const { data: invoicesWithoutLedger, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, order_id, total_amount, customer_id')
        .not('id', 'in', (
          supabase.from('financial_ledger')
            .select('reference_id')
            .eq('reference_type', 'invoice')
        ));
        
      if (invoiceError) {
        console.error('Error finding invoices without ledger entries:', invoiceError);
        return { success: true, repaired: 0 };
      }
      
      if (!invoicesWithoutLedger || invoicesWithoutLedger.length === 0) {
        console.log('No invoices without ledger entries to repair');
        return { success: true, repaired: 0 };
      }
      
      console.log(`Found ${invoicesWithoutLedger.length} invoices without ledger entries`);
      let repairedCount = 0;
      
      // Create missing ledger entries
      for (const invoice of invoicesWithoutLedger) {
        try {
          // Get order details to find customer_id if needed
          let customerId = invoice.customer_id;
          
          if (!customerId && invoice.order_id) {
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .select('customer_id')
              .eq('id', invoice.order_id)
              .single();
              
            if (orderError) {
              console.error(`Error getting order details for invoice ${invoice.invoice_number}:`, orderError);
            } else if (order) {
              customerId = order.customer_id;
            }
          }
          
          if (!customerId) {
            console.error(`Cannot create ledger entry for invoice ${invoice.invoice_number}: No customer ID found`);
            continue;
          }
          
          // Create ledger entry
          const { error: ledgerError } = await supabase
            .from('financial_ledger')
            .insert({
              transaction_type: 'invoice',
              reference_id: invoice.id,
              reference_type: 'invoice',
              customer_id: customerId,
              amount: invoice.total_amount,
              description: `Invoice ${invoice.invoice_number}`,
              transaction_date: new Date().toISOString(),
              created_by: 'system',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (ledgerError) {
            console.error(`Error creating ledger entry for invoice ${invoice.invoice_number}:`, ledgerError);
            continue;
          }
          
          console.log(`✓ Created ledger entry for invoice ${invoice.invoice_number}`);
          repairedCount++;
        } catch (err) {
          console.error(`Error creating ledger entry for invoice ${invoice.invoice_number}:`, err);
        }
      }
      
      console.log(`Successfully created ${repairedCount} of ${invoicesWithoutLedger.length} missing ledger entries`);
      return { success: true, repaired: repairedCount };
    }

    console.log(`Found ${orphanedEntries.length} orphaned financial ledger entries to repair`);
    
    // Ask for confirmation before deleting orphaned ledger entries
    console.log('WARNING: This will delete orphaned financial ledger entries. Press Ctrl+C to cancel.');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for user to cancel
    
    let repairedCount = 0;

    // Delete orphaned ledger entries
    for (const entry of orphanedEntries) {
      try {
        // Delete the ledger entry
        const { error: deleteError } = await supabase
          .from('financial_ledger')
          .delete()
          .eq('id', entry.id);
        
        if (deleteError) {
          console.error(`Error deleting ledger entry ${entry.id}:`, deleteError);
          continue;
        }
        
        console.log(`✓ Deleted orphaned ledger entry ${entry.id}`);
        repairedCount++;
      } catch (err) {
        console.error(`Error repairing ledger entry ${entry.id}:`, err);
      }
    }

    console.log(`Successfully repaired ${repairedCount} of ${orphanedEntries.length} orphaned ledger entries`);
    return { success: true, repaired: repairedCount };
  } catch (error) {
    console.error('Error repairing financial ledger consistency:', error);
    return { success: false, repaired: 0 };
  }
}

// Main function
async function main() {
  console.log('=== Data Integrity Repair ===');
  console.log('Repairing database data consistency issues...');
  
  try {
    // Run all repair functions
    const ordersResult = await repairOrphanedOrders();
    const invoicesResult = await repairOrphanedInvoices();
    const batchesResult = await repairOrphanedProductionBatches();
    const inputsResult = await repairOrphanedBatchInputs();
    const inventoryResult = await repairInventoryConsistency();
    const financialResult = await repairFinancialLedgerConsistency();
    
    // Summarize results
    console.log('\n=== Data Integrity Repair Summary ===');
    console.log(`Orphaned Orders: ${ordersResult.repaired} repaired`);
    console.log(`Orphaned Invoices: ${invoicesResult.repaired} repaired`);
    console.log(`Orphaned Production Batches: ${batchesResult.repaired} repaired`);
    console.log(`Orphaned Batch Inputs: ${inputsResult.repaired} repaired`);
    console.log(`Inventory Inconsistencies: ${inventoryResult.repaired} repaired`);
    console.log(`Financial Ledger Inconsistencies: ${financialResult.repaired} repaired`);
    
    const totalRepaired = 
      ordersResult.repaired + 
      invoicesResult.repaired + 
      batchesResult.repaired + 
      inputsResult.repaired + 
      inventoryResult.repaired + 
      financialResult.repaired;
    
    if (totalRepaired === 0) {
      console.log('\n✅ No data integrity issues needed repair!');
    } else {
      console.log(`\n✅ Successfully repaired ${totalRepaired} data integrity issues.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error running data integrity repairs:', error);
    process.exit(1);
  }
}

// Run the main function
main();
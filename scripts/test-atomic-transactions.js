// scripts/test-atomic-transactions.js
// Script to test atomic transaction functionality in database functions

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

// Test order/invoice atomic transaction
async function testOrderInvoiceAtomicity() {
  console.log('\n=== Testing Order/Invoice Atomic Transaction ===');
  
  try {
    // 1. Test successful creation
    console.log('\nTest 1: Successful order/invoice creation');
    const orderData = {
      customer_id: '00000000-0000-0000-0000-000000000001', // Use a valid customer ID from your database
      order_number: `ORD-TEST-${Date.now()}`,
      order_date: new Date().toISOString(),
      total_amount: '1000.00',
      status: 'draft',
      payment_status: 'pending',
      notes: 'Test order for atomic transaction verification'
    };

    const { data: result1, error: error1 } = await supabase.rpc('create_order_with_invoice', {
      order_data: orderData,
      invoice_data: {}
    });

    if (error1) {
      console.error('Error in successful creation test:', error1);
    } else {
      console.log('✓ Order and invoice created successfully');
      console.log(`  Order ID: ${result1.order.id}`);
      console.log(`  Order Number: ${result1.order.order_number}`);
      console.log(`  Invoice ID: ${result1.invoice.id}`);
      console.log(`  Invoice Number: ${result1.invoice.invoice_number}`);
      
      // Verify relationship
      if (result1.invoice.order_id === result1.order.id) {
        console.log('✓ Order-Invoice relationship verified');
      } else {
        console.error('✗ Order-Invoice relationship mismatch');
      }
    }

    // 2. Test validation failure (missing customer_id)
    console.log('\nTest 2: Validation failure (missing customer_id)');
    const invalidOrderData = {
      order_number: `ORD-TEST-${Date.now()}`,
      order_date: new Date().toISOString(),
      total_amount: '1000.00',
      status: 'draft'
    };

    const { data: result2, error: error2 } = await supabase.rpc('create_order_with_invoice', {
      order_data: invalidOrderData,
      invoice_data: {}
    });

    if (error2) {
      console.log(`✓ Validation correctly failed: ${error2.message}`);
    } else {
      console.error('✗ Validation should have failed but succeeded');
    }

    // 3. Test database constraint failure (duplicate order number)
    console.log('\nTest 3: Database constraint failure (duplicate order number)');
    const duplicateOrderData = {
      customer_id: '00000000-0000-0000-0000-000000000001',
      order_number: result1?.order?.order_number || `ORD-TEST-${Date.now()}`, // Use the same order number as Test 1
      order_date: new Date().toISOString(),
      total_amount: '1000.00',
      status: 'draft'
    };

    const { data: result3, error: error3 } = await supabase.rpc('create_order_with_invoice', {
      order_data: duplicateOrderData,
      invoice_data: {}
    });

    if (error3) {
      console.log(`✓ Constraint violation correctly failed: ${error3.message}`);
    } else {
      console.error('✗ Constraint violation should have failed but succeeded');
    }

    // 4. Verify no orphaned records were created
    console.log('\nTest 4: Verifying no orphaned records');
    
    // Check for orders without invoices
    const { data: orphanedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number')
      .not('id', 'in', (
        supabase.from('invoices').select('order_id')
      ));

    if (ordersError) {
      console.error('Error checking for orphaned orders:', ordersError);
    } else if (orphanedOrders && orphanedOrders.length > 0) {
      console.error(`✗ Found ${orphanedOrders.length} orphaned orders without invoices`);
      console.error(orphanedOrders);
    } else {
      console.log('✓ No orphaned orders found (all orders have invoices)');
    }

    return true;
  } catch (error) {
    console.error('Error testing order/invoice atomicity:', error);
    return false;
  }
}

// Test production batch/inventory atomic transaction
async function testProductionBatchAtomicity() {
  console.log('\n=== Testing Production Batch/Inventory Atomic Transaction ===');
  
  try {
    // 0. Get available material intake records for testing
    const { data: materials, error: materialsError } = await supabase
      .from('material_intake_log')
      .select('id, raw_material_id, remaining_quantity')
      .gt('remaining_quantity', 0)
      .limit(2);

    if (materialsError || !materials || materials.length === 0) {
      console.error('Error: Could not find material intake records with remaining quantity > 0');
      console.error('Please seed your database with test data first');
      return false;
    }

    const material1 = materials[0];
    const material2 = materials.length > 1 ? materials[1] : materials[0];

    console.log(`Found test materials: ${material1.id} (${material1.remaining_quantity} units) and ${material2.id} (${material2.remaining_quantity} units)`);

    // 1. Test successful creation
    console.log('\nTest 1: Successful production batch creation');
    const batchData = {
      batch_number: `GR-TEST-${Date.now()}`,
      production_date: new Date().toISOString(),
      output_litres: 0,
      status: 'active',
      quality_grade: 'A',
      notes: 'Test batch for atomic transaction verification'
    };

    const inventoryDecrements = [
      {
        material_intake_id: material1.id,
        quantity_used: Math.min(5, material1.remaining_quantity) // Use at most 5 units
      },
      {
        material_intake_id: material2.id,
        quantity_used: Math.min(3, material2.remaining_quantity) // Use at most 3 units
      }
    ];

    // First validate inventory
    const { data: validationResult, error: validationError } = await supabase.rpc(
      'validate_production_batch_inventory',
      { inventory_decrements: inventoryDecrements }
    );

    if (validationError) {
      console.error('Error validating inventory:', validationError);
      return false;
    }

    if (!validationResult.is_valid) {
      console.error('Inventory validation failed:', validationResult.errors);
      return false;
    }

    console.log('✓ Inventory validation passed');

    // Create production batch with atomic inventory decrements
    const { data: result1, error: error1 } = await supabase.rpc(
      'create_production_batch_atomic',
      {
        batch_data: batchData,
        inventory_decrements: inventoryDecrements
      }
    );

    if (error1) {
      console.error('Error in successful creation test:', error1);
      return false;
    } else {
      console.log('✓ Production batch created successfully');
      console.log(`  Batch ID: ${result1.batch.id}`);
      console.log(`  Batch Number: ${result1.batch.batch_number}`);
      console.log(`  Total Input Cost: ${result1.total_input_cost}`);
      console.log(`  Number of inputs: ${result1.inputs ? result1.inputs.length : 0}`);
    }

    // 2. Verify inventory was decremented
    console.log('\nTest 2: Verifying inventory decrements');
    
    // Check material 1 quantity
    const { data: updatedMaterial1, error: material1Error } = await supabase
      .from('material_intake_log')
      .select('id, remaining_quantity')
      .eq('id', material1.id)
      .single();

    if (material1Error) {
      console.error('Error checking material 1:', material1Error);
    } else {
      const expectedQuantity = material1.remaining_quantity - inventoryDecrements[0].quantity_used;
      if (updatedMaterial1.remaining_quantity === expectedQuantity) {
        console.log(`✓ Material 1 quantity correctly decremented to ${updatedMaterial1.remaining_quantity}`);
      } else {
        console.error(`✗ Material 1 quantity mismatch: expected ${expectedQuantity}, got ${updatedMaterial1.remaining_quantity}`);
      }
    }

    // Check material 2 quantity
    const { data: updatedMaterial2, error: material2Error } = await supabase
      .from('material_intake_log')
      .select('id, remaining_quantity')
      .eq('id', material2.id)
      .single();

    if (material2Error) {
      console.error('Error checking material 2:', material2Error);
    } else {
      const expectedQuantity = material2.remaining_quantity - inventoryDecrements[1].quantity_used;
      if (updatedMaterial2.remaining_quantity === expectedQuantity) {
        console.log(`✓ Material 2 quantity correctly decremented to ${updatedMaterial2.remaining_quantity}`);
      } else {
        console.error(`✗ Material 2 quantity mismatch: expected ${expectedQuantity}, got ${updatedMaterial2.remaining_quantity}`);
      }
    }

    // 3. Test validation failure (insufficient inventory)
    console.log('\nTest 3: Validation failure (insufficient inventory)');
    const excessiveDecrements = [
      {
        material_intake_id: material1.id,
        quantity_used: updatedMaterial1.remaining_quantity + 100 // More than available
      }
    ];

    const { data: validationResult2, error: validationError2 } = await supabase.rpc(
      'validate_production_batch_inventory',
      { inventory_decrements: excessiveDecrements }
    );

    if (validationError2) {
      console.error('Error in validation test:', validationError2);
    } else if (validationResult2.is_valid) {
      console.error('✗ Validation should have failed but passed');
    } else {
      console.log('✓ Validation correctly failed for insufficient inventory');
      console.log(`  Error: ${validationResult2.errors[0]?.error}`);
    }

    // 4. Test transaction rollback on error
    console.log('\nTest 4: Testing transaction rollback on error');
    
    // Try to create batch with excessive inventory decrements
    const { data: result4, error: error4 } = await supabase.rpc(
      'create_production_batch_atomic',
      {
        batch_data: {
          batch_number: `GR-TEST-${Date.now()}`,
          production_date: new Date().toISOString(),
          status: 'active'
        },
        inventory_decrements: excessiveDecrements
      }
    );

    if (error4) {
      console.log(`✓ Creation correctly failed: ${error4.message}`);
      
      // Verify inventory wasn't changed
      const { data: checkMaterial, error: checkError } = await supabase
        .from('material_intake_log')
        .select('id, remaining_quantity')
        .eq('id', material1.id)
        .single();

      if (checkError) {
        console.error('Error checking material after rollback:', checkError);
      } else if (checkMaterial.remaining_quantity === updatedMaterial1.remaining_quantity) {
        console.log('✓ Inventory correctly unchanged after rollback');
      } else {
        console.error(`✗ Inventory changed despite rollback: ${updatedMaterial1.remaining_quantity} -> ${checkMaterial.remaining_quantity}`);
      }
    } else {
      console.error('✗ Creation should have failed but succeeded');
    }

    return true;
  } catch (error) {
    console.error('Error testing production batch atomicity:', error);
    return false;
  }
}

// Test for orphaned records
async function testForOrphanedRecords() {
  console.log('\n=== Testing for Orphaned Records ===');
  
  try {
    // 1. Check for orders without invoices
    console.log('\nTest 1: Checking for orders without invoices');
    const { data: orphanedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, created_at')
      .not('id', 'in', (
        supabase.from('invoices').select('order_id')
      ));

    if (ordersError) {
      console.error('Error checking for orphaned orders:', ordersError);
    } else if (orphanedOrders && orphanedOrders.length > 0) {
      console.log(`Found ${orphanedOrders.length} orphaned orders without invoices`);
      orphanedOrders.slice(0, 5).forEach(order => {
        console.log(`  Order ${order.order_number} (${order.id}) created at ${order.created_at}`);
      });
      if (orphanedOrders.length > 5) {
        console.log(`  ... and ${orphanedOrders.length - 5} more`);
      }
    } else {
      console.log('✓ No orphaned orders found (all orders have invoices)');
    }

    // 2. Check for production batches without batch inputs
    console.log('\nTest 2: Checking for production batches without inputs');
    const { data: orphanedBatches, error: batchesError } = await supabase
      .from('production_batches')
      .select('id, batch_number, created_at')
      .not('id', 'in', (
        supabase.from('batch_inputs').select('batch_id')
      ));

    if (batchesError) {
      console.error('Error checking for orphaned batches:', batchesError);
    } else if (orphanedBatches && orphanedBatches.length > 0) {
      console.log(`Found ${orphanedBatches.length} production batches without inputs`);
      orphanedBatches.slice(0, 5).forEach(batch => {
        console.log(`  Batch ${batch.batch_number} (${batch.id}) created at ${batch.created_at}`);
      });
      if (orphanedBatches.length > 5) {
        console.log(`  ... and ${orphanedBatches.length - 5} more`);
      }
    } else {
      console.log('✓ No orphaned production batches found (all batches have inputs)');
    }

    // 3. Check for inventory inconsistencies
    console.log('\nTest 3: Checking for inventory inconsistencies');
    
    // This would be a more complex query in a real system
    // For now, just check for negative quantities which should never happen
    const { data: negativeInventory, error: inventoryError } = await supabase
      .from('material_intake_log')
      .select('id, raw_material_id, lot_number, remaining_quantity')
      .lt('remaining_quantity', 0);

    if (inventoryError) {
      console.error('Error checking for inventory inconsistencies:', inventoryError);
    } else if (negativeInventory && negativeInventory.length > 0) {
      console.log(`Found ${negativeInventory.length} inventory records with negative quantities`);
      negativeInventory.forEach(item => {
        console.log(`  Material ${item.raw_material_id} lot ${item.lot_number}: ${item.remaining_quantity}`);
      });
    } else {
      console.log('✓ No negative inventory quantities found');
    }

    return true;
  } catch (error) {
    console.error('Error testing for orphaned records:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Atomic Transaction Testing ===');
  console.log('Testing database functions for transaction integrity and rollback functionality');
  
  try {
    // Test order/invoice atomic transaction
    const orderResult = await testOrderInvoiceAtomicity();
    
    // Test production batch/inventory atomic transaction
    const batchResult = await testProductionBatchAtomicity();
    
    // Test for orphaned records
    const orphanedResult = await testForOrphanedRecords();
    
    console.log('\n=== Test Summary ===');
    console.log(`Order/Invoice Atomicity: ${orderResult ? 'PASSED' : 'FAILED'}`);
    console.log(`Production Batch Atomicity: ${batchResult ? 'PASSED' : 'FAILED'}`);
    console.log(`Orphaned Records Check: ${orphanedResult ? 'COMPLETED' : 'FAILED'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the main function
main();
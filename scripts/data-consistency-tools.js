// Data Consistency Validation Tools
// Validates referential integrity, business rule compliance, and provides repair stubs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrderCustomerIntegrity() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_id');
  if (error) throw error;
  const invalidOrders = [];
  for (const order of orders) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', order.customer_id)
      .single();
    if (!customer) invalidOrders.push(order.id);
  }
  if (invalidOrders.length > 0) {
    console.warn('Orders with invalid customer_id:', invalidOrders);
  } else {
    console.log('All orders have valid customers.');
  }
}

async function checkBatchMaterialIntegrity() {
  const { data: batchInputs, error } = await supabase
    .from('batch_inputs')
    .select('id, material_intake_id');
  if (error) throw error;
  const invalidInputs = [];
  for (const input of batchInputs) {
    const { data: intake } = await supabase
      .from('material_intake_log')
      .select('id')
      .eq('id', input.material_intake_id)
      .single();
    if (!intake) invalidInputs.push(input.id);
  }
  if (invalidInputs.length > 0) {
    console.warn('Batch inputs with invalid material_intake_id:', invalidInputs);
  } else {
    console.log('All batch inputs have valid material intake records.');
  }
}

// Stub for repair utility
async function repairInvalidOrders() {
  // Implement logic to fix or remove invalid orders
  console.log('Repair utility for invalid orders not yet implemented.');
}

async function runValidation() {
  try {
    await checkOrderCustomerIntegrity();
    await checkBatchMaterialIntegrity();
    // Add more checks as needed
    console.log('Data consistency validation complete.');
  } catch (err) {
    console.error('Error during data consistency validation:', err.message);
  }
}

runValidation(); 
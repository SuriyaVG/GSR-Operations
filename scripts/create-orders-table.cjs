const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createOrdersTable() {
  console.log('🔧 Creating orders table...');
  
  try {
    // Create orders table
    const ordersTableSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id),
        order_number TEXT NOT NULL UNIQUE,
        order_date TIMESTAMP WITH TIME ZONE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status order_status DEFAULT 'draft',
        payment_status payment_status DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: ordersError } = await supabase.rpc('exec_sql', { sql: ordersTableSQL });
    
    if (ordersError) {
      console.error('❌ Error creating orders table:', ordersError.message);
    } else {
      console.log('✅ Orders table created successfully');
    }
    
    // Create order_items table
    const orderItemsSQL = `
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id),
        batch_id UUID NOT NULL REFERENCES production_batches(id),
        product_name TEXT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        packaging_type TEXT NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: itemsError } = await supabase.rpc('exec_sql', { sql: orderItemsSQL });
    
    if (itemsError) {
      console.error('❌ Error creating order_items table:', itemsError.message);
    } else {
      console.log('✅ Order_items table created successfully');
    }
    
    // Test the tables
    console.log('\n🧪 Testing orders table...');
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    
    if (error) {
      console.error('❌ Orders table test failed:', error.message);
    } else {
      console.log('✅ Orders table is accessible');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

createOrdersTable();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrdersTable() {
  console.log('🔍 Checking orders table...');
  
  try {
    // Try to query orders table
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    
    if (error) {
      console.error('❌ Orders table error:', error.message);
      
      // Check if table exists using SQL query
      const { data: tableExists, error: schemaError } = await supabase.rpc('exec_sql', {
        sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders'"
      });
        
      if (schemaError) {
        console.error('❌ Schema check error:', schemaError.message);
      } else if (tableExists && tableExists.length > 0) {
        console.log('✅ Orders table exists in schema');
      } else {
        console.log('❌ Orders table does not exist in schema');
      }
    } else {
      console.log('✅ Orders table accessible, sample data:', data);
    }
    
    // List all tables using SQL
    console.log('\n📋 Checking all public tables...');
    const { data: allTables, error: allTablesError } = await supabase.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    });
      
    if (allTablesError) {
      console.error('❌ Error listing tables:', allTablesError.message);
    } else {
      console.log('Available tables:', allTables.map(t => t.table_name).join(', '));
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkOrdersTable();
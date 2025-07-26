#!/usr/bin/env node

/**
 * Create Order/Invoice Function
 * Creates the atomic order and invoice creation function
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createFunction() {
  console.log('🚀 Creating order/invoice function...');
  
  try {
    // First create the sequence
    console.log('📝 Creating invoice sequence...');
    const { error: seqError } = await supabase
      .from('_sql')
      .insert({ query: 'CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;' });
    
    if (seqError) {
      console.log('⚠️  Sequence creation result:', seqError);
    }
    
    // Create the function using a simpler approach
    const functionSQL = `
CREATE OR REPLACE FUNCTION create_order_with_invoice(
  order_data JSONB,
  invoice_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  new_order orders%ROWTYPE;
  new_invoice invoices%ROWTYPE;
  result JSONB;
  invoice_number TEXT;
  payment_terms INTEGER;
  due_date TIMESTAMP;
BEGIN
  -- Validate required order data
  IF order_data->>'customer_id' IS NULL THEN
    RAISE EXCEPTION 'customer_id is required';
  END IF;
  
  IF order_data->>'total_amount' IS NULL THEN
    RAISE EXCEPTION 'total_amount is required';
  END IF;

  -- Insert order
  INSERT INTO orders (
    customer_id,
    order_number,
    order_date,
    total_amount,
    status,
    payment_status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    (order_data->>'customer_id')::UUID,
    order_data->>'order_number',
    COALESCE((order_data->>'order_date')::TIMESTAMP, NOW()),
    (order_data->>'total_amount')::DECIMAL,
    COALESCE(order_data->>'status', 'pending'),
    COALESCE(order_data->>'payment_status', 'pending'),
    order_data->>'notes',
    NOW(),
    NOW()
  ) RETURNING * INTO new_order;

  -- Generate invoice number
  invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_sequence')::TEXT, 4, '0');
  
  -- Determine payment terms (default to 30)
  payment_terms := COALESCE(
    (invoice_data->>'payment_terms')::INTEGER,
    30
  );
  
  -- Calculate due date
  due_date := COALESCE(
    (invoice_data->>'due_date')::TIMESTAMP,
    NOW() + (payment_terms || ' days')::INTERVAL
  );

  -- Insert invoice
  INSERT INTO invoices (
    order_id,
    invoice_number,
    issue_date,
    due_date,
    total_amount,
    paid_amount,
    status,
    payment_terms,
    created_at,
    updated_at
  ) VALUES (
    new_order.id,
    invoice_number,
    COALESCE((invoice_data->>'issue_date')::TIMESTAMP, NOW()),
    due_date,
    new_order.total_amount,
    0,
    'draft',
    payment_terms,
    NOW(),
    NOW()
  ) RETURNING * INTO new_invoice;

  -- Build result object
  SELECT jsonb_build_object(
    'order', to_jsonb(new_order),
    'invoice', to_jsonb(new_invoice)
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- All changes are automatically rolled back on exception
    RAISE EXCEPTION 'Failed to create order and invoice: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    console.log('📝 Creating function...');
    
    // Try to create the function by calling it directly
    const { data, error } = await supabase.rpc('create_order_with_invoice', {
      order_data: { test: true }
    });
    
    if (error && error.code === 'PGRST202') {
      console.log('✅ Function does not exist yet, this is expected');
      console.log('📝 Please run the following SQL in your Supabase SQL editor:');
      console.log('');
      console.log('-- Create sequence');
      console.log('CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;');
      console.log('');
      console.log('-- Create function');
      console.log(functionSQL);
      console.log('');
      console.log('-- Grant permissions');
      console.log('GRANT EXECUTE ON FUNCTION create_order_with_invoice(JSONB, JSONB) TO authenticated;');
    } else {
      console.log('Function call result:', { data, error });
    }
    
  } catch (error) {
    console.error('❌ Failed to create function:', error);
    process.exit(1);
  }
}

createFunction();
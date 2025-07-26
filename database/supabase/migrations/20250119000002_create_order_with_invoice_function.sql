-- Create atomic order/invoice database function
-- This function ensures that orders and invoices are created together atomically

-- First, create a sequence for invoice numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;

-- Create the atomic function for order and invoice creation
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
  
  -- Determine payment terms (from invoice_data, customer, or default to 30)
  payment_terms := COALESCE(
    (invoice_data->>'payment_terms')::INTEGER,
    (SELECT payment_terms FROM customers WHERE id = new_order.customer_id),
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

  -- Create financial ledger entry for the invoice
  INSERT INTO financial_ledger (
    transaction_type,
    reference_id,
    reference_type,
    customer_id,
    amount,
    description,
    transaction_date,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'invoice',
    new_invoice.id,
    'invoice',
    new_order.customer_id,
    new_order.total_amount, -- Positive amount for debit (amount owed)
    'Invoice ' || invoice_number || ' for Order ' || new_order.order_number,
    NOW(),
    auth.uid(), -- Current authenticated user
    NOW(),
    NOW()
  );

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_order_with_invoice(JSONB, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION create_order_with_invoice(JSONB, JSONB) IS 
'Atomically creates an order and its corresponding invoice with automatic invoice number generation and financial ledger entry. Ensures data consistency by using database transactions.';
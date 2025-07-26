-- Create atomic production batch creation function
-- This function ensures inventory decrements and production batch creation happen atomically

CREATE OR REPLACE FUNCTION create_production_batch_atomic(
  batch_data JSONB,
  inventory_decrements JSONB[]
) RETURNS JSONB AS $
DECLARE
  new_batch production_batches;
  decrement_item JSONB;
  current_quantity DECIMAL(10,2);
  total_input_cost DECIMAL(10,2) := 0;
  material_cost DECIMAL(10,2);
  batch_input_record batch_inputs;
  result JSONB;
BEGIN
  -- Validate all inventory quantities first (fail fast)
  FOREACH decrement_item IN ARRAY inventory_decrements
  LOOP
    SELECT remaining_quantity INTO current_quantity
    FROM material_intake_log
    WHERE id = (decrement_item->>'material_intake_id')::UUID;
    
    IF current_quantity IS NULL THEN
      RAISE EXCEPTION 'Material intake record not found: %', decrement_item->>'material_intake_id';
    END IF;
    
    IF current_quantity < (decrement_item->>'quantity_used')::DECIMAL THEN
      RAISE EXCEPTION 'Insufficient inventory: material % has % remaining, requested %',
        decrement_item->>'material_intake_id',
        current_quantity,
        decrement_item->>'quantity_used';
    END IF;
  END LOOP;

  -- Calculate total input cost
  FOREACH decrement_item IN ARRAY inventory_decrements
  LOOP
    SELECT cost_per_unit INTO material_cost
    FROM material_intake_log
    WHERE id = (decrement_item->>'material_intake_id')::UUID;
    
    total_input_cost := total_input_cost + (material_cost * (decrement_item->>'quantity_used')::DECIMAL);
  END LOOP;

  -- Create production batch
  INSERT INTO production_batches (
    batch_number,
    production_date,
    output_litres,
    remaining_quantity,
    status,
    quality_grade,
    total_input_cost,
    cost_per_litre,
    yield_percentage,
    notes
  ) VALUES (
    (batch_data->>'batch_number')::TEXT,
    (batch_data->>'production_date')::TIMESTAMP WITH TIME ZONE,
    COALESCE((batch_data->>'output_litres')::DECIMAL, 0),
    COALESCE((batch_data->>'output_litres')::DECIMAL, 0),
    COALESCE((batch_data->>'status')::batch_status, 'active'),
    COALESCE((batch_data->>'quality_grade')::quality_grade, 'A'),
    total_input_cost,
    CASE 
      WHEN COALESCE((batch_data->>'output_litres')::DECIMAL, 0) > 0 
      THEN total_input_cost / (batch_data->>'output_litres')::DECIMAL
      ELSE 0
    END,
    COALESCE((batch_data->>'yield_percentage')::DECIMAL, 0),
    batch_data->>'notes'
  ) RETURNING * INTO new_batch;

  -- Process inventory decrements and create batch inputs
  FOREACH decrement_item IN ARRAY inventory_decrements
  LOOP
    -- Get material cost for batch input record
    SELECT cost_per_unit INTO material_cost
    FROM material_intake_log
    WHERE id = (decrement_item->>'material_intake_id')::UUID;

    -- Decrement inventory quantity
    UPDATE material_intake_log
    SET 
      remaining_quantity = remaining_quantity - (decrement_item->>'quantity_used')::DECIMAL,
      updated_at = NOW()
    WHERE id = (decrement_item->>'material_intake_id')::UUID;
    
    -- Create batch input record
    INSERT INTO batch_inputs (
      batch_id,
      material_intake_id,
      quantity_used
    ) VALUES (
      new_batch.id,
      (decrement_item->>'material_intake_id')::UUID,
      (decrement_item->>'quantity_used')::DECIMAL
    ) RETURNING * INTO batch_input_record;
    
    -- Create audit trail for inventory movement
    INSERT INTO financial_ledger (
      transaction_type,
      reference_id,
      reference_type,
      customer_id,
      amount,
      description,
      transaction_date,
      created_by
    ) VALUES (
      'adjustment',
      new_batch.id,
      'invoice', -- Using existing enum value
      (SELECT c.id FROM customers c LIMIT 1), -- Placeholder customer for internal transactions
      material_cost * (decrement_item->>'quantity_used')::DECIMAL,
      'Inventory used in production batch ' || new_batch.batch_number,
      NOW(),
      COALESCE((batch_data->>'created_by')::UUID, auth.uid())
    );
  END LOOP;

  -- Build result with batch and input details
  SELECT jsonb_build_object(
    'batch', to_jsonb(new_batch),
    'inputs', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', bi.id,
          'material_intake_id', bi.material_intake_id,
          'quantity_used', bi.quantity_used,
          'material_name', rm.name,
          'cost_per_unit', mil.cost_per_unit,
          'total_cost', bi.quantity_used * mil.cost_per_unit
        )
      )
      FROM batch_inputs bi
      JOIN material_intake_log mil ON bi.material_intake_id = mil.id
      JOIN raw_materials rm ON mil.raw_material_id = rm.id
      WHERE bi.batch_id = new_batch.id
    ),
    'total_input_cost', total_input_cost
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- All changes are automatically rolled back on exception
    RAISE EXCEPTION 'Production batch creation failed: %', SQLERRM;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_production_batch_atomic(JSONB, JSONB[]) TO authenticated;

-- Create helper function to validate inventory before batch creation
CREATE OR REPLACE FUNCTION validate_production_batch_inventory(
  inventory_decrements JSONB[]
) RETURNS JSONB AS $
DECLARE
  decrement_item JSONB;
  current_quantity DECIMAL(10,2);
  validation_errors JSONB[] := '{}';
  error_item JSONB;
  result JSONB;
BEGIN
  -- Check each inventory item
  FOREACH decrement_item IN ARRAY inventory_decrements
  LOOP
    SELECT remaining_quantity INTO current_quantity
    FROM material_intake_log
    WHERE id = (decrement_item->>'material_intake_id')::UUID;
    
    IF current_quantity IS NULL THEN
      error_item := jsonb_build_object(
        'material_intake_id', decrement_item->>'material_intake_id',
        'error', 'Material intake record not found',
        'available_quantity', 0
      );
      validation_errors := validation_errors || error_item;
    ELSIF current_quantity < (decrement_item->>'quantity_used')::DECIMAL THEN
      error_item := jsonb_build_object(
        'material_intake_id', decrement_item->>'material_intake_id',
        'error', 'Insufficient inventory',
        'requested_quantity', (decrement_item->>'quantity_used')::DECIMAL,
        'available_quantity', current_quantity
      );
      validation_errors := validation_errors || error_item;
    END IF;
  END LOOP;

  -- Build result
  SELECT jsonb_build_object(
    'is_valid', array_length(validation_errors, 1) IS NULL OR array_length(validation_errors, 1) = 0,
    'errors', to_jsonb(validation_errors)
  ) INTO result;
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_production_batch_inventory(JSONB[]) TO authenticated;

-- Create sequence for batch numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS production_batch_sequence START 1;

-- Create helper function to generate batch numbers
CREATE OR REPLACE FUNCTION generate_batch_number() RETURNS TEXT AS $
BEGIN
  RETURN 'GR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('production_batch_sequence')::TEXT, 3, '0');
END;
$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_batch_number() TO authenticated;
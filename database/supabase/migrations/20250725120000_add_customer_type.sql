-- Add customer_type column to customers table
-- This migration resolves the schema mismatch issue causing "Add Customer" to fail.

BEGIN;

-- Add the column with a default value and a check constraint
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale', 'distributor'));

-- Back-fill any existing rows that might have a NULL value (if column existed before)
UPDATE public.customers
SET customer_type = 'retail'
WHERE customer_type IS NULL;

COMMIT; 